<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'
import { errMsg, verifyAthlete } from '../../api/person'

// 赛事身份核验：输入身份证号即时核验「注册已生效 + 所在球队有已通过的报名」。
// 核验记录仅保存在当前页面（刷新即清空），用于赛前抽查。

const columns: TableColumn[] = [
  { key: 'time', label: '核验时间', width: '150px' },
  { key: 'name', label: '姓名', width: '100px' },
  { key: 'idCard', label: '身份证号', width: '180px' },
  { key: 'team', label: '所属球队' },
  { key: 'playerStatus', label: '注册状态', width: '100px' },
  { key: 'regStatus', label: '报名状态', width: '130px' },
  { key: 'result', label: '核验结果', width: '110px' },
]

interface VerifyRow {
  time: string
  name: string
  idCard: string
  team: string
  playerStatus: string
  regStatus: string
  result: string
  pass: boolean
}

const results = ref<VerifyRow[]>([])
const idInput = ref('')
const loading = ref(false)

// 后端返回状态 code，展示时转中文
const PLAYER_STATUS: Record<string, string> = {
  active: '已生效',
  pending: '待审核',
  rejected: '已驳回',
}

const REG_STATUS: Record<string, string> = {
  pending_city_review: '待市州初审',
  pending_province_review: '待省级终审',
  approved: '已通过',
  rejected: '已驳回',
}

function nowStr() {
  return new Date().toLocaleString('zh-CN', { hour12: false }).replaceAll('/', '-')
}

async function onVerify() {
  const idCard = idInput.value.trim().toUpperCase()
  if (!/^\d{17}[\dX]$/.test(idCard)) {
    alert('请输入 18 位有效身份证号（末位可为 X）')
    return
  }
  loading.value = true
  try {
    const r = await verifyAthlete(idCard)
    results.value.unshift({
      time: nowStr(),
      name: r.name || '（查无注册）',
      idCard: r.id_card || idCard,
      team: r.team_name || '—',
      playerStatus: (r.player_status && PLAYER_STATUS[r.player_status]) || '—',
      regStatus: (r.registration_status && REG_STATUS[r.registration_status]) || '—',
      result: r.verify_result_display,
      pass: r.verify_result === 'pass',
    })
    idInput.value = ''
  } catch (err) {
    alert(errMsg(err))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <PageHeader title="赛事身份核验" desc="按身份证号核验球员参赛资格：注册已生效且球队报名已通过方可上场" />

  <p class="page-tip">
    核验规则：该身份证号在平台注册状态为「已生效」，且所在球队存在「已通过」的赛事报名 → 核验通过；查无注册或报名未通过均为不通过，防止替赛。
  </p>

  <div class="card verify-bar">
    <input
      v-model="idInput"
      class="form-input"
      type="text"
      placeholder="输入球员身份证号（18 位，末位可为 X）"
      maxlength="18"
      @keyup.enter="onVerify"
    />
    <button type="button" class="btn btn-primary" :disabled="loading" @click="onVerify">
      {{ loading ? '核验中…' : '立即核验' }}
    </button>
    <button v-if="results.length" type="button" class="btn btn-ghost" @click="results = []">清空记录</button>
  </div>

  <h3 class="section-title">核验记录（当前会话）</h3>
  <DataTable :columns="columns" :rows="results" />
</template>

<style scoped>
.verify-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.verify-bar .form-input {
  flex: 1;
  min-width: 260px;
}
</style>
