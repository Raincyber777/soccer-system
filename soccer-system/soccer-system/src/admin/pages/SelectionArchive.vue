<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'
import { fetchPlayers } from '../../api/person'
import type { ApiPlayer } from '../../api/team'
import {
  fetchSelectionScores,
  selectionStageDisplay,
  type ApiSelectionScore,
  type ScoreValue,
} from '../../api/selection'

// 球员遴选档案：注册名单 × 遴选评分关联展示（未评分球员显示「未评分」），
// 支持按身份证号/队伍搜索，查看档案弹出评分详情。

const searchFields: SearchField[] = [
  { key: 'idCard', label: '身份证号', placeholder: '输入身份证号' },
  { key: 'team', label: '队伍', placeholder: '输入队伍名称' },
]

const columns: TableColumn[] = [
  { key: 'name', label: '球员', width: '100px' },
  { key: 'idCard', label: '身份证号', width: '170px' },
  { key: 'team', label: '队伍' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'total', label: '遴选总分', width: '90px' },
  { key: 'status', label: '档案状态', width: '100px' },
]

interface ArchiveRow {
  id: number
  name: string
  idCard: string
  team: string
  group: string
  total: ScoreValue | '—'
  status: string
  score: ApiSelectionScore | null
}

const allRows = ref<ArchiveRow[]>([])
const rows = ref<ArchiveRow[]>([])

async function refresh() {
  const [plist, slist] = await Promise.all([fetchPlayers({ page_size: 200 }), fetchSelectionScores()])
  if (!plist) return // 后端不可用：保持空列表
  const scores = new Map<number, ApiSelectionScore>()
  for (const s of slist ?? []) scores.set(s.player, s)
  allRows.value = plist.map((p: ApiPlayer) => {
    const s = scores.get(p.id) ?? null
    return {
      id: p.id,
      name: p.name,
      idCard: p.id_card,
      team: p.team_name || '—',
      group: p.group_type_display,
      total: s ? s.total : '—',
      status: s ? selectionStageDisplay(s.status) : '未评分',
      score: s,
    }
  })
  rows.value = allRows.value
}

onMounted(refresh)

function onSearch(filters: Record<string, string>) {
  let list = allRows.value
  if (filters.idCard) list = list.filter((r) => r.idCard.includes(filters.idCard!.trim()))
  if (filters.team) list = list.filter((r) => r.team.includes(filters.team!.trim()))
  rows.value = list
}

function onAction(action: string, row: Record<string, unknown>) {
  if (action !== '查看档案') return
  const r = row as unknown as ArchiveRow
  if (!r.score) {
    alert(`${r.name}（${r.team}）暂无遴选评分记录`)
    return
  }
  const s = r.score
  alert(
    `${r.name} 遴选档案\n组别：${s.group_type_display}\n技评得分：${s.technical}｜体能得分：${s.physical}\n总分：${s.total}（自动合计）\n阶段：${selectionStageDisplay(s.status)}\n评分时间：${(s.created_at || '').slice(0, 16).replace('T', ' ')}`,
  )
}
</script>

<template>
  <PageHeader title="球员遴选档案" desc="按身份证号、队伍查询球员遴选档案，查看评分记录与遴选阶段" />

  <p class="page-tip">
    档案 = 注册球员名单 × 遴选评分：完成初选/复选评分的球员显示总分与阶段，未评分球员显示「未评分」。
  </p>

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable :columns="columns" :rows="rows" :actions="['查看档案']" @action="onAction" />
</template>
