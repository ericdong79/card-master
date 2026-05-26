# P0 — 必须立刻修

可被利用的安全洞、正在烧钱的配置、阻碍贡献的法律/接入问题。**本周本次处理。**

---

## #1 Firestore Rules 缺少字段不可变性约束

**文件:** `client/firestore.rules`

**问题:** 规则只检查 `account_user_id` 归属（且 `ownsIncomingAccount()` 已阻止把所有权写给他人，✅），但**没约束其他字段的 schema 和不可变性**。已登录用户可以：

- 任意改 `created_at` / `updated_at` / `card_pack_id` / `profile_id` / `learner_profile_id` 等本应只在创建时写入的字段；
- 把自己的 card 挂到自己捏造的 `card_pack_id` / `profile_id` 上，造成 orphan 数据；
- 写入任意未知字段污染文档（脏数据破坏 SM-2、导出 round-trip 走样）。

**攻击场景:** 用户改 `created_at` 到 2099 年绕过基于创建时间的复习筛选；或写一个不存在的 `card_pack_id`，让 card 永远孤儿在 UI 上消失但占配额。

**Action:**

- 所有 update 规则加 `request.resource.data.X == resource.data.X`（X = account_user_id, profile_id, card_pack_id, created_at 等）；
- 用 `hasOnly([...])` 限制允许字段集合；
- 给 create 也加 schema 校验（必填字段存在、类型对、外键不为空字符串）。

---

## #2 Firestore Rules 无文档大小上限 → 配额 DoS

**文件:** `client/firestore.rules`

**问题:** 任何登录用户可以写入接近 Firestore 单文档 1 MB 上限的卡片（比如 `question_content` 塞 base64 图），消耗配额、让客户端加载时卡死。

**攻击场景:** 用户给自己的 card 写 800KB base64 image，正常用户不会，但恶意账号或被劫持账号可以快速烧光配额。

**Action:**

- 在 rules 里加 `request.resource.size() < 100_000`（每文档 < 100 KB，按业务调整）；
- 对 image / data url 字段加 `size(...)` 校验上限；
- 客户端 import / form 提交路径同步加上限校验，提前在 UI 报错。

---

## #3 登出未清理 localStorage / IndexedDB → 共用设备跨用户泄漏

**文件:**

- `client/src/lib/firebase/auth.ts:47` — `signOutOfFirebase`
- `client/src/features/profile/local-profile-store.ts` — `PROFILE_STORAGE_KEY`
- `client/src/features/mastery/presentation/theme-storage.ts`
- `client/src/features/import/local-data-import.ts:232` — import completion marker

**问题:** `signOut()` 只清 Firebase auth 状态，本地缓存（profile 列表、当前 profile_id、mastery theme、import fingerprint）全部保留。

**攻击场景:**

- 共用浏览器（家庭 / 办公）的下一个用户从 DevTools 读出上一个用户的 profile 名、profile_id、import 指纹；
- import fingerprint 撞车时，新用户的导入逻辑误判"已导入"被跳过。

**Action:**

- 在 `signOutOfFirebase` 里调用 `localStorage.clear()`（或精确清掉所有 `card-master.*` 前缀键）；
- 同时调用 Firebase 的 `clearIndexedDbPersistence(db)`；
- 在 `onAuthStateChanged` 切到新用户时做兜底清理。

---

## D1 根目录无 README，零接入信息

**文件:** repo 根 + `client/README.md`

**问题:** 仓库根目录**没有 README**，`client/README.md` 是 Vite 默认 68 行模板。打开 GitHub 主页看不出这是什么项目、怎么跑、技术栈、部署方式。

**Action:**

1. 新建根 `README.md`：项目简介（SRS 卡片应用）、技术栈（React 19 + Firebase）、本地启动命令、部署链接、文档索引；
2. 改写 `client/README.md`：真实的 client 开发说明（脚本、Firebase emulator、Storybook、目录结构）。

---

## D2 `client/.env.production` 被提交到 git

**文件:** `client/.env.production`，`.gitignore`

**问题:** `.gitignore` 第 13 行只忽略 `*.local`，没忽略 `*.production`，所以 production 的 Firebase config 进了 git。

- ✅ Firebase Web config 设计上就是公开的（前端 JS 里也会有），现在的内容没真泄漏；
- ❌ 但开了坏先例：以后有人往 `.env.production` 加真正敏感的 key（Stripe secret、自定义 token），就直接进 git history。

**Action:**

1. `.gitignore` 加 `.env*` 通配 + `!.env.example` 例外；
2. `git rm --cached client/.env.production`（保留本地文件，不再追踪）；
3. 改名 / 复制成 `client/.env.example`，内容脱敏（值改占位符）；
4. README 加一句"复制 `.env.example` 到 `.env.local` 并填值"；
5. 同时把 production 配置改成在 [.github/workflows/deploy-pages.yml](../../../.github/workflows/deploy-pages.yml) 里通过 secrets 注入。

---

## D3 个人 agent 工具配置被提交（不属于这个项目）

**文件:** `.codex/`, `.opencode/`, `.specify/` — 共 14 个文件 tracked

**问题:** 这些是个人的 Codex / OpenCode / Spec-Kit 工具配置，跟项目本身无关，但进了 git，污染历史，让其他贡献者看着困惑。

`.kilocode/` 已经在 gitignore（✅），但已 tracked 的还在 repo 里。

**Action:**

```bash
git rm -r .codex .opencode .specify
printf '\n.codex/\n.opencode/\n.specify/\n.claude/\n' >> .gitignore
```

团队级 agent 规则放 `AGENTS.md`（已有 ✅）即可。
