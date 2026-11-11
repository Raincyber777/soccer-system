<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '../../components/common/PageHeader.vue'
import StatCard from '../../components/common/StatCard.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'
import { playerApi, matchEventApi, teamCompleteness, ApiError, type PlayerDetail, type MatchEvent } from '../../api'
import { useAuth } from '../../stores/auth'

// 单个球员全量统计：基础档案 + 赛季汇总 + 按赛事统计 + 比赛明细 + 球队信息
// 从球员管理列表进入；统计值由比赛明细聚合，避免人工填报误差
const route = useRoute()
const auth = useAuth()

const detail = ref<PlayerDetail | null>(null)
const events = ref<MatchEvent[]>([])
const loading = ref(false)
const message = ref('')

const basePath = auth.state.role === 'super' ? '/super' : '/admin'

const stats = computed(() => {
  const d = detail.value
  if (!d) return []
  return [
    { icon: 'users', label: '出场场次', value: d.season.matches, hint: `首发 ${d.season.starts} 场` },
    { icon: 'info', label: '出场分钟', value: d.season.minutes, hint: `场均 ${d.season.matches ? Math.round(d.season.minutes / d.season.matches) : 0} 分钟` },
    { icon: 'ball', label: '进球', value: d.season.goals, hint: `场均 ${d.season.goalsPerMatch} 球` },
    { icon: 'star', label: '助攻', value: d.season.assists, hint: '赛季累计' },
    { icon: 'medal', label: '平均评分', value: d.season.avgRating, hint: '满分 10 分' },
    { icon: 'circle-check', label: '胜率', value: `${d.season.winRate}%`, hint: `黄牌 ${d.season.yellowCards} · 红牌 ${d.season.redCards}` },
  ]
})

const tournamentColumns: TableColumn[] = [
  { key: 'tournamentName', label: '赛事' },
  { key: 'matches', label: '出场', width: '70px' },
  { key: 'goals', label: '进球', width: '70px' },
  { key: 'assists', label: '助攻', width: '70px' },
  { key: 'minutes', label: '出场分钟', width: '90px' },
  { key: 'avgRating', label: '平均评分', width: '90px' },
]

const matchColumns: TableColumn[] = [
  { key: 'date', label: '日期', width: '110px' },
  { key: 'opponent', label: '对手' },
  { key: 'score', label: '比分', width: '70px' },
  { key: 'result', label: '结果', width: '60px' },
  { key: 'startsLabel', label: '首发', width: '60px' },
  { key: 'minutes', label: '分钟', width: '70px' },
  { key: 'goals', label: '进球', width: '60px' },
  { key: 'assists', label: '助攻', width: '60px' },
  { key: 'cardsLabel', label: '红黄牌', width: '80px' },
  { key: 'rating', label: '评分', width: '70px' },
]

// 事件补录明细：来自赛事信息录入，是球员全量统计的补充数据来源
const eventColumns: TableColumn[] = [
  { key: 'tournamentName', label: '赛事' },
  { key: 'matchLabel', label: '场次', width: '130px' },
  { key: 'type', label: '事件', width: '70px' },
  { key: 'minuteText', label: '时间', width: '70px' },
  { key: 'note', label: '备注' },
  { key: 'createdAt', label: '录入时间', width: '150px' },
]

const tournamentRows = computed<Record<string, unknown>[]>(() =>
  (detail.value?.tournaments ?? []).map((t) => ({ ...t })),
)

const matchRows = computed<Record<string, unknown>[]>(() =>
  (detail.value?.matches ?? []).map((m) => ({
    ...m,
    startsLabel: m.starts ? '首发' : '替补',
    cardsLabel: `${m.yellowCards} 黄 / ${m.redCards} 红`,
  })),
)

const teamCompletenessInfo = computed(() => teamCompleteness(detail.value?.team ?? null))

const eventRows = computed<Record<string, unknown>[]>(() =>
  events.value.map((e) => ({
    ...e,
    minuteText: `${e.minute}'`,
    note: e.note ?? '—',
  })),
)

async function load() {
  loading.value = true
  message.value = ''
  try {
    const id = String(route.params.id ?? '')
    const [playerDetail, eventList] = await Promise.all([
      playerApi.getDetail(id),
      matchEventApi.list({ playerId: id }),
    ])
    detail.value = playerDetail
    events.value = eventList
  } catch (error) {
    message.value = error instanceof ApiError ? error.message : '球员数据加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="detail-head">
    <router-link class="back-link" :to="`${basePath}/player-manage`">← 返回球员管理</router-link>
  </div>

  <PageHeader
    :title="detail ? `球员全量统计 · ${detail.player.name}` : '球员全量统计'"
    desc="球员基础档案、赛季汇总、按赛事统计与逐场明细"
  />

  <p v-if="message" class="page-tip">{{ message }}</p>
  <p v-if="loading" class="page-tip">正在加载球员数据…</p>

  <template v-if="detail">
    <div class="profile-card">
      <div class="profile-main">
        <span class="jersey">{{ detail.player.jerseyNo }}</span>
        <div>
          <p class="profile-name">
            {{ detail.player.name }}
            <span class="profile-tag">{{ detail.player.position }}</span>
            <span class="profile-tag" :class="{ ok: detail.player.status === '已公示' }">
              {{ detail.player.status }}
            </span>
          </p>
          <p class="profile-meta">{{ detail.player.team }} · {{ detail.player.school }} · {{ detail.player.city }}</p>
          <p class="profile-meta">
            组别 {{ detail.player.group }}　｜　出生日期 {{ detail.player.birthDate }}　｜　身高 {{ detail.player.height }}cm
            　｜　体重 {{ detail.player.weight }}kg
          </p>
          <p class="profile-meta">身份证号 {{ detail.player.idCard }}</p>
        </div>
      </div>
      <div class="profile-team">
        <p class="team-title">球队信息</p>
        <p class="team-line">球队：{{ detail.team?.name ?? '—' }}</p>
        <p class="team-line">学校标识码：{{ detail.team?.schoolCode ?? '—' }}</p>
        <p class="team-line">成立时间：{{ detail.team?.foundTime ?? '—' }}　队长：{{ detail.team?.captain ?? '—' }}</p>
        <p class="team-line" :class="{ warn: !teamCompletenessInfo.complete }">
          球队资料完善度：{{ teamCompletenessInfo.score }} / 100
          <template v-if="!teamCompletenessInfo.complete">（缺少 {{ teamCompletenessInfo.missing.join('、') }}）</template>
        </p>
      </div>
    </div>

    <div class="stat-grid">
      <StatCard v-for="s in stats" :key="s.label" v-bind="s" />
    </div>

    <h3 class="section-title">按赛事统计</h3>
    <DataTable :columns="tournamentColumns" :rows="tournamentRows" />

    <h3 class="section-title">比赛明细</h3>
    <DataTable :columns="matchColumns" :rows="matchRows" />

    <h3 class="section-title">赛事事件补录</h3>
    <p class="page-tip">
      来自管理员端「赛事信息录入」的事件记录；补录越完整，球员全量统计与门户 AI 报告越准确。
    </p>
    <DataTable :columns="eventColumns" :rows="eventRows" />
    <p v-if="!events.length" class="page-tip">暂无该球员的事件补录记录。</p>
  </template>
</template>

<style scoped>
.detail-head {
  margin-bottom: 8px;
}

.back-link {
  font-size: 13px;
  font-weight: 600;
  color: var(--green);
}

.back-link:hover {
  text-decoration: underline;
}

.profile-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px 22px;
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  box-shadow: 0 4px 14px rgba(20, 60, 40, 0.05);
}

.profile-main {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.jersey {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: var(--grad-green);
  color: #fff;
  font-size: 24px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-name {
  font-size: 18px;
  font-weight: 800;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.profile-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
  background: #f4f6f4;
  color: var(--muted);
}

.profile-tag.ok {
  background: var(--green-light);
  color: var(--green-dark);
}

.profile-meta {
  margin-top: 5px;
  font-size: 12.5px;
  color: var(--muted);
  line-height: 1.6;
}

.profile-team {
  min-width: 260px;
  border-left: 1px dashed #e3ece5;
  padding-left: 20px;
}

.team-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--green-dark);
  margin-bottom: 6px;
}

.team-line {
  font-size: 12.5px;
  color: var(--muted);
  line-height: 1.8;
}

.team-line.warn {
  color: #a3312a;
}

@media (max-width: 760px) {
  .profile-team {
    border-left: none;
    padding-left: 0;
    border-top: 1px dashed #e3ece5;
    padding-top: 12px;
    min-width: 0;
  }
}
</style>
