<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import AppIcon from '../../components/common/AppIcon.vue'
import { schoolMatchApi, ApiError, type SchoolMatch } from '../../api'
import { useAuth } from '../../stores/auth'

// 校级工作台：统计本校比赛进度；AI 进球审核由赛事管理员负责，校级端不提供
const auth = useAuth()
const matches = ref<SchoolMatch[]>([])
const loading = ref(true)
const error = ref('')

const liveCount = computed(() => matches.value.filter((m) => m.status === 'live').length)
const upcomingCount = computed(() => matches.value.filter((m) => m.status === 'not_started').length)
const finishedCount = computed(() => matches.value.filter((m) => m.status === 'finished').length)

async function load() {
  loading.value = true
  error.value = ''
  try {
    matches.value = await schoolMatchApi.list()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '工作台数据加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page-root">
  <PageHeader
    title="校级工作台"
    desc="校级管理员只能举办、运营本校比赛；数据范围由账号绑定学校决定，跨校操作会被拒绝"
  />

  <p v-if="error" class="page-tip error">{{ error }}</p>
  <p v-else-if="!auth.state.schoolCode" class="page-tip error">当前账号未绑定学校，无法举办比赛，请联系上级管理员。</p>

  <div class="stat-grid">
    <article class="stat-card">
      <AppIcon name="ball" :size="20" />
      <span class="stat-value">{{ loading ? '—' : matches.length }}</span>
      <span class="stat-label">本校比赛</span>
    </article>
    <article class="stat-card">
      <span class="stat-dot live" />
      <span class="stat-value">{{ loading ? '—' : liveCount }}</span>
      <span class="stat-label">进行中</span>
    </article>
    <article class="stat-card">
      <span class="stat-dot upcoming" />
      <span class="stat-value">{{ loading ? '—' : upcomingCount }}</span>
      <span class="stat-label">待开赛</span>
    </article>
  </div>

  <section class="quick-grid">
    <router-link to="/admin/school/matches" class="quick-card">
      <h3>本校比赛</h3>
      <p>举办比赛、编辑未开始的场次、开赛与结束，已结束的比赛自动锁定。</p>
      <span class="quick-more">进入比赛管理 →</span>
    </router-link>
  </section>

  <p class="page-tip hint">
    已结束比赛 {{ loading ? '—' : finishedCount }} 场。举办比赛时至少一支球队须属于本校；
    跨校操作返回 20004，缺少球队或时间返回 10001，已开始比赛不可删除。
  </p>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 22px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px;
  background: #fff;
  border: 1px solid #eef1ee;
  border-radius: 14px;
  color: var(--green);
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--green-dark);
}

.stat-label {
  font-size: 12px;
  color: var(--muted);
}

.stat-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.stat-dot.live {
  background: #2f6fa8;
}

.stat-dot.upcoming {
  background: #d8a12a;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}

.quick-card {
  display: block;
  padding: 20px;
  background: #fff;
  border: 1px solid #eef1ee;
  border-radius: 14px;
  transition: border-color 0.16s ease, transform 0.16s ease;
}

.quick-card:hover {
  border-color: var(--green);
  transform: translateY(-2px);
}

.quick-card h3 {
  font-size: 16px;
  color: var(--green-dark);
  margin-bottom: 8px;
}

.quick-card p {
  font-size: 13px;
  line-height: 1.8;
  color: var(--muted);
}

.quick-more {
  display: inline-block;
  margin-top: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--green);
}

.page-tip {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 12px;
}

.page-tip.error {
  color: #a3312a;
}

.page-tip.hint {
  margin-top: 18px;
  line-height: 1.8;
}

@media (max-width: 800px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .quick-grid {
    grid-template-columns: 1fr;
  }
}
</style>
