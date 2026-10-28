<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'
import { errMsg, fetchSystemConfigs, updateSystemConfig } from '../../api/system'
import { promptDialog } from '../../components/common/dialog'

// 系统参数配置：全局开关来自后端，点「修改」弹出居中弹窗改值（替代浏览器原生 prompt）。

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

async function onAction(action: string, row: Record<string, unknown>) {
  if (action !== '修改') return
  const r = row as unknown as ConfigRow
  if (r.id === null) {
    alert('数据未加载，请刷新后重试')
    return
  }
  const next = await promptDialog({
    title: '修改系统参数',
    message: `${r.desc}\n当前取值：${r.value}`,
    label: `参数「${r.param}」的新取值`,
    initial: r.value,
    confirmText: '保存',
    maxlength: 200,
  })
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
  <PageHeader title="系统参数配置" desc="全局开关管理，仅超级管理员可操作" />

  <h3 class="section-title">全局开关</h3>
  <DataTable :columns="switchColumns" :rows="switchRows" :actions="['修改']" @action="onAction" />
</template>
