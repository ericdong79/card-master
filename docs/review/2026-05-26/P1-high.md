# P1 — High（性能与正确性热点）

可观察到的卡顿、明显费钱的 Firestore 操作、阻塞用户的 UX 问题。

---

## #4 Cards 查询缺 `status` 过滤 → 全 collection 扫描

**文件:** `client/src/lib/data/repositories/card-repository.ts:124-143`

**问题:** `loadProfileCards` 不带 `status` 过滤，加载 profile 下**所有**卡（含 archived）。`firestore.indexes.json` 的 cards 复合索引也没有 status 字段，命中后还要应用层 filter。归档卡多的账户首屏 Dashboard 会非常慢且费钱。

**Action:**

- 查询加 `where("status", "==", "active")`；
- 在 `firestore.indexes.json` 把 cards 索引升级为 `(account_user_id, profile_id, status, created_at)`。

---

## #5 调度状态全量加载，未按 `status` / `due_at` 过滤

**文件:** `client/src/lib/data/repositories/scheduling-repository.ts:147-165` (`listSchedulingStatesForProfile`)

**问题:** 计算 daily-goal、due-count 时，所有 scheduling state（含历史 suspended/completed）都 fetch 回来再内存过滤。每天打开首页都付一次费。

**Action:**

- 加 `where("status", "==", "active")` + `where("due_at", "<=", Timestamp.now())`；
- 为 due 卡片新建专用复合索引。

---

## #6 卡包级联删除 N+3 串行查询

**文件:** `client/src/lib/data/repositories/card-pack-repository.ts:192-243` (`productionReviewDataDeleteOperations`)

**问题:** 删一个 100 张卡的包，要分块串行做 3 次（mastery / scheduling / review_event）查询拿待删 ID 再 batch 删，30+ RTT，UI 阻塞 5–10s。

**Action:**

- 三个相关 collection 用 `Promise.all` 并行查；
- 写删除走单一 `writeBatch`（注意 500 ops/batch 限制，超量分批）；
- 长期方案考虑放 Cloud Function 触发器自动级联。

---

## #7 巨型字体文件随首屏同步加载

**文件:** `client/src/index.css` + `client/src/assets/fonts/`

**问题:** `kaiti.woff2` ~6.7 MB 当作 critical resource 加载。非中文用户 / 不复习汉字的用户也付这笔流量。

**Action:**

- 改成按需 `new FontFace(...).load()` 在 pinyin/汉字卡渲染前触发；
- 或 `font-display: optional` + `<link rel="preload" as="font">` 只在需要的路由插入。

---

## #8 Global Review Session 无分页加载所有卡 + 所有调度状态

**文件:** `client/src/features/review/hooks/use-global-review-session.ts:107-140`

**问题:** 进入全局复习时 fetch 全部 active 卡和它们的 scheduling state。500 张卡的账户首次进入 3–5s。

**Action:**

- 先按 `due_at <= now` + `orderBy(due_at).limit(dailyGoal*2)` 拉一批；
- 不够再翻页。复习引擎只需要候选窗口，没必要全量。
