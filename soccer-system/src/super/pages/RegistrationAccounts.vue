<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'

// 报名账号管理与报名日志（对应需求：报名账号查询/修改/删除、管理报名日志）
const accountColumns: TableColumn[] = [
  { key: 'account', label: '账号', width: '140px' },
  { key: 'unit', label: '所属单位' },
  { key: 'role', label: '角色', width: '130px' },
  { key: 'createTime', label: '创建时间', width: '160px' },
  { key: 'status', label: '状态', width: '100px' },
]

const accounts = [
  { account: 'szyds_zq01', unit: '实验中学', role: '球队账号', createTime: '2026-09-01 10:00', status: '已生效' },
  { account: 'scsfdx_fc', unit: '四川师范大学', role: '高校账号', createTime: '2026-09-03 15:30', status: '已生效' },
  { account: 'cd_shi_zhen', unit: '成都市教育局', role: '市州账号', createTime: '2026-08-20 09:12', status: '已生效' },
  { account: 'test_001', unit: '测试单位', role: '球队账号', createTime: '2026-08-25 14:40', status: '已删除' },
]

const logColumns: TableColumn[] = [
  { key: 'time', label: '操作时间', width: '170px' },
  { key: 'account', label: '账号', width: '140px' },
  { key: 'action', label: '操作内容' },
  { key: 'ip', label: 'IP 地址', width: '140px' },
]

const logs = [
  { time: '2026-10-16 14:20', account: 'szyds_zq01', action: '提交球队报名表（中学组）', ip: '10.12.3.44' },
  { time: '2026-10-16 10:05', account: 'cd_shi_zhen', action: '审核通过球队报名 3 份', ip: '10.8.1.17' },
  { time: '2026-10-15 17:12', account: 'admin', action: '修改教练员身份信息（张建国）', ip: '10.0.0.8' },
]

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}
</script>

<template>
  <PageHeader title="报名账号管理" desc="管理各报送单位的报名账号，查看报名操作日志" />

  <h3 class="section-title">报名账号</h3>
  <DataTable
    :columns="accountColumns"
    :rows="accounts"
    :actions="['查询', '修改', '删除']"
    @action="onAction"
  />

  <h3 class="section-title">报名日志</h3>
  <DataTable :columns="logColumns" :rows="logs" />
</template>
