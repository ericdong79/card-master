# P3 — Low（打磨项）

不紧急，体验/成本/卫生层面的改进。

---

## #15 i18n locale 全部打进首包

**文件:** `client/src/i18n.ts:4-5`

**问题:** `en.json` + `zh-CN.json` 都 import 进 bundle，~15–20 KB gzipped 浪费。

**Action:** `i18next-http-backend` 或动态 import 按 `navigator.language` 选择。

---

## #16 大列表无虚拟化

**文件:** `client/src/features/cards/components/card-list.tsx:53-66`

**Action:** 引入 `@tanstack/react-virtual`，200+ 卡的包滚动更顺。

---

## #17 Dashboard 计算结果未缓存

**文件:** `client/src/lib/data/repositories/dashboard-repository.ts:82-98`

**Action:** 用项目已有的 `getCachedQuery` / `setCachedQuery` 给 dashboard 加 30–60 s TTL。

---

## #18 测试覆盖严重失衡

**现状:** 19 测试文件 / 174 源文件 ≈ 11%。SM-2 / repositories 部分覆盖，hooks 几乎为零，组件只有 Storybook。

**Action:** 优先补 profile-context、review hook、auth flow 单测；组件 Storybook 即可，但 hook 必须有单测。

---

## D8 `client/README.md` 是 Vite 默认模板没改

**Action:** 改成实际 client 开发说明（脚本目录、Firebase emulator、Storybook、目录结构、各 feature 职责）。

---

## D9–D12 仓库卫生

- **D9** `.github/` 缺 CI workflow → 见 P2 #13；
- **D10** 本地 `client/dist/` (9 MB) 没清 → 加 `npm run clean` 脚本；
- **D11** `.DS_Store` 散落本地 → 全局清 + 设 `defaults write com.apple.desktopservices DSDontWriteNetworkStores true`；
- **D12** `client/debug-storybook.log` (20 KB) 6 个月没动 → 删。
