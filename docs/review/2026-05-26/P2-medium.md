# P2 — Medium（架构 / 类型安全 / 工程化 / 文档结构）

不立刻爆，但长期会变成开发摩擦或静默数据损坏的源头。

---

## #9 Repository 迁移半成品，DAL 层职责混乱

**文件:** `client/src/lib/api/` vs `client/src/lib/data/repositories/`

**问题:** 老的 `lib/api/*` 还在直接 import `firebase/firestore` 原语（`card-mastery-state.ts:2`、`scheduling-state.ts:2`、`firestore-client.ts`），新功能不知道该用哪层。缓存失效逻辑双份散落。

**Action:**

- 列一份 migration checklist（每个 `lib/api/*` 模块谁还在用 → 替换为 repository → 删除）；
- ESLint 加 `no-restricted-imports` 规则禁止 `lib/api/` 之外直接 import `firebase/firestore`。

---

## #10 SM-2 参数 / 调度 state 反序列化无运行时校验

**文件:**

- `client/src/features/review/hooks/review-session-loader.ts:44` — `schedulingProfile.parameters as Partial<Sm2Parameters>`
- `client/src/lib/api/scheduling-state.ts:156-162` — `updateSchedulingState` 没像 `updateMasteryState` 那样调 normalize
- entities: `parameters / state / raw_payload: Record<string, unknown>`

**问题:** Firestore 数据形状错（脏数据、旧版本、被规则漏洞改坏的字段）→ TS cast 蒙混 → SM-2 算出错误间隔，用户根本看不出来。

**Action:** 引入 [Zod](https://zod.dev) 或 [Valibot](https://valibot.dev)，在所有 Firestore → entity 边界做 `parse()`；`updateSchedulingState` 强制走 `normalizeSchedulingState`。

---

## #11 导入 payload 无 schema 校验

**文件:** `client/src/lib/data/repositories/import-export-repository.ts:107-129` (`assertPayload`)

**问题:** 只检顶层 `format/version/数组存在`，逐 item 字段不校验，畸形 JSON 直接落 Firestore。

**Action:** Zod schema 描述 export 格式，`payload.cards.forEach(CardSchema.parse)`；未知字段 strict reject。

---

## #12 巨型组件 / hook，状态散落

**文件:**

- `client/src/components/app-shell.tsx` — 548 行，13 个 useState，6 个 modal 都挤在一起
- `client/src/features/cards/components/card-form-dialog.tsx` — 389 行，第 1 行 `biome-ignore-all useUniqueElementIds` **没解释**
- `client/src/features/review/hooks/use-review-session.ts:85-103` — 13 个独立 useState，loading/error 可同时为真

**Action:**

- AppShell：把每个 modal 抽成自治组件（自己管开关 state），AppShell 只渲染 outlet 和导航；
- CardFormDialog：要么修 a11y 去掉 ignore，要么把"为什么忽略"写清楚；表单状态用 `useReducer` 或 react-hook-form；
- use-review-session：合并为单 `useReducer`，状态机化（idle / loading / ready / grading / error）。

---

## #13 CI 没跑 lint / typecheck / test

**文件:** `.github/`, `client/eslint.config.js`, `client/package.json`

**问题:** 现有 `.github/workflows/deploy-pages.yml` 只 build。ESLint 是 baseline，没有 pre-commit hook，没有 Husky。

**Action:**

- 新增 `.github/workflows/ci.yml`：`npm ci && npm run lint && tsc --noEmit && npm test && npm run build`；
- 加 Husky + lint-staged 在提交前跑 eslint + prettier；
- ESLint 启用 `@typescript-eslint/no-explicit-any`、`consistent-type-imports`、`no-restricted-imports`（见 #9）。

---

## #14 字段命名跨集合不一致 (`profile_id` vs `learner_profile_id`)

**文件:** `client/firestore.indexes.json` line 64 vs 74，对应 DTO

**问题:** `card_scheduling_states` 用 `learner_profile_id`，其他全用 `profile_id`，写约束时极易拿错助手函数（`ownershipConstraints` vs `learnerOwnershipConstraints`），错了静默返回空。

**Action:** 写 ADR 决定一个名字（建议都用 `profile_id`），写迁移脚本统一存量数据，删除分叉的 helper。

---

## D4 根目录散落 9 个 .md/.txt/.sql，时间线断层

**文件:** repo 根

| 文件 | 修改时间 | 建议 |
|---|---|---|
| `AGENTS.md` | 2026-05-25 | ✅ 留根 |
| `database.md` | 2026-05-25 | 移到 `docs/architecture/` |
| `database-schema.sql` | 2026-05-25 | PostgreSQL 残留？确认后移 `docs/legacy/` 或删 |
| `scheduling.md` | 2025-12-28 | 移到 `docs/architecture/` |
| `scheduling-state-schema.md` | 2025-12-28 | 移到 `docs/architecture/` |
| `review-session-refactor-plan.md` | 2026-02-08 | 已完成 → 归档 `docs/legacy/` |
| `research_plan.md` | 2026-02-08 | 移到 `docs/research/` |
| `anki-like-memory-learning-system-sources.md` | 2026-02-08 | 移到 `docs/research/` |
| `llm.txt` | 2026-02-08 | 没引用就删 |

**Action:** 重组为 `docs/{architecture,research,superpowers,legacy}/`。

---

## D5 `research_notes/` 200KB 研究资料挂在根

**文件:** `research_notes/`

**Action:** 挪到 `docs/research/`，并在 `docs/README.md` 标注"历史调研材料，不一定反映当前实现"。

---

## D6 `database.md` 保留 `owner_user_id` 兼容字段说明缺迁移计划

**文件:** `database.md`

**Action:** 在文档加 "Deprecation Plan" 段：哪些 collection 还在写 `owner_user_id`、目标删除版本、迁移脚本位置。

---

## D7 缺 LICENSE / CONTRIBUTING / CODE_OF_CONDUCT

**Action:**

- `LICENSE`：选个明确的（MIT / Apache-2.0）；
- `CONTRIBUTING.md`：commit message 规范（项目已经在用 conventional commits）、PR 流程、本地跑测试方式；
- `.github/PULL_REQUEST_TEMPLATE.md`：摘要 + 测试计划 + UI 截图要求。
