<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'

// 系统参数配置（超级管理员专属：全局开关、字典管理）
const switchColumns: TableColumn[] = [
  { key: 'param', label: '参数项' },
  { key: 'desc', label: '说明' },
  { key: 'status', label: '状态', width: '100px' },
  { key: 'updated', label: '更新时间', width: '160px' },
]

const switchRows = [
  { param: '报名通道', desc: '控制全省赛事报名入口开放/关闭', status: '已生效', updated: '2026-10-15 09:00' },
  { param: '公示查询', desc: '控制运动员/教练员公示对外可见', status: '已生效', updated: '2026-10-12 14:30' },
  { param: '注册审核', desc: '新注册信息是否需要人工审核', status: '进行中', updated: '2026-10-18 11:20' },
]

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

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}
</script>

<template>
  <PageHeader title="系统参数配置" desc="全局开关与基础字典管理，仅超级管理员可操作" />

  <h3 class="section-title">全局开关</h3>
  <DataTable :columns="switchColumns" :rows="switchRows" :actions="['切换状态']" @action="onAction" />

  <h3 class="section-title">字典管理</h3>
  <DataTable :columns="dictColumns" :rows="dictRows" :actions="['编辑', '删除']" @action="onAction" />
</template>
