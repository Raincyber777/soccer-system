<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ApiError,
  schoolLiveApi,
  schoolMatchApi,
  type LiveEventType,
  type LiveMatchEvent,
  type MatchPhase,
  type MatchSide,
  type MatchStateRecord,
  type SchoolMatch,
} from '../../api'

// 校级比赛手机端上传：现场用手机录入比分、阶段与事件
// 与桌面端共用同一套接口与校验，计分板不可用时作为电子数据上传入口

const route = useRoute()
const router = useRouter()
const matchId = computed(() => Number(route.params.id))

const match = ref<SchoolMatch | null>(null)
const state = ref<MatchStateRecord | null>(null)
const events = ref<LiveMatchEvent[]>([])
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const message = ref('')

const side = ref<MatchSide>('home')
const playerName = ref('')
const minute = ref('1')
const manual = reactive({ home_score: '0', away_score: '0' })

const PHASE_TEXT: Record<MatchPhase, string> = {
  not_started: '未开始',
  first_half: '上半场',
  half_time: '中场休息',
  second_half: '下半场',
  finished: '已结束',
}
const PHASE_NEXT: Record<MatchPhase, MatchPhase[]> = {
  not_started: ['first_half'],
  first_half: ['half_time', 'second_half', 'finished'],
  half_time: ['second_half', 'finished'],
  second_half: ['finished'],
  finished: [],
}

const phase = computed<MatchPhase>(() => state.value?.phase ?? match.value?.phase ?? 'not_started')
const finished = computed(() => phase.value === 'finished')
const running = computed(() => match.value?.status === 'live')
const nextPhases = computed(() => PHASE_NEXT[phase.value])
const scoreText = computed(() =>
  match.value && phase.value !== 'not_started'
    ? `${match.value.home_score} : ${match.value.away_score}`
    : '—',
)

function showMessage(text: string, isError = false) {
  if (isError) {
    error.value = text
    message.value = ''
  } else {
    message.value = text
    error.value = ''
  }
}

function handleError(err: unknown, fallback: string) {
  showMessage(err instanceof ApiError ? err.message : fallback, true)
}

async function refresh() {
  const list = await schoolMatchApi.list()
  const found = list.find((item) => item.id === matchId.value)
  if (!found) throw new ApiError(40400, '比赛不存在或不属于本校')
  match.value = found
  state.value = await schoolLiveApi.state(matchId.value)
  events.value = await schoolLiveApi.events(matchId.value)
  manual.home_score = String(found.home_score)
  manual.away_score = String(found.away_score)
  if (minute.value === '1' && found.phase !== 'not_started') {
    minute.value = String(Math.max(1, events.value[0]?.minute ?? 1))
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    await refresh()
  } catch (err) {
    handleError(err, '比赛加载失败')
  } finally {
    loading.value = false
  }
}

async function changePhase(target: MatchPhase) {
  if (!match.value || busy.value) return
  if (target === 'finished' && !window.confirm('确认结束比赛？结束后将自动生成 AI 比赛报告并同步门户。')) return
  busy.value = true
  try {
    const saved = await schoolLiveApi.saveState(matchId.value, {
      home_score: match.value.home_score,
      away_score: match.value.away_score,
      phase: target,
    })
    match.value = saved
    state.value = await schoolLiveApi.state(matchId.value)
    showMessage(
      target === 'finished'
        ? '比赛已结束，AI 比赛报告已生成并同步门户新闻。'
        : `阶段已切换为「${saved.phase_display}」。`,
    )
  } catch (err) {
    handleError(err, '阶段切换失败')
  } finally {
    busy.value = false
  }
}

async function addEvent(type: LiveEventType) {
  if (!match.value || busy.value || finished.value) return
  if (!running.value) {
    showMessage('请先开始上半场，再录入比赛事件。', true)
    return
  }
  const name = playerName.value.trim()
  if (type !== '文字' && !name) {
    showMessage('请填写球员姓名', true)
    return
  }
  const value = Number(minute.value)
  if (!Number.isInteger(value) || value < 0 || value > 130) {
    showMessage('比赛时间需为 0 - 130 的整数', true)
    return
  }
  busy.value = true
  try {
    await schoolLiveApi.createEvent(matchId.value, {
      type,
      minute: value,
      side: side.value,
      player_name: name,
    })
    playerName.value = ''
    await refresh()
    showMessage(type === '进球' ? '进球已记录，比分已更新。' : `${type}已记录。`)
  } catch (err) {
    handleError(err, '事件录入失败')
  } finally {
    busy.value = false
  }
}

async function undoLastEvent() {
  const latest = events.value[0]
  if (!latest || busy.value) return
  if (!window.confirm(`撤销「第 ${latest.minute} 分钟 · ${latest.type} · ${latest.player_name}」？`)) return
  busy.value = true
  try {
    await schoolLiveApi.removeEvent(latest.id)
    await refresh()
    showMessage(latest.type === '进球' ? '已撤销，比分已回退。' : '已撤销该事件。')
  } catch (err) {
    handleError(err, '撤销失败')
  } finally {
    busy.value = false
  }
}

async function saveManualScore() {
  if (!match.value || busy.value || finished.value) return
  const home = Number(manual.home_score)
  const away = Number(manual.away_score)
  if (!Number.isInteger(home) || home < 0 || home > 99 || !Number.isInteger(away) || away < 0 || away > 99) {
    showMessage('比分需为 0 - 99 的整数', true)
    return
  }
  busy.value = true
  try {
    const saved = await schoolLiveApi.saveState(matchId.value, {
      home_score: home,
      away_score: away,
      phase: phase.value,
    })
    match.value = saved
    state.value = await schoolLiveApi.state(matchId.value)
    showMessage(`比分已校正为 ${saved.home_score} : ${saved.away_score}。`)
  } catch (err) {
    handleError(err, '比分保存失败')
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="m-page">
    <header class="m-head">
      <button type="button" class="m-back" @click="router.push(`/admin/school/matches/${matchId}`)">← 返回</button>
      <h1>手机端上传</h1>
      <span class="m-tag">校级赛事</span>
    </header>

    <p v-if="loading" class="m-tip">正在加载比赛…</p>
    <p v-else-if="error && !match" class="m-tip error">{{ error }}</p>

    <template v-else-if="match">
      <section class="m-score">
        <p class="m-teams">{{ match.home_team_name }} vs {{ match.away_team_name }}</p>
        <p class="m-value">{{ scoreText }}</p>
        <p class="m-phase">{{ match.phase_display }} · {{ match.group_type_display }}</p>
        <p class="m-meta">{{ match.match_time }} · {{ match.venue || '场地待定' }}</p>
      </section>

      <p v-if="message" class="m-tip success">{{ message }}</p>
      <p v-if="error" class="m-tip error">{{ error }}</p>

      <p v-if="finished" class="m-tip">比赛已结束，数据已锁定，可在电脑端查看 AI 报告。</p>

      <section v-else class="m-card">
        <h2>比赛阶段</h2>
        <div class="m-phase-buttons">
          <button
            v-for="item in nextPhases"
            :key="item"
            type="button"
            class="m-phase-btn"
            :class="{ danger: item === 'finished' }"
            :disabled="busy"
            @click="changePhase(item)"
          >
            {{ item === 'finished' ? '结束比赛' : `进入${PHASE_TEXT[item]}` }}
          </button>
          <span v-if="nextPhases.length === 0" class="m-empty">当前阶段无可执行操作</span>
        </div>
        <p class="m-note">
          当前：{{ PHASE_TEXT[phase] }} · 最近更新：{{ state?.updated_at ?? '—' }}（{{ state?.source_display ?? '系统' }}）
        </p>
      </section>

      <section v-if="!finished" class="m-card">
        <h2>快速记分</h2>
        <div class="m-side-switch">
          <button type="button" :class="{ active: side === 'home' }" @click="side = 'home'">
            {{ match.home_team_name }}
          </button>
          <button type="button" :class="{ active: side === 'away' }" @click="side = 'away'">
            {{ match.away_team_name }}
          </button>
        </div>
        <div class="m-fields">
          <label>
            球员姓名
            <input v-model="playerName" type="text" maxlength="20" placeholder="进球 / 得牌球员" />
          </label>
          <label class="m-minute">
            分钟
            <input v-model="minute" type="number" min="0" max="130" />
          </label>
        </div>
        <div class="m-action-grid">
          <button type="button" class="m-action goal" :disabled="busy || !running" @click="addEvent('进球')">
            进球 +1
          </button>
          <button type="button" class="m-action" :disabled="busy || !running" @click="addEvent('黄牌')">黄牌</button>
          <button type="button" class="m-action" :disabled="busy || !running" @click="addEvent('红牌')">红牌</button>
          <button type="button" class="m-action" :disabled="busy || !running" @click="addEvent('换人')">换人</button>
        </div>
        <p v-if="!running" class="m-note">先进入上半场，才能录入比赛事件。</p>
        <button
          v-if="events.length"
          type="button"
          class="m-undo"
          :disabled="busy || !running"
          @click="undoLastEvent"
        >
          撤销最近一条：第 {{ events[0]?.minute }} 分钟 {{ events[0]?.type }} {{ events[0]?.player_name }}
        </button>
      </section>

      <section v-if="!finished" class="m-card">
        <h2>手动校正比分</h2>
        <p class="m-note">计分板与事件记录都不可用时，直接填写当前比分保存。</p>
        <div class="m-score-edit">
          <input v-model="manual.home_score" type="number" min="0" max="99" />
          <span>:</span>
          <input v-model="manual.away_score" type="number" min="0" max="99" />
        </div>
        <button type="button" class="m-save" :disabled="busy" @click="saveManualScore">保存比分</button>
      </section>

      <section class="m-card">
        <h2>最近事件</h2>
        <ul v-if="events.length" class="m-events">
          <li v-for="event in events.slice(0, 10)" :key="event.id">
            <span class="m-event-minute">{{ event.minute }}'</span>
            <span class="m-event-type">{{ event.type }}</span>
            <span class="m-event-name">{{ event.player_name }}</span>
            <span class="m-event-side">{{ event.side_display }}</span>
          </li>
        </ul>
        <p v-else class="m-empty">暂无事件记录</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.m-page {
  min-height: 100vh;
  padding: 16px 14px 40px;
  background: #f3f7f4;
  color: var(--ink, #1d2b22);
  max-width: 520px;
  margin: 0 auto;
}

.m-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.m-head h1 {
  flex: 1;
  font-size: 17px;
}

.m-back {
  padding: 6px 10px;
  border: 1px solid var(--line, #dde6df);
  border-radius: 8px;
  background: #fff;
  color: var(--green-dark, #14532d);
  font-size: 13px;
  font-family: inherit;
}

.m-tag {
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--green-light, #e6f4ea);
  color: var(--green-dark, #14532d);
  font-size: 11px;
}

.m-score {
  padding: 18px 16px;
  border-radius: 14px;
  background: linear-gradient(140deg, #14532d, #1e7a3f);
  color: #fff;
  text-align: center;
}

.m-teams {
  font-size: 14px;
  color: #d7e7dc;
}

.m-value {
  margin-top: 8px;
  font-size: 40px;
  font-weight: 800;
}

.m-phase {
  margin-top: 6px;
  font-size: 13px;
  color: #c9e7d4;
}

.m-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #b9d8c6;
}

.m-tip {
  margin-top: 12px;
  padding: 9px 12px;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: var(--muted, #6b7d70);
}

.m-tip.success {
  background: #e8f6ee;
  color: #17663a;
}

.m-tip.error {
  background: #fdecea;
  color: #b3261e;
}

.m-card {
  margin-top: 14px;
  padding: 16px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(20, 60, 40, 0.05);
}

.m-card h2 {
  font-size: 15px;
  margin-bottom: 12px;
}

.m-phase-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.m-phase-btn {
  flex: 1 1 45%;
  padding: 14px 10px;
  border: 1px solid var(--green, #1e7a3f);
  border-radius: 10px;
  background: #fff;
  color: var(--green-dark, #14532d);
  font-size: 15px;
  font-family: inherit;
}

.m-phase-btn.danger {
  border-color: #b3261e;
  color: #b3261e;
}

.m-phase-btn:disabled,
.m-action:disabled,
.m-save:disabled,
.m-undo:disabled {
  opacity: 0.5;
}

.m-side-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.m-side-switch button {
  flex: 1;
  padding: 10px 8px;
  border: 1px solid var(--line, #dde6df);
  border-radius: 9px;
  background: #f7faf8;
  color: var(--muted, #6b7d70);
  font-size: 13px;
  font-family: inherit;
}

.m-side-switch button.active {
  border-color: var(--green, #1e7a3f);
  background: var(--green-light, #e6f4ea);
  color: var(--green-dark, #14532d);
  font-weight: 600;
}

.m-fields {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.m-fields label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
  color: var(--muted, #6b7d70);
}

.m-fields .m-minute {
  flex: 0 0 82px;
}

.m-fields input {
  padding: 10px;
  border: 1.5px solid #d8e2da;
  border-radius: 9px;
  font-size: 15px;
  font-family: inherit;
}

.m-action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.m-action {
  padding: 16px 10px;
  border: none;
  border-radius: 10px;
  background: #f1f5f2;
  color: var(--ink, #1d2b22);
  font-size: 15px;
  font-family: inherit;
}

.m-action.goal {
  background: var(--green, #1e7a3f);
  color: #fff;
  font-weight: 700;
}

.m-save {
  width: 100%;
  margin-top: 12px;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: var(--green, #1e7a3f);
  color: #fff;
  font-size: 15px;
  font-family: inherit;
}

.m-undo {
  width: 100%;
  margin-top: 12px;
  padding: 11px;
  border: 1px dashed #d8b4ae;
  border-radius: 9px;
  background: #fff8f7;
  color: #b3261e;
  font-size: 12px;
  font-family: inherit;
}

.m-score-edit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.m-score-edit input {
  width: 88px;
  padding: 10px;
  border: 1.5px solid #d8e2da;
  border-radius: 10px;
  font-size: 26px;
  font-weight: 700;
  text-align: center;
}

.m-note {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--muted, #6b7d70);
}

.m-events {
  margin: 0;
  padding: 0;
  list-style: none;
}

.m-events li {
  display: flex;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px dashed var(--line, #e6ece8);
  font-size: 13px;
}

.m-events li:last-child {
  border-bottom: none;
}

.m-event-minute {
  width: 40px;
  color: var(--muted, #6b7d70);
}

.m-event-type {
  width: 46px;
  color: var(--green-dark, #14532d);
}

.m-event-name {
  flex: 1;
}

.m-event-side {
  color: var(--muted, #6b7d70);
  font-size: 12px;
}

.m-empty {
  font-size: 13px;
  color: var(--muted, #6b7d70);
}
</style>
