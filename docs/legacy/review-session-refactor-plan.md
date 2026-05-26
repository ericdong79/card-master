# Review Session 重构设计文档

## 一、当前问题分析

### 1.1 架构问题

当前 `use-review-session.ts` 存在的问题：

1. **逻辑与 React 深度耦合**：所有 review 逻辑都在 hook 里，难以测试和复用
2. **状态管理混乱**：`queue` 只是一个 `Card[]`，丢失了学习状态信息
3. **副作用混杂**：数据持久化（IndexedDB）与业务逻辑混在一起

### 1.2 行为问题

**当前错误行为**（line 151）：
```typescript
setQueue(buildQueue(cards, Array.from(updatedStates.values())));
```

- 每次评分后，简单地将卡片按 `due_at` 排序
- 如果一张卡片在学习阶段点了 "Again"，它会排到队列末尾
- **结果**：本次 session 中不会再见到这张卡片，学习被打断

**预期正确行为**（参考 Anki/RemNote）：

1. **Learning/Relearning 卡片**：在同一次 session 中会反复出现，直到通过所有学习步骤
2. **Review 卡片**：按间隔正常排序，一次通过
3. **卡片毕业**：只有当卡片从 learning/relearning 阶段进入 review 阶段，或完成 review，才算"完成"本次 session

## 二、参考：Anki 的复习队列模型

### 2.1 队列分类

Anki 将待复习卡片分为三类：

| 队列 | 说明 | 排序依据 |
|------|------|----------|
| **New** | 从未学过的卡片 | 创建时间 |
| **Learning** | 正在学习阶段的卡片 | 下一个学习步骤时间（通常几分钟到几天） |
| **Review** | 正常复习阶段的卡片 | 到期时间 |
| **Relearning** | 从 review 遗忘回到学习阶段的卡片 | 下一个学习步骤时间 |

### 2.2 队列优先级

在同一 session 中，处理顺序：

1. **Learning/Relearning**（最高优先级）：必须短时间内反复出现
2. **Review**：按到期时间处理
3. **New**（最低优先级）：当天配额内的新卡片

### 2.3 Learning 卡片的行为

假设 learningSteps = ["1m", "10m"]（1分钟，10分钟）：

| 操作 | 当前步骤 | 结果 |
|------|----------|------|
| Again | Step 0 | 重置到 Step 0，1分钟后再次出现 |
| Hard | Step 0 | 保持在 Step 0，1分钟后再次出现 |
| Good | Step 0 | 进入 Step 1，10分钟后再次出现 |
| Good | Step 1 | 毕业到 Review，今天不再出现 |
| Easy | Any | 跳过剩余步骤，直接毕业到 Review |

**关键**：Learning 卡片在同一次 session 中会反复出现，直到"毕业"到 Review 阶段。

### 2.4 Relearning 卡片的行为

与 Learning 类似，但毕业后的间隔基于 `pendingIntervalDays` 计算。

## 三、新架构设计

### 3.1 分层架构

```
┌─────────────────────────────────────┐
│  React Hook (useReviewSession)      │  ← 只负责 UI 状态和副作用
│  - 管理 loading/error               │
│  - 调用 ReviewSession API           │
│  - 触发数据持久化                   │
├─────────────────────────────────────┤
│  ReviewSession (纯 TS Class)        │  ← 核心业务逻辑，可测试
│  - 管理队列状态                     │
│  - 处理评分逻辑                     │
│  - 计算下次显示时间                 │
├─────────────────────────────────────┤
│  Scheduling Algorithm (SM-2/FSRS)   │  ← 算法逻辑，已有实现
│  - 计算 nextState 和 dueAt          │
└─────────────────────────────────────┘
```

### 3.2 ReviewSession 核心设计

```typescript
// 队列中的条目，包含显示状态
interface QueueItem {
  card: Card;
  state: CardSchedulingState | null;  // null = 新卡片
  phase: 'new' | 'learning' | 'review' | 'relearning';
  scheduledAt: Date;  // 下次显示时间
  isBuried: boolean;  // 是否被 bury（相关卡片延后）
}

// Review Session 状态
interface ReviewSessionState {
  items: QueueItem[];           // 所有待复习的卡片
  currentIndex: number;         // 当前显示的卡片索引
  completedIds: Set<string>;    // 已完成（毕业）的卡片 ID
  newCardsSeen: number;         // 本次已见新卡片数
  newCardsLimit: number;        // 新卡片每日限额
}

class ReviewSession {
  // 初始化：加载卡片和调度状态，构建队列
  static initialize(cards: Card[], states: CardSchedulingState[]): ReviewSession;
  
  // 获取当前要显示的卡片
  getCurrentCard(): Card | null;
  
  // 提交评分，返回需要持久化的数据
  submitGrade(grade: ReviewGrade): {
    reviewEvent: ReviewEventInsert;
    schedulingState: CardSchedulingStateInsert;
    isCardCompleted: boolean;  // 是否毕业/完成
  };
  
  // 移动到下一个卡片
  moveToNext(): void;
  
  // 是否完成本次 session
  isComplete(): boolean;
  
  // 获取统计信息
  getStats(): {
    total: number;
    completed: number;
    remaining: number;
    byGrade: Record<ReviewGrade, number>;
  };
}
```

### 3.3 队列排序算法

```typescript
function sortQueue(items: QueueItem[]): QueueItem[] {
  return items.sort((a, b) => {
    // 1. 已完成的排到最后
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    
    // 2. Learning/Relearning 优先于 Review，Review 优先于 New
    const phasePriority = { learning: 0, relearning: 0, review: 1, new: 2 };
    if (phasePriority[a.phase] !== phasePriority[b.phase]) {
      return phasePriority[a.phase] - phasePriority[b.phase];
    }
    
    // 3. 同类型按 scheduledAt 排序
    return a.scheduledAt.getTime() - b.scheduledAt.getTime();
  });
}
```

### 3.4 评分后的队列更新

```typescript
function updateQueueAfterGrade(
  item: QueueItem,
  result: SchedulingResult<Sm2State>
): QueueItem {
  const nextState = result.nextState;
  const dueAt = result.dueAt;
  
  // 更新条目状态
  const updatedItem: QueueItem = {
    ...item,
    state: { ...item.state, state: nextState, due_at: dueAt.toISOString() },
    phase: nextState.phase,
    scheduledAt: dueAt,
  };
  
  // 判断卡片是否"完成"本次 session
  // 条件：从 learning/relearning 毕业到 review，或完成 review
  const isCompleted = 
    (item.phase === 'learning' && nextState.phase === 'review') ||
    (item.phase === 'relearning' && nextState.phase === 'review') ||
    (item.phase === 'review');
  
  if (isCompleted) {
    updatedItem.isCompleted = true;
  }
  
  return updatedItem;
}
```

## 四、关键行为示例

### 4.1 新卡片学习流程

```
初始状态：新卡片 A，learningSteps = ["1m", "10m"]

第1次见到 A：
  → 用户点 Good
  → 进入 Step 1，scheduledAt = now + 10m
  → 卡片移到队列末尾（但还在同一次 session）

... 其他卡片 ...

第2次见到 A（10分钟后）：
  → 用户点 Good
  → 毕业到 Review 阶段
  → 卡片标记为 completed
  → 今天不再见到 A
```

### 4.2 遗忘后重新学习

```
初始状态：卡片 B 在 Review 阶段，relearningSteps = ["10m"]

第1次见到 B：
  → 用户点 Again
  → 进入 Relearning 阶段 Step 0
  → scheduledAt = now + 10m
  → 卡片移到队列末尾

... 其他卡片 ...

第2次见到 B（10分钟后）：
  → 用户点 Good
  → 毕业回 Review 阶段
  → 卡片标记为 completed
```

## 五、实现计划

### Phase 1: 创建 ReviewSession 核心类
1. 创建 `client/src/lib/review/review-session.ts`
2. 实现队列构建、排序、更新逻辑
3. 编写单元测试

### Phase 2: 重构 Hook
1. 修改 `use-review-session.ts`，使用新的 ReviewSession 类
2. 保持 UI 状态管理（loading/error）
3. 分离数据持久化逻辑

### Phase 3: 优化 UI
1. 显示队列状态（当前步骤/总步骤）
2. 显示预计下次见到时间
3. 添加"提前结束 session"功能

## 六、接口定义

```typescript
// client/src/lib/review/types.ts

export type QueuePhase = 'new' | 'learning' | 'review' | 'relearning';

export interface QueueItem {
  card: Card;
  schedulingState: CardSchedulingState | null;
  phase: QueuePhase;
  scheduledAt: Date;
  isCompleted: boolean;
}

export interface ReviewResult {
  reviewEvent: ReviewEventInsert;
  schedulingState: CardSchedulingStateInsert;
  isCardCompleted: boolean;
  nextDueAt: Date;
}

export interface SessionStats {
  totalCards: number;
  completedCards: number;
  remainingCards: number;
  learningCards: number;
  reviewCards: number;
  newCards: number;
}

// client/src/lib/review/review-session.ts

export class ReviewSession {
  constructor(
    private items: QueueItem[],
    private params: Sm2Parameters,
    private newCardsLimit: number
  );
  
  static create(
    cards: Card[],
    states: CardSchedulingState[],
    params: Sm2Parameters,
    options?: { newCardsLimit?: number }
  ): ReviewSession;
  
  getCurrentItem(): QueueItem | null;
  getCurrentCard(): Card | null;
  submitGrade(grade: ReviewGrade): ReviewResult;
  moveToNext(): void;
  isComplete(): boolean;
  getStats(): SessionStats;
  getQueueSnapshot(): QueueItem[];
}
```

---

**参考文档**：
- [Anki Manual - Studying](https://docs.ankiweb.net/studying.html)
- [Anki Algorithm](https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html)
- RemNote 帮助文档中的 Spaced Repetition 章节
