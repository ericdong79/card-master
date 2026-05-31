# 项目 Review — 2026-05-26

全项目审计结果，覆盖**安全 / 性能 / 设计 / 文档 / 仓库卫生**五个维度。

由三路并行 sub-agent 审计 + 主 agent 人工核对去重后产出。

## 索引

| 文件 | 内容 | 状态 |
|---|---|---|
| [P0-critical.md](./P0-critical.md) | 必须立刻修：可被利用 / 烧钱 / 法律或贡献门槛 | ✅ **全部完成** (6/6) |
| [P1-high.md](./P1-high.md) | 性能与架构热点 | ✅ **全部完成** (5/5) |
| [P2-medium.md](./P2-medium.md) | 类型安全 / 工程化 / 文档结构 | 🟡 **部分完成** (9/10)，剩 #14 |
| [P3-low.md](./P3-low.md) | 打磨项 | ⬜ 未开始 (0/6) |
| [implementation/](./implementation/) | 各任务实现报告与决策记录 | — |
| [MANUAL_VERIFICATION.md](./MANUAL_VERIFICATION.md) | 上线前手动验证清单（汇总全部 PR 的 UI / 行为检查项） | 待执行 |

## 已完成（main 已合并并 push）

### P0（6/6 ✅）

| ID | Commit | 任务 |
|---|---|---|
| #1+#2 | `d332f04` 之前 | Firestore Rules 字段不可变性 + 100 KiB 大小上限 |
| #3 | `d11a7ec` | 登出清 localStorage + IndexedDB（保留 device-level 偏好） |
| D1 | (含 D2/D3 一起) | 根 README + 重写 client/README |
| D2 | 同上 | untrack `.env.production`，GH Secrets 注入 |
| D3 | 同上 | untrack `.codex/.opencode/.specify/` 个人 agent 配置 |

### P1（5/5 ✅）

| ID | Commit | 任务 |
|---|---|---|
| #4+#5 | `d332f04` | cards 加 status 过滤 + 新增 `listDueSchedulingStatesForProfile` helper + 复合索引 |
| #6 | `95d8cc1` | pack 级联删除并行化（100 卡：~10 RTT → ~1 RTT） |
| #7 | `dc0d6a0` | kaiti.woff2 (6.7 MB) 按需加载，移出关键路径 |
| #8 | `c086827` | global review 分页（500 卡账户 ~1000 reads → ~80） |

### P2（9/10 🟡）

| ID | Commit | 任务 |
|---|---|---|
| #9 | `c537084..93b5079` (7 commits) | Repository pattern 迁移：删 7 个废弃 `lib/api/*` 模块，UI 改走 repositories，foundation 模块挪进 `lib/data/`，加 ESLint `no-restricted-imports` 守卫 |
| #10+#11 | `811c422` | Zod schemas 在 SM-2 / scheduling-state / import 边界校验 |
| #12 | 3 merge commits | 巨型组件 / hook 拆分：AppShell 563→163 行 + 6 自治组件；CardFormDialog → useReducer + useId 修 a11y；use-review-session 9 useState → 状态机 reducer + 19 新单测 |
| #13 | `c05af7c` | CI workflow (lint/tsc/test/build) + Husky pre-commit |
| D4+D5+D6 | `f78fb3f` | 文档重组到 `docs/{architecture,research,legacy}/` + owner_user_id 弃用计划 |
| D7 | `e9fe8c0` | MIT LICENSE + CONTRIBUTING + PR template |

---

## 待办 Backlog（建议各自单独 session）

每条都包含足够上下文，新 session 冷启动即可直接做。

### 🟡 P2 #14 — 字段命名跨集合统一

**问题:** `card_scheduling_states` 用 `learner_profile_id`，其他全用 `profile_id`。写约束时容易拿错 helper（`ownershipConstraints` vs `learnerOwnershipConstraints`），错了静默返回空。

**推荐做法:**
1. 写一份 ADR 在 `docs/architecture/adr-001-profile-id-naming.md` 决定统一名字（建议 `profile_id`）
2. 写迁移脚本 `client/scripts/migrate-learner-profile-id.mjs`：
   - 用 Firebase Admin SDK 或 `firebase-tools` 读所有 `card_scheduling_states`
   - 把 `learner_profile_id` 复制到新字段 `profile_id`
   - 保留 `learner_profile_id` 一个发布周期（双写），便于回滚
3. 改代码：所有 `learnerOwnershipConstraints` → `profileOwnershipConstraints`，删 helper
4. 更新 firestore.indexes.json：把 `learner_profile_id` 索引重建到 `profile_id`
5. 下一个发布周期再删 `learner_profile_id` 字段

**注意:** 这是 prod 数据迁移，要小心：
- 先在 staging 跑
- 部署新代码时双写（保留旧字段写入）
- 监控一段时间无 schema 异常后才真正删除旧字段
- Firestore 索引切换要分两次部署（先加新索引，等构建完，再删旧索引）

**估时:** 1-2 天，含 staging 验证。

---

### 🟢 P3 全部（6 条）

详见 [P3-low.md](./P3-low.md)。简列：

| ID | 任务 | 估时 |
|---|---|---|
| #15 | i18n locale 动态 import | 1h |
| #16 | 大列表用 `@tanstack/react-virtual` 虚拟化 | 半天 |
| #17 | Dashboard 计算结果加 TTL 缓存（用项目已有的 query-cache） | 1h |
| #18 | 补 hook / context / auth flow 单测 | 持续 |
| D8 | client/README 进一步完善（实际重写工作 P0 已经做） | — 已完成 |
| D9-D12 | 仓库卫生（CI 已建好 ✅、build artifact 清理脚本、`.DS_Store` 清理） | 30 min |

---

### 📌 实现过程中浮现的额外 Follow-ups

| 来源 | 任务 |
|---|---|
| P1 #7 报告 | `xst.woff2` (451 KB CardMasterPixel) 同样可懒加载 |
| P1 #6 报告 | `FIRESTORE_IN_FILTER_LIMIT = 10` 可升到 30（影响 6 个文件，单独做） |
| P0 #1 RULES_CHANGES.md | rules 加 `hasOnly` allow-list（当前太多 optional 字段不敢加） |
| P0 #1 RULES_CHANGES.md | `review_events` 更新禁用（domain 说 immutable，确认无客户端写路径后 `if false`） |
| P2 #13 CI.md | 启用更严 ESLint 规则：`no-explicit-any`, `consistent-type-imports`（`no-restricted-imports` 已在 P2 #9 落地） |
| P2 #10 ZOD_VALIDATION.md | `card_scheduling_state.state` 改成按 algorithm 的 discriminated union |
| P2 #9 REPOSITORY_MIGRATION.md | `lib/api/import-export.ts` shim 还在（仅用于其 393 行 in-memory 测试），需先把测试迁到 Firestore mock harness 再删 |
| P2 #9 REPOSITORY_MIGRATION.md | `lib/data/firestore/firestore-client.ts` 与 `firestore-store.ts` 功能重叠，需 dedupe |

---

## 编号约定

- `#N` — 代码相关 finding（安全/性能/设计）
- `DN` — 文档与仓库卫生 finding

## Implementation 记录

每个完成任务的 sub-agent 报告在 [implementation/](./implementation/)：

- `RULES_CHANGES.md` — Firestore rules 加固
- `LOGOUT_CLEANUP.md` — 登出清缓存
- `HYGIENE_REPORT.md` — 仓库门面清理 + GH Secrets follow-up
- `FIRESTORE_FILTERS.md` — cards / scheduling 查询过滤 + 索引
- `CASCADE_DELETE.md` — pack 删除并行化
- `FONT_LAZY.md` — kaiti 按需加载
- `REVIEW_PAGINATION.md` — global review 分页
- `CI.md` — CI workflow + Husky
- `DOCS_REORG.md` — 文档重组
- `LICENSE_CONTRIBUTING.md` — 法律 / 贡献文档
- `ZOD_VALIDATION.md` — Zod 边界校验
- `REPOSITORY_MIGRATION.md` — P2 #9 6 阶段 repo 迁移记录
- `APPSHELL_SPLIT.md` — P2 #12 PR 1: AppShell 563→163 行拆分
- `CARDFORM_REDUCER.md` — P2 #12 PR 2: card-form-dialog useReducer + useId
- `REVIEW_SESSION_FSM.md` — P2 #12 PR 3: use-review-session 状态机化
