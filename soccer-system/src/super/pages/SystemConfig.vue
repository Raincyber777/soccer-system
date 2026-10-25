<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'
import { errMsg, fetchSystemConfigs, updateSystemConfig } from '../../api/system'

// 系统参数配置：参数列表来自后端（可编辑取值）；字典为基础枚举说明，暂静态展示。

const switchColumns: TableColumn[] = [
  { key: 'param', label: '参数项', width: '150px' },
  { key: 'desc', label: '说明' },
  { key: 'value', label: '当前取值', width: '150px' },
  { key: 'updated', label: '更新时间', width: '160px' },
]

interface ConfigRow {
  id: number | null
  param: string
  desc: string
  value: string
  updated: string
}

const switchRows = ref<ConfigRow[]>([])

async function refresh() {
  const list = await fetchSystemConfigs()
  if (!list) return
  switchRows.value = list.map((c) => ({
    id: c.id,
    param: c.name,
    desc: c.description,
    value: c.value,
    updated: (c.updated_at || '').replace('T', ' ').slice(0, 16),
  }))
}

onMounted(refresh)

const dictColumns: TableColumn[] = [
  { key: 'dict', label: '字典项' },
  { key: 'values', label: '取值' },
  { key: 'updated', label: '更新时间', width: '160px' },
]

const dictRows = [
  { dict: '报名组别', values: '小学组 / 中学组 / 高中组 / 高校组', updated: '2026-09-01 10:00' },
  { dict: '市州列表', values: '成都市 / 绵阳市 / 德阳市 …', updated: '2026-09-01 10:00' },
  { dict: '学校代码', values: '教育部学校（机构）标识码（10 位）', updated: '2026-10-21 09:30' },
  { dict: '审核环节', values: '市州审核 / 高校审核 / 省级终审', updated: '2026-09-20 16:40' },
]

async function onAction(action: string, row: Record<string, unknown>) {
  if (action !== '修改') return
  const r = row as unknown as ConfigRow
  if (r.id === null) {
    alert('数据未加载，请刷新后重试')
    return
  }
  const next = prompt(`修改参数「${r.param}」取值（当前：${r.value}）\n${r.desc}`, r.value)
  if (next === null || next === r.value) return
  try {
    await updateSystemConfig(r.id, next)
    await refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}
</script>

<template>
  <PageHeader title="系统参数配置" desc="全局开关与基础字典管理，仅超级管理员可操作" />

  <h3 class="section-title">全局开关</h3>
  <DataTable :columns="switchColumns" :rows="switchRows" :actions="['修改']" @action="onAction" />

  <h3 class="section-title">字典管理</h3>
  <DataTable :columns="dictColumns" :rows="dictRows" />
</template>
