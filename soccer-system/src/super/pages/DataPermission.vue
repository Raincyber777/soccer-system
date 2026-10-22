<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'

// 跨区数据权限配置（超级管理员专属：按市州配置审核员可见数据范围）
const columns: TableColumn[] = [
  { key: 'city', label: '市州' },
  { key: 'admins', label: '审核员数', width: '90px' },
  { key: 'scope', label: '可见数据范围' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows = [
  { city: '成都市', admins: 2, scope: '本市州报名与球队数据', status: '已生效' },
  { city: '绵阳市', admins: 2, scope: '本市州报名与球队数据', status: '已生效' },
  { city: '宜宾市', admins: 1, scope: '本市州报名与球队数据', status: '进行中' },
]

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}
</script>

<template>
  <PageHeader title="跨区数据权限" desc="配置各市州审核员可见的数据范围，防止跨区查看与操作" />

  <p class="page-tip">默认规则：市州审核员仅能查看本市州的报名与球队数据，跨区权限需在此单独开通。</p>

  <DataTable :columns="columns" :rows="rows" :actions="['调整权限', '停用']" @action="onAction" />
</template>
