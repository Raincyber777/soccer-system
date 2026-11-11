# 首页与用户端 P0 优化规格（含视觉与实现细节）

## 1. 目标与边界

把门户首页从「品牌介绍页」改为「赛事数据门户」，把用户工作台从静态演示改为真实数据，并打通「找赛事 → 资格自查 → 报名 → 查看审核进度」主线。

本轮只改以下 6 个文件：

- `src/components/HomePage.vue`
- `src/components/AuthPage.vue`
- `src/user/pages/UserDashboard.vue`
- `src/user/pages/TournamentList.vue`
- `src/user/pages/RegistrationForm.vue`
- `src/user/pages/MyRegistrations.vue`

不改管理端、校级端、精彩瞬间、接口契约与 mock 数据。

## 2. 用户场景

1. 游客打开首页：5 秒内看到正在进行的比赛、还能报名的赛事、最新战报、榜单与现场图集；点「赛事报名」先去登录，登录后回到赛事列表。
2. 球队负责人登录后：工作台直接告诉他球队是否完善、报名是否被驳回、最近比赛数据；点待办直达处理页面。
3. 负责人在赛事列表看到截止倒计时、报名条件和「已报名」标识，避免重复报名。
4. 负责人进入报名表单前看到资格清单；提交后看到「待初审 → 省级终审 → 通过」状态时间线，而不是被直接跳走。
5. 负责人在「我的报名」看到同样的状态时间线，被驳回时能看到原因并重提。

## 3. 数据契约（只读，不改接口）

全部从 `src/api/index.ts` 导入：

- `portalApi.schedule(): PortalMatch[]`
- `portalApi.news(): PortalArticle[]`
- `portalApi.standings(): StandingRow[]`
- `rankingApi.scorers(): ScorerRank[]`
- `momentApi.publicList(): MatchMoment[]`、`momentApi.image(id): Blob`
- `tournamentApi.list({ publishedOnly: true }): Tournament[]`
- `registrationApi.listMine(): Registration[]`
- `teamApi.getMine(): Team | null`
- `teamCompleteness(team): { score, complete, missing }`
- `identityApi.mine(): RealNameRecord | null`
- `playerApi.myRecords(): PlayerMatchRecord[]`
- `useAuth().state.role / persona / account`

比赛状态：`进行中 / 未开始 / 已结束`；赛事等级 `school/city/province`；报名状态 `待初审/已提交省级/已通过/已驳回`。

## 4. 视觉与交互系统（全页统一）

### 4.1 设计变量

优先复用全局变量；括号内为兜底色，避免变量缺失时样式失效。

| 用途 | 值 |
| --- | --- |
| 页面底色 | `#f7f3ea`（与现有首页波浪一致） |
| 主绿 | `var(--green, #1e7a3f)` |
| 深绿 | `var(--green-dark, #143c28)` |
| 浅绿底 | `var(--green-light, #eef8f0)` |
| 正文 | `var(--ink, #22352a)` |
| 次要文字 | `var(--muted, #6b7c72)` |
| 分隔线 | `var(--line, #e6ede8)` |
| 卡片圆角 | 16px；小徽标 999px；按钮 10px |
| 卡片阴影 | `0 8px 24px rgba(20, 60, 40, 0.06)` |
| 卡片悬停阴影 | `0 16px 32px rgba(20, 60, 40, 0.12)` |
| 主按钮渐变 | `linear-gradient(135deg, #1e7a3f, #2e9e52)` |
| 警示橙 | `#b26a00` / 底 `#fff7ed` |
| 驳回红 | `#c0392b` / 底 `#fff2f1` |
| 信息蓝 | `#1f5d98` / 底 `#f4f8fc` |

字号层级：区块标题 24px/700；卡片标题 16px/700；正文 14px/1.8；辅助 12–13px。区块之间统一 `margin-top: 64px`，内容容器 `max-width: 1200px; padding: 0 24px;`。

### 4.2 动效规范（灵动但不浮夸）

- 入场：`.reveal { animation: riseIn 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) both; }`，列表项通过行内 `animation-delay: i * 70ms` 错峰。
- 悬停：卡片 `translateY(-4px)` + 阴影加深，图片 `scale(1.04)`，箭头 `translateX(3px)`，时长 240ms。
- 进行中比赛：红点 `pulse 1.6s infinite`，仅缩放透明度，不改变布局。
- 骨架屏：`linear-gradient(90deg, #eef3ee 25%, #f7faf7 37%, #eef3ee 63%)`，`background-size: 400% 100%`，`shimmer 1.4s infinite`。
- 时间线当前节点：外圈 `ringPulse 2s infinite`。
- 所有动效在 `@media (prefers-reduced-motion: reduce)` 下关闭（`animation: none; transition: none;`）。

### 4.3 图片加载与失败占位（重点）

所有图片统一使用固定比例容器 `aspect-ratio: 16 / 10; overflow: hidden;`，避免加载失败时页面跳动。

状态优先级：

1. 正在读取 blob → 骨架屏；
2. 已有 objectURL 且未失败 → `<img>`；
3. 读取失败或 `img` 触发 error → 渐变占位（按类别换色 + 球图标 + 标题）；
4. 永远不出现浏览器默认破图图标或 alt 文字撑破布局。

HomePage 实现代码：

```ts
const momentUrls = reactive<Record<string, string>>({})
const momentLoading = reactive(new Set<string>())
const momentFailed = reactive(new Set<string>())
const objectUrls = new Set<string>()

async function loadMomentImages(list: MatchMoment[]) {
  await Promise.all(
    list.slice(0, 4).map(async (item) => {
      if (momentUrls[item.id]) return
      momentLoading.add(item.id)
      try {
        const blob = await momentApi.image(item.id)
        const url = URL.createObjectURL(blob)
        momentUrls[item.id] = url
        objectUrls.add(url)
      } catch {
        momentFailed.add(item.id)
      } finally {
        momentLoading.delete(item.id)
      }
    }),
  )
}

function categoryClass(category: MatchMoment['category']) {
  return {
    进球: 'cat-goal',
    庆祝: 'cat-celebrate',
    花絮: 'cat-backstage',
    精彩瞬间: 'cat-highlight',
  }[category]
}

onBeforeUnmount(() => {
  for (const url of objectUrls) URL.revokeObjectURL(url)
  objectUrls.clear()
})
```

模板：

```html
<figure v-for="(item, i) in latestMoments" :key="item.id" class="moment-card reveal" :style="{ animationDelay: `${i * 70}ms` }">
  <div class="moment-media" :class="[categoryClass(item.category), { failed: momentFailed.has(item.id) }]">
    <div v-if="momentLoading.has(item.id)" class="media-skeleton" aria-hidden="true"></div>
    <img
      v-else-if="momentUrls[item.id] && !momentFailed.has(item.id)"
      :src="momentUrls[item.id]"
      :alt="item.title"
      loading="lazy"
      @error="momentFailed.add(item.id)"
    />
    <div v-else class="media-fallback">
      <AppIcon name="ball" :size="30" />
      <span>{{ item.title }}</span>
    </div>
  </div>
  <figcaption>
    <p class="moment-title">{{ item.title }}</p>
    <span class="moment-cat">{{ item.category }}</span>
  </figcaption>
</figure>
```

占位样式：

```css
.moment-media {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: linear-gradient(135deg, #2f6b4f, #14532d);
}
.moment-media img {
  width: 100%; height: 100%; object-fit: cover; display: block;
  transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.moment-card:hover img { transform: scale(1.04); }
.moment-media.cat-goal { background: linear-gradient(135deg, #1e7a3f, #0f2f20); }
.moment-media.cat-celebrate { background: linear-gradient(135deg, #b26a00, #5c3600); }
.moment-media.cat-backstage { background: linear-gradient(135deg, #1f5d98, #0f2f20); }
.moment-media.cat-highlight { background: linear-gradient(135deg, #2f6b4f, #14532d); }
.media-fallback {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: 18px; text-align: center;
  color: rgba(255, 255, 255, 0.9); font-size: 13px; font-weight: 600;
}
.media-skeleton {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, #eef3ee 25%, #f7faf7 37%, #eef3ee 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
```

### 4.4 空状态与加载状态

- 区块加载：渲染 2–3 个 `.skeleton-card`（高 120–180px，圆角 16px），不用整页转圈。
- 空状态：浅绿虚线边框卡片，居中 13px 次要文字，最小高度 120px，例如「暂无开放报名的赛事」；右侧保留「浏览全部赛事 →」。
- 错误状态：仅在顶部显示一条浅红提示条，其他区块仍展示可用数据。

## 5. `src/components/HomePage.vue`

保留 `PortalHeader`、`PortalFooter`、深绿 hero 与球场线稿，删除静态「功能亮点」三卡片。

### 5.1 Script

- 移除对 `PortalHeader` 的 `ref` 与 `openModal` 调用。
- 新增 refs：`schedule`、`tournaments`、`news`、`moments`、`scorers`、`standings`、`myRegistrations`、`loading`、`error`。
- `onMounted` 用 `Promise.allSettled` 并行加载 6 个公开接口；仅 `auth.state.role === 'user'` 时追加 `registrationApi.listMine()`，失败静默为空。
- `loadMomentImages()` 与 objectURL 回收按 4.3 实现。
- 计算属性：
  - `openTournaments`：`status === '报名中' && registrationEnabled && endOfDay(signEnd) >= Date.now()`，按 `signEnd` 升序。
  - `liveMatches`：`status === '进行中'`。
  - `upcomingMatches`：`status === '未开始'` 前 3 条。
  - `recentMatches`：`status === '已结束'` 前 3 条。
  - `featuredStandings`：第一个组别的前 5 行；`featuredGroup` 为该组别名。
  - `latestNews`：`news.slice(0, 4)`。
  - `latestMoments`：`moments.slice(0, 4)`。
  - `heroStats`：报名中赛事数、进行中比赛数、已发布资讯数。
  - `registeredIds`：`myRegistrations` 中状态不为「已驳回」的 `tournamentId` 集合。
- 跳转：
  - `registerEntry()`：登录用户 → `/user/tournaments`；游客 → `/login?redirect=%2Fuser%2Ftournaments`。
  - `tournamentEntry(id)`：非负责人 → `/user/tournaments`；游客 → 带 `redirect` 的登录地址；负责人 → `/user/registration-form?tournamentId=id`。
  - `matchEntry(id)`：`/matches/${id}`。
- 时间与倒计时：

```ts
function endOfDay(date: string) {
  const time = new Date(`${date}T23:59:59`).getTime()
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY
}
function daysLeft(date: string) {
  const end = endOfDay(date)
  if (!Number.isFinite(end)) return null
  return Math.ceil((end - Date.now()) / 86400000)
}
function deadlineText(date: string) {
  const d = daysLeft(date)
  if (d === null) return '以组委会通知为准'
  if (d < 0) return '已截止'
  if (d === 0) return '今天截止'
  return `剩余 ${d} 天`
}
function deadlineTone(date: string) {
  const d = daysLeft(date)
  return d !== null && d < 0 ? 'expired' : d === 0 ? 'today' : d !== null && d <= 3 ? 'soon' : 'normal'
}
function scheduleText(time: string) {
  return time.length >= 16 ? `${time.slice(5, 10)} ${time.slice(11, 16)}` : time
}
```

### 5.2 Template 结构

1. **Hero**：保留标题「从校园球场到省级赛场」与简介。主按钮「赛事报名」使用 `registerEntry()`；次按钮「查看赛程」→ `/schedule`、「赛事榜单」→ `/rankings`、「新闻政策」→ `/news`。右侧保留 `soccerVictory` 图片，图片底部叠加 3 个玻璃质感数据角标（报名中 / 进行中 / 已发布），背景 `rgba(255,255,255,0.12)` + `backdrop-filter: blur(8px)`。
2. **赛事现场**：标题按 `liveMatches.length ? '正在进行' : upcomingMatches.length ? '即将开赛' : '最近赛果'` 切换；卡片展示组别轮次、主客队、比分或 `VS`、时间、场地、阶段。整卡 `router-link` 到比赛详情；进行中卡片左上角红点 + `phase`。右侧「全部赛程 →」。
3. **报名中赛事**：卡片展示等级标签、赛事名、组别、主办方、截止倒计时（`deadlineTone` 决定绿色/橙色/红色/灰色）、报名条件「球队资料完善 · 教练≥1 · 球员≥5」；已报名显示绿色「已报名」徽标，否则按钮「立即报名」。游客按钮进入登录并回跳。
4. **最新资讯**：列表展示标签、标题、摘要、来源/日期；`article.autoGenerated` 显示「AI 战报」绿色徽标；每项链接 `/news`；hover 背景 `#f7fbf8`，标题变绿。
5. **榜单速览**：左右两张卡，射手榜前 5（姓名/球队/进球）与积分榜前 5（队伍/积分，标题带 `featuredGroup`）。排名 1–3 分别用金 `#d4a017`、银 `#8a94a6`、铜 `#b87333` 圆形徽标；底部「完整榜单 →」。
6. **精彩瞬间**：仅有已发布瞬间时渲染；4 列图集，按 4.3 处理 loading/失败占位；点击进入对应比赛详情。
7. **页脚**。

区块标题统一结构：左侧 eyebrow（报名 / 赛程 / 资讯 / 数据）+ 标题，右侧「查看更多 →」。所有区块加 `.reveal`，卡片行内错峰延迟。

### 5.3 样式要点

- 内容容器 1200px；hero 内边距压缩到 `64px 24px 120px`，图片高度 420px。
- 比赛与报名两栏 `grid-template-columns: 1.15fr 0.85fr`；资讯与榜单两栏 `1.2fr 0.8fr`；图集 `repeat(4, 1fr)`。
- `@media (max-width: 980px)` 全部单列，hero 图片高 360px；`@media (max-width: 640px)` 按钮全宽、标题 `clamp(28px, 8vw, 34px)`、图集单列。
- 删除旧 `.features/.feature-card` 样式，避免死代码。

## 6. `src/components/AuthPage.vue`

仅补登录后回跳：

- 新增 `redirectTarget` computed：读取 `route.query.redirect`，只接受以 `/` 开头且不以 `//` 开头的站内路径，否则为空。
- 新增 `nextPath(role)`：`role === 'user' && redirectTarget` 时返回该路径，否则返回 `DASHBOARD_PATH[role]`。
- `finishLogin` 与注册成功回调中的 `router.push` 改用 `nextPath(...)`。

## 7. `src/user/pages/UserDashboard.vue`

保留 `PageHeader`、`StatCard`、`DataTable`、`AppIcon`，重写数据与视觉。

### 7.1 Script

- 引入 `useRouter`、`useAuth`、`teamApi`、`registrationApi`、`identityApi`、`playerApi`、`teamCompleteness`、`ApiError` 及类型。
- 状态：`team`、`registrations`、`identity`、`records`、`loading`、`error`。
- `onMounted` 用 `Promise.allSettled([teamApi.getMine(), registrationApi.listMine(), identityApi.mine(), playerApi.myRecords()])`，逐项赋值；任一失败不影响其他区块，全部失败显示错误提示。
- 计算属性：
  - `completeness = teamCompleteness(team)`。
  - `pending`：`待初审` 或 `已提交省级`。
  - `rejected`：`已驳回`。
  - `latestRecord`：`records` 按日期倒序第一条。
  - `stats`：我的球队（`team ? '1 支' : '未创建'`，hint 球队名/提示创建）；报名进行中（`pending.length`，hint 赛事名）；审核驳回（`rejected.length`，hint 最近驳回原因）；近期比赛（`records.length`，hint `日期 · vs 对手`）。
  - `todos`：
    1. 无球队 → 「创建球队资料」；
    2. 球队不完善 → `完善球队信息（还差 N 项）`，desc 为 `missing.join('、')`；
    3. 有驳回 → `处理被驳回报名（N 份）`，desc 为最近驳回原因；
    4. 非负责人且实名状态不是「已认证」→ 「完成实名认证」。
    每项含 `icon/title/desc/to/level`，`level` 为 `required` 或 `suggest`。
  - `messages`：由报名记录派生，最多 5 条：标题 `赛事名 · 球队`，类型按状态映射（待初审/已提交省级=审核通知，已通过=审核通知，已驳回=材料提醒），时间 `submitTime`，状态原值。
  - `quickGroups`：四组固定顺序：
    - 报名参赛：赛事列表、我的报名、报名审核信息；
    - 我的球队：球队信息、队员列表、教练组、球队履历（负责人可见）；
    - 我的数据：我的参赛记录、运动员信息（学生）、教练员信息（教练）、实名认证；
    - 账户服务：个人中心、使用说明（按身份路由）、信息公示。
    过滤无权限项后丢弃空组。

### 7.2 Template

- `PageHeader`：标题「工作台」，desc 显示「{身份} · {球队名/学校} · 汇总报名与赛程动态」。
- 4 张 `StatCard`。
- **球队概览条**：深绿渐变卡片，左侧球队名 + 组别/学校，中间完善度进度条（`width: score%`，渐变绿→亮绿，数字 `score / 100`），右侧「完善资料 / 我的报名」两个按钮。无球队时显示「尚未创建球队」和「去创建」。
- **待办事项**卡片：逐条图标 + 标题 + 说明 + 右侧「去处理」；必办项图标底 `#fff7ed`/文字橙，建议项 `#eef8f0`/文字绿。无待办显示「暂无待办，保持关注赛事动态」。
- **快捷入口**按 4 组渲染：组标题左侧 4px 绿色竖条；卡片网格 `repeat(auto-fill, minmax(190px, 1fr))`，图标 42px 圆角 12px。
- **消息与审核动态**用 `DataTable`，操作「查看」→ `/user/registrations`；无数据提示「暂无报名消息，去赛事列表看看」。
- loading 时统计值显示 `—`，区块显示骨架；error 时顶部浅红提示条。

### 7.3 样式

- 概览条 `background: linear-gradient(120deg, #0f2f20, #1e5a38)`，白字，进度条轨道 `rgba(255,255,255,0.18)`、填充 `linear-gradient(90deg, #7ddba6, #2e9e52)`。
- 待办行 hover `background: #fbfdfb`；右侧链接 hover 箭头右移。
- 快捷卡片沿用现有圆角与浅阴影，hover `translateY(-3px)` + 边框变绿。

## 8. `src/user/pages/TournamentList.vue`

- 引入 `registrationApi`、`Registration`。
- `load()` 并行加载赛事与（仅用户角色）`registrationApi.listMine()`；报名加载失败静默为空。
- `isOpen(t)`：`status === '报名中' && registrationEnabled && endOfDay(signEnd) >= Date.now()`。
- `deadlineText(t)`：`signEnd 截止（剩余 N 天/今天截止/已截止）`，并输出 `deadlineTone` 供表格着色（过期灰、今天红、3 天内橙、其余绿）。
- `registeredOf(t)`：匹配 `tournamentId` 的我的报名；返回 `已报名 / 已驳回 / 未报名`。
- 表格列：赛事名称、类别 100、组别 90、报名条件 190（`资料完善 · 教练≥1 · 球员≥5`）、截止时间 180、状态 90、报名情况 90。
- `rowActions(row)`：不可报名或非负责人 → `['查看详情']`；可报名且未报名 → `['查看详情', '报名']`。
- `openRegistration`：已报名提示「该球队已报名此赛事，请在我的报名查看进度」；非负责人提示仅负责人可报名；否则跳报名表单。
- 顶部提示补充「报名前需完成球队资料、教练与球员名单；截止时间以赛事设置为准」。

## 9. `src/user/pages/RegistrationForm.vue`

- 引入 `identityApi`、`RealNameRecord`。
- `load()` 增加 `identityApi.mine()`（失败置空）。
- `openTournaments` 增加截止日校验（与服务端一致）。
- `checkItems` computed（4 项）：
  1. 球队资料完善：`completeness.complete`，detail 为得分或缺失项，链接 `/user/team-info`，硬性条件；
  2. 教练≥1：`team.coaches.length >= 1`，detail `N 名教练`，链接 `/user/team-coaches`，硬性条件；
  3. 球员≥5：`team.players.length >= 5`，detail `N 名球员`，链接 `/user/team-members`，硬性条件；
  4. 队长实名认证：`identity?.status === '已认证'`，detail 为当前状态或「未提交」，链接 `/user/identity`，提示项不阻断。
- 资格卡视觉：
  - 顶部显示「报名资格自查」+ 右侧就绪计数 `3 / 4 项`。
  - 桌面两列、移动单列；每项 22px 状态圆点：通过=绿底白勾，未通过=橙底感叹号，提示项未完成=蓝底 i。
  - 未通过硬性项卡片底 `#fffaf2`、边框 `#f3e2c8`；已通过 `#f7fbf8`；提示项 `#f4f8fc`。
  - 右侧「去完善 →」链接；前三项未通过时保留阻断提示与按钮，不渲染表单。
- `submitted = ref<Registration | null>(null)`；`onSubmit` 成功后不再 `setTimeout` 跳转，改为 `submitted.value = result`。
- 提交成功卡：
  - 顶部绿色勾图标 + 「报名已提交」+ 赛事/球队/提交时间。
  - 状态时间线 4 节点：提交报名 → 市州初审 → 省级终审 → 审核通过。
  - 节点 28px 圆形：done 绿底白勾；current 白底绿环 + `ringPulse`；wait 灰底；error 红底感叹号。
  - 连接线 2px：已完成绿色，未完成 `#e3ebe5`。
  - 状态映射：`待初审` 节点 2 current；`已提交省级` 节点 2 done、节点 3 current；`已通过` 全部 done；`已驳回` 节点 2/3 error，并显示「审核未通过，请在我的报名查看原因」。
  - 底部按钮「查看我的报名」→ `/user/registrations`，「继续浏览赛事」→ `/user/tournaments`。
- 提交成功后隐藏资格卡与表单（`v-if="!submitted"`）。

## 10. `src/user/pages/MyRegistrations.vue`

- 新增紧凑状态时间线（不新增接口）：
  - `timelineOf(status)` 返回 4 个节点，规则同 9；
  - 节点 18px，连接线 2px；每份报名一行：标题（赛事 · 球队）+ 状态徽标 + 时间线。
- 在驳回提醒卡与表格之间新增「审核进度」区；无报名不渲染；移动端横向滚动或纵向堆叠，避免挤压。
- 保留现有查询、驳回、重新提交逻辑不变。

## 11. 验收标准

- 游客首页不调用需要登录的接口；所有区块有骨架/空状态；报名类 CTA 进入 `/login?redirect=...`。
- 首页任意时刻图片读取失败都显示渐变占位（球图标 + 标题），不出现破图、不引发布局跳动。
- `user001 / 123456` 登录后能回到 `/user/tournaments`；工作台显示真实球队、报名、驳回、比赛数据与 4 组快捷入口。
- 赛事列表只对「状态报名中 + 开启报名 + 未过截止日」且未报名的负责人显示「报名」。
- 报名表单展示 4 项资格自查；未满足硬性条件时不能提交；提交后出现状态时间线，不自动跳页。
- 我的报名展示每份记录的状态时间线。
- 375px 宽度下首页、工作台、赛事列表均为单列且无横向滚动；1440px 下内容不空旷、卡片不拉伸变形。
- 动效在 `prefers-reduced-motion` 下全部关闭。
- `npm run type-check`、`npm run build-only` 均通过；浏览器控制台无 error。

## 12. 验证步骤

1. `npm run type-check`
2. `npm run build-only`
3. 浏览器（dev server `http://localhost:5173`）：
   - 游客首页：6 个区块、图片加载、倒计时分级、CTA 回跳参数、控制台无 error；
   - 模拟瞬间图片失败：断网刷新或拦截 blob 请求，确认显示渐变占位且卡片高度不变；
   - 登录 `user001/123456` → 验证回跳、工作台概览条/统计/待办/消息/四组入口；
   - 赛事列表：核对倒计时颜色、条件列、已报名标识、报名按钮显隐；
   - 报名表单：资格自查、阻断逻辑、提交后时间线；
   - 我的报名：时间线显示；
   - 375 / 768 / 1440 三档截图检查；
   - DevTools 开启「减少动态效果」，确认无入场/脉冲动画且有完整内容。
4. 验证后再次执行 type-check 与 build-only。
