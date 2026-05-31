# 手动验证 Checklist — 2026-05-26 Review 落地

合并范围：`8e237a7..5d62a6a`（30+ commits 覆盖 P0 全部 / P1 全部 / P2 9 条）。
自动化测试已经过：**109 vitest 测试通过**，`tsc -b` / `lint` / `build` 全部干净。

这份清单只列**自动化测试覆盖不到、必须人眼或人手验证**的项。建议在 prod 部署前至少在 staging（或本地 + Firebase emulator）走一遍。

---

## 0. 准备

- [ ] 本地：`cd client && npm install && npm run dev`（或 `npm run build && npm run preview`）
- [ ] 浏览器 DevTools 打开 → Console、Network、Application（Local Storage / IndexedDB）三个面板
- [ ] 准备至少两个测试账号（用户 A、用户 B），用于跨用户清理验证
- [ ] 准备一个有 100+ 张卡的 pack 用于性能验证（cascade delete + global review 分页）
- [ ] 移动端验证：用 DevTools 的 device toolbar 切到 iPhone / Android 视口

---

## 1. 认证 & 跨用户隔离（P0 #3 — LOGOUT_CLEANUP.md）

**最重要、最容易漏。**

- [ ] 用户 A 登录 → DevTools → Application → Local Storage 看到 `card-master.profiles.v1`、`card-master.mastery.presentation.v1.<uid>` 等键
- [ ] 用户 A 登出 → 上述 `card-master.*` 键**全部消失**，但 `card-master.preferences.language` 和 `card-master.preferences.system.v1` **保留**
- [ ] Application → IndexedDB → Firestore 缓存（`firestore/...`）也已清空
- [ ] 用户 B 登录 → 看不到用户 A 的 profile 名 / theme / 任何痕迹
- [ ] 跨标签：两个标签都开同一账号，A 标签登出，B 标签**也清理本地缓存**（`onAuthStateChanged` 兜底）
- [ ] 登出过程中即使 IndexedDB 清理失败（DevTools → Application → 手动 lock 数据库模拟），Firebase signOut 也不阻塞，console 只 warn

---

## 2. AppShell + 侧边栏（P2 #12 PR 1 — APPSHELL_SPLIT.md）

563 行单文件拆成 6 个自治组件，行为应当**零变化**。

### 桌面端

- [ ] 登录后看到侧边栏；点 collapse/expand 切换宽窄
- [ ] 用户菜单（右上头像点击）：
  - [ ] "Switch profile" → 打开切换 profile 对话框
  - [ ] 切换 profile 对话框里点"New profile" → 打开 create-profile 对话框
  - [ ] "Local import" → 打开本地数据导入对话框
  - [ ] "Sign out" → 显示 loading → 登出（中途失败显示 error message）
- [ ] 每日复习进度条显示在侧边栏，进度数字正确（完成一次复习后应当 +1，不需要刷新）
- [ ] 首次登录用户（**无任何 profile**）→ create-profile 对话框**强制弹出且无法关闭**（点 backdrop / Esc 都不行）

### 移动端

- [ ] hamburger 按钮显示 → 点开抽屉
- [ ] 抽屉里点导航链接 → 抽屉**自动关闭**并跳转
- [ ] 抽屉里点 profile 按钮 → 抽屉关闭，弹出用户菜单
- [ ] 旋转屏幕 / 切回桌面宽度 → 抽屉状态正确重置

---

## 3. Card 创建 / 编辑对话框（P2 #12 PR 2 — CARDFORM_REDUCER.md）

整个表单状态机重写，**a11y bug 已修**（之前同页两个对话框 id 撞了），需重点确认。

### 每种 pack type 都验证

- [ ] 普通文本卡：create → 填问答 → 提交 → 出现在列表；edit 已有卡 → 修改 → 保存
- [ ] 图片卡：上传图片 → 预览正确 → 提交保存 → 重新打开看到图片
- [ ] 拼音汉字卡：
  - [ ] 输入汉字 350ms 后**自动**填入拼音
  - [ ] 用户手动改了拼音后，再改汉字，**不会**覆盖手动输入
  - [ ] 答案输入框非空时，**不会**触发自动填
  - [ ] 显式按 "Convert from hanzi" 按钮 → 强制重新生成拼音
- [ ] 任意类型卡：表单出错（如必填空）→ 显示 error → 改任意字段 → error **自动消失**

### a11y / id 唯一性（关键）

- [ ] `pack-cards-page` 上同时**打开创建 + 编辑两个对话框**（理论上不会同时，但 React 渲染瞬间可能并存）→ DevTools → Console 没有 "duplicate id" 警告
- [ ] DevTools → Elements 搜索 `id="card-question"` → 应当出现两个不同的 `:r1:`-like id，**不是**字面 `card-question`

---

## 4. 复习会话（P2 #12 PR 3 — REVIEW_SESSION_FSM.md）

`use-review-session` 改成状态机，外部 API 不变，但内部 transition 路径全新。

### Pack-level review (pack-review-page)

- [ ] 进入复习页 → loading → ready
- [ ] 评分若干张 → 完成一张则推进下一张
- [ ] Skip 按钮 → 跳过当前卡 → 推进到下一张，**totalReviewed 计数不加**
- [ ] 评分时网络断 → 显示 error，可以重试
- [ ] 完成最后一张 → 进入 complete state，显示总结
- [ ] mastery toast 提示出现（如适用）
- [ ] 复习中切换 profile → 应当 reset 或正确处理（看实现 — 至少不应该把 A profile 的数据写到 B profile）

### Global review session (use-global-review-session — P1 #8)

- [ ] 用 **500+ 卡账户**进入全局复习
  - [ ] 首屏加载明显快（之前 3–5s，现在应 < 1s）
  - [ ] DevTools → Network → Firestore 调用 ≤ 100 reads（之前是 1000+）
- [ ] 复习推进正常，到日目标后自动停止

---

## 5. 卡包管理（P1 #4 + #5 + #6）

### 列表 & 状态过滤

- [ ] 主页 dashboard / 包列表正常加载（之前会偶尔卡顿）
- [ ] **已归档的卡不应出现在常规列表中**（active filter 在 Firestore 层生效）
- [ ] DevTools → Network → 看 Firestore 请求带 `status` filter

### 删除 pack（P1 #6 — CASCADE_DELETE.md）

- [ ] 删除一个 100 张卡的 pack
  - [ ] 用时**明显比之前短**（之前 5–10s，现在 < 1s）
  - [ ] UI 不卡死
  - [ ] 关联的 cards / scheduling states / mastery states / review_events 全部删除
- [ ] 删除中刷新页面 → 重新触发删除应当 retry-safe，不报错

---

## 6. 字体加载（P1 #7 — FONT_LAZY.md）

- [ ] 用**未启用 kaiti**的 profile（默认）→ DevTools → Network → `kaiti.*.woff2` **不下载**
- [ ] 用**启用 kaiti 偏好**的 profile（hanzi_font: "kaiti"）+ 不打开任何含 hanzi 的卡 → 仍然不下载 kaiti
- [ ] 打开一张含 hanzi practice grid 的卡 → kaiti 字体此时才下载，渲染先用 fallback，加载完成后 swap
- [ ] 首屏 FCP（用 Lighthouse 或 Performance 面板）应当比之前快几秒（取决于网络）

---

## 7. 导入 / 导出（P0 #1 + P1 + P2 #10/#11）

### 导出

- [ ] 主页用户菜单 → 导出 → 下载 JSON
- [ ] JSON 内容包含 packs / cards / scheduling states / mastery / review events
- [ ] **created_at 等时间戳真实**（之前 rules 允许伪造，现在被锁）

### 导入（P2 #10+#11 — ZOD_VALIDATION.md）

- [ ] 用上面导出的合法文件导入 → 全部恢复
- [ ] **故意编辑 JSON 制造畸形**（删一个必填字段 / 加未知顶层字段）→ 导入应当**清晰报错**指出哪一项错了，而**不是**写入 Firestore
- [ ] 重复导入同一份（基于 fingerprint）→ 跳过提示"已导入"
- [ ] 用户 A 导入后登出 → 用户 B 登录 → 用户 B 第一次导入**不会**被 A 的 fingerprint 误判（P0 #3 已修，再确认一次）

---

## 8. Firestore Rules 加固（P0 #1+#2 — RULES_CHANGES.md）

需要用 Firestore emulator + 测试脚本，或在 staging 用 DevTools 手动尝试。

- [ ] 普通增删改正常工作（这是冒烟）
- [ ] 尝试 update 一条 card，payload 里包含 `created_at: "2099-01-01"` → **被拒绝**
- [ ] 尝试 update 一条 card，payload 里改 `card_pack_id` 指向另一个 pack → **被拒绝**
- [ ] 尝试 create 一条 card，缺 `account_user_id` 或 `profile_id` → **被拒绝**
- [ ] 尝试 create 一条 card，payload 大小 > 100 KB → **被拒绝**
- [ ] 部署日志 / Firebase Console 监控有没有合法写入被新规则误杀（**关键**：观察 48 小时）

---

## 9. CI / 部署（P0 D2 + P2 #13）

### CI workflow

- [ ] 开一个 throwaway PR（改个 README typo 之类的）→ GitHub Actions 自动跑
  - [ ] `lint` job 绿
  - [ ] `typecheck` job 绿
  - [ ] `test` job 绿，显示 109 passed
  - [ ] `build` job 绿
- [ ] 推一个**故意 lint 失败**的 commit → CI 应当**红**且阻塞 merge
- [ ] PR 模板（`.github/PULL_REQUEST_TEMPLATE.md`）自动展开
- [ ] pre-commit hook：本地 `git commit` 触发 `lint-staged` 跑 eslint --fix

### 部署 secrets（P0 D2）

- [ ] 检查 GitHub Actions → Secrets 已配置 6 个 `VITE_FIREBASE_*`
- [ ] 部署到 GitHub Pages 后，打开 prod URL → DevTools → Network → 看 Firebase init 调用成功（不是 `undefined` apiKey）
- [ ] 本地 `.env.production` 已删除 / `.env.local` 是开发用的，**不**进 git

---

## 10. 仓库门面（P0 D1 + D3 + P2 D4–D7）

主要是看而非操作。

- [ ] GitHub repo 首页能看到根 `README.md`（项目简介 + tech stack + 启动方式）
- [ ] `LICENSE` 文件存在（MIT）
- [ ] `CONTRIBUTING.md` 描述 commit convention
- [ ] 开新 PR 时自动展开模板
- [ ] `.codex/` `.opencode/` `.specify/` 在 GitHub 上**不可见**（已 untrack）
- [ ] `docs/` 结构清晰：`architecture/` `research/` `legacy/` `superpowers/` `review/`
- [ ] 根目录不再有散落的 `database.md` / `scheduling.md` / `research_notes/` 等

---

## 11. 性能回归对比（推荐 Lighthouse 跑一次）

| 指标 | Before | After (期望) |
|---|---:|---:|
| 首屏 FCP | ~3–5s（kaiti 阻塞） | < 1.5s |
| 主页 Dashboard 加载 | 全量卡 + 状态 | 收敛 status filter |
| 全局复习首屏 | ~1000 reads | ~80 reads |
| 删 100 卡 pack | 5–10s | < 1s |
| 总包体积 | — | kaiti 移出 critical CSS（仍存在但懒加载） |

---

## 12. 没改的地方但应该**抽检冒烟**（P2 #9 影响面广）

repository migration 删了 9 个文件、移了 5 个文件，UI 都改走新 repo。理论无行为变化，但 grep 替换难免有遗漏：

- [ ] **每个 feature 的主流程都点一遍**：home → pack 详情 → 创建/编辑/删除卡 → pack-level review → global review → settings/profile
- [ ] 任何 Console error / warning 都记下来
- [ ] Network 面板没有 404 / 5xx
- [ ] 任何"读 / 写 / 删"操作都至少手动跑一次确认不抛错

---

## 通过标准

- 全部 ✅ → 可以发 prod
- 任何 ❌ → 该项归到回归 issue，按严重程度决定是回滚还是补丁
- 任何**疑似**问题 → 截图 / 录屏 / Console log 贴到 issue

---

## 相关文档

每个变更的细节在 [implementation/](./implementation/)：

- [LOGOUT_CLEANUP.md](./implementation/LOGOUT_CLEANUP.md)
- [RULES_CHANGES.md](./implementation/RULES_CHANGES.md)
- [HYGIENE_REPORT.md](./implementation/HYGIENE_REPORT.md)
- [FIRESTORE_FILTERS.md](./implementation/FIRESTORE_FILTERS.md)
- [CASCADE_DELETE.md](./implementation/CASCADE_DELETE.md)
- [FONT_LAZY.md](./implementation/FONT_LAZY.md)
- [REVIEW_PAGINATION.md](./implementation/REVIEW_PAGINATION.md)
- [CI.md](./implementation/CI.md)
- [DOCS_REORG.md](./implementation/DOCS_REORG.md)
- [LICENSE_CONTRIBUTING.md](./implementation/LICENSE_CONTRIBUTING.md)
- [ZOD_VALIDATION.md](./implementation/ZOD_VALIDATION.md)
- [REPOSITORY_MIGRATION.md](./implementation/REPOSITORY_MIGRATION.md)
- [APPSHELL_SPLIT.md](./implementation/APPSHELL_SPLIT.md)
- [CARDFORM_REDUCER.md](./implementation/CARDFORM_REDUCER.md)
- [REVIEW_SESSION_FSM.md](./implementation/REVIEW_SESSION_FSM.md)
