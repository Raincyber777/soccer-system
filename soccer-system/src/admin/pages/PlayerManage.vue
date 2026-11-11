<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'
import { SICHUAN_CITY_OPTIONS } from '../../data/sichuan-schools'
import { playerApi, ApiError, type Player } from '../../api'
import { useAuth } from '../../stores/auth'

// 管理员球员管理（对应需求：按姓名/身份证搜索、公示/取消公示、查看单个球员全量统计、重置密码）
const router = useRouter()
const auth = useAuth()

const searchFields: SearchField[] = [
  { key: 'keyword', label: '关键词', placeholder: '姓名 / 身份证号 / 球队' },
  { key: 'city', label: '市州', type: 'select', options: SICHUAN_CITY_OPTIONS },
  { key: 'group', label: '组别', type: 'select', options: ['小学组', '中学组', '高中组', '高校组'] },
  { key: 'status', label: '公示状态', type: 'select', options: ['已公示', '待审核', '未公示'] },
]

const columns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '90px' },
  { key: 'jerseyNo', label: '球衣号', width: '80px' },
  { key: 'position', label: '位置', width: '80px' },
  { key: 'team', label: '所属球队' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'matches', label: '出场', width: '70px' },
  { key: 'goals', label: '进球', width: '70px' },
  { key: 'assists', label: '助攻', width: '70px' },
  { key: 'status', label: '公示状态', width: '100px' },
]

const rows = ref<Record<string, unknown>[]>([])
const loading = ref(false)
const message = ref('')

const basePath = auth.state.role === 'super' ? '/super' : '/admin'

function rowActions(row: Record<string, unknown>) {
  const publicized = row.status === '已公示'
  return ['查看全量统计', publicized ? '取消公示' : '公示', '重置密码']
}

async function load(filters: Record<string, string> = {}) {
  loading.value = true
  message.value = ''
  try {
    const list = await playerApi.list({
      keyword: filters.keyword || undefined,
      city: filters.city || undefined,
      group: filters.group || undefined,
      status: (filters.status as Player['status']) || undefined,
    })
    const details = await Promise.all(list.map((p) => playerApi.getDetail(p.id)))
    rows.value = details.map((d) => ({
      id: d.player.id,
      name: d.player.name,
      jerseyNo: d.player.jerseyNo,
      position: d.player.position,
      team: d.player.team,
      group: d.player.group,
      matches: d.season.matches,
      goals: d.season.goals,
      assists: d.season.assists,
      status: d.player.status,
    }))
  } catch (error) {
    message.value = error instanceof ApiError ? error.message : '球员数据加载失败'
  } finally {
    loading.value = false
  }
}

function openDetail(row: Record<string, unknown>) {
  router.push(`${basePath}/players/${String(row.id ?? '')}`)
}

async function onAction(action: string, row: Record<string, unknown>) {
  if (action === '查看全量统计') {
    openDetail(row)
    return
  }
  if (action === '公示' || action === '取消公示') {
    try {
      await playerApi.setPublic(String(row.id ?? ''), action === '公示')
      message.value = `「${String(row.name ?? '')}」已${action === '公示' ? '公示' : '取消公示'}。`
      await load()
    } catch (error) {
      message.value = error instanceof ApiError ? error.message : '操作失败'
    }
    return
  }
  message.value = `【演示】${action}：待接入后端（球员 ${String(row.name ?? '')}）`
}

function onSearch(filters: Record<string, string>) {
  void load(filters)
}

onMounted(() => load())
</script>

<template>
  <PageHeader title="球员管理" desc="搜索球员信息，查看单个球员全量统计，支持公示/取消公示与账号密码重置" />

  <p v-if="message" class="page-tip">{{ message }}</p>

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable :columns="columns" :rows="rows" :row-actions="rowActions" @action="onAction" />

  <p v-if="loading" class="loading-tip">正在加载球员数据…</p>
</template>

<style scoped>
.loading-tip {
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted);
}
</style>
