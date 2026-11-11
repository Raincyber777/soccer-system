<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ApiError, schoolTeamApi, teamCompleteness, type Team } from '../../api'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'

// 校级管理员 · 本校球队：只读查看本校球队档案与资料完善度
// 球队资料的编辑在用户端由球队负责人完成，校级端不越权修改

const teams = ref<Team[]>([])
const loading = ref(true)
const errorMsg = ref('')

const columns: TableColumn[] = [
  { key: 'name', label: '球队名称' },
  { key: 'group', label: '组别' },
  { key: 'captain', label: '队长' },
  { key: 'found', label: '成立时间' },
  { key: 'owner', label: '负责人账号' },
  { key: 'readiness', label: '资料完善度' },
]

const rows = computed(() =>
  teams.value.map((team) => ({
    id: team.id,
    name: team.name,
    group: team.group,
    captain: team.captain || '—',
    found: team.foundTime || '—',
    owner: team.ownerAccount,
    readiness: `${teamCompleteness(team).score}%`,
  })),
)

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    teams.value = await schoolTeamApi.list()
  } catch (error) {
    errorMsg.value = error instanceof ApiError ? error.message : '本校球队加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader title="本校球队" desc="仅展示本校球队档案；球队资料由负责人在用户端维护，校级端只读查看" />

    <p v-if="errorMsg" class="page-tip error">{{ errorMsg }}</p>

    <div class="toolbar">
      <span class="toolbar-label">球队数量</span>
      <span class="toolbar-note">共 {{ teams.length }} 支 · 按学校标识码裁剪</span>
      <button type="button" class="refresh-btn" :disabled="loading" @click="load">刷新</button>
    </div>

    <DataTable :columns="columns" :rows="rows as unknown as Record<string, unknown>[]" />
    <p v-if="!loading && teams.length === 0" class="page-tip hint">本校暂无球队，请球队负责人在用户端创建球队档案。</p>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.toolbar-label {
  font-size: 13px;
  color: var(--muted);
}

.toolbar-note {
  flex: 1;
  font-size: 13px;
  color: var(--muted);
}
</style>
