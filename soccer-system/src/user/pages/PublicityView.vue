<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'
import { fetchPublicityCoaches, fetchPublicityPlayers } from '../../api/person'
import type { ApiCoach, ApiPlayer } from '../../api/team'

// 信息公示（公开数据）：仅展示注册已生效且开启公示的运动员 / 审核已生效的教练员。
// 组别筛选随姓名一起传后端；后端不可用时保留演示数据。

const GROUP_TO_API: Record<string, string> = {
  小学组: 'primary',
  中学组: 'middle',
  高中组: 'high',
  高校组: 'university',
}

const playerSearch: SearchField[] = [
  { key: 'name', label: '姓名', placeholder: '输入运动员姓名' },
  { key: 'group', label: '组别', type: 'select', options: ['小学组', '中学组', '高中组', '高校组'] },
]

const playerColumns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '110px' },
  { key: 'team', label: '所属球队' },
  { key: 'group', label: '组别', width: '100px' },
  { key: 'position', label: '场上位置', width: '100px' },
  { key: 'status', label: '公示状态', width: '100px' },
]

interface PlayerRow {
  name: string
  team: string
  group: string
  position: string
  status: string
}

const players = ref<PlayerRow[]>([
  { name: '王小磊', team: '实验中学足球队', group: '中学组', position: '前锋', status: '已公示' },
  { name: '李泽宇', team: '实验中学足球队', group: '中学组', position: '中场', status: '已公示' },
  { name: '陈昊', team: '实验中学足球队', group: '中学组', position: '守门员', status: '已公示' },
])

const coachSearch: SearchField[] = [{ key: 'name', label: '姓名', placeholder: '输入教练员姓名' }]

const coachColumns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '110px' },
  { key: 'unit', label: '执教单位' },
  { key: 'level', label: '教练员等级', width: '130px' },
  { key: 'status', label: '公示状态', width: '100px' },
]

interface CoachRow {
  name: string
  unit: string
  level: string
  status: string
}

const coaches = ref<CoachRow[]>([
  { name: '张建国', unit: '实验中学', level: '亚足联C级', status: '已公示' },
  { name: '刘洋', unit: '实验中学', level: '中国足协D级', status: '已公示' },
])

async function refresh(filters?: Record<string, string>) {
  const playerQuery: Record<string, unknown> = { page_size: 100 }
  if (filters?.name) playerQuery.name = filters.name.trim()
  if (filters?.group) playerQuery.group_type = GROUP_TO_API[filters.group] ?? ''
  const plist = await fetchPublicityPlayers(playerQuery)
  if (plist) {
    players.value = plist.map((p: ApiPlayer) => ({
      name: p.name,
      team: p.team_name,
      group: p.group_type_display,
      position: p.position || '—',
      status: '已公示', // 公示接口仅返回已生效且开启公示的球员
    }))
  }
  const clist = await fetchPublicityCoaches(filters?.name ? { name: filters.name.trim() } : undefined)
  if (clist) {
    coaches.value = clist.map((c: ApiCoach) => ({
      name: c.name,
      unit: c.team_name || c.unit_name || '—',
      level: c.cert_level || '—',
      status: '已公示', // 教练公示名单 = 审核已生效
    }))
  }
}

onMounted(() => refresh())

function onSearch(filters: Record<string, string>) {
  refresh(filters)
}
</script>

<template>
  <PageHeader title="信息公示" desc="查询运动员与教练员的公示信息，公示名单即审核生效名单" />

  <h3 class="section-title">运动员公示</h3>
  <SearchBar :fields="playerSearch" @search="onSearch" @reset="onSearch" />
  <DataTable :columns="playerColumns" :rows="players" />

  <h3 class="section-title">教练员公示</h3>
  <SearchBar :fields="coachSearch" @search="onSearch" @reset="onSearch" />
  <DataTable :columns="coachColumns" :rows="coaches" />
</template>
