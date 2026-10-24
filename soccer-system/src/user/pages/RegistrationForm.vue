<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import type { FormField } from '../../components/common/types'
import {
  createRegistration,
  errMsg,
  fetchTournaments,
} from '../../api/registration'
import { fetchMyTeam, type ApiTeam } from '../../api/team'
import type { ApiTournamentOption } from '../../api/registration'

// 赛事报名表单（仅球队负责人可见）：选择赛事提交报名表，提交后进入市州初审流程。
// 参赛球队固定为本人的球队，组别随球队带出；球员信息在「球队成员」页维护。

const router = useRouter()

const myTeam = ref<ApiTeam | null>(null)
const tournaments = ref<ApiTournamentOption[]>([])
const loaded = ref(false)
const submitting = ref(false)

const formFields = computed<FormField[]>(() => [
  { key: 'tournament', label: '报名赛事', type: 'select', options: tournaments.value.map((t) => t.name) },
  { key: 'teamName', label: '参赛球队', type: 'text', placeholder: myTeam.value ? myTeam.value.name : '请先在「球队信息」创建球队' },
  { key: 'group', label: '报名组别（随球队带出）', type: 'text', placeholder: myTeam.value ? myTeam.value.group_type_display : '—' },
  { key: 'leader', label: '领队姓名' },
  { key: 'phone', label: '联系电话', placeholder: '用于审核通知' },
  { key: 'playerCount', label: '参赛队员数', type: 'number', placeholder: '含替补' },
  { key: 'coach', label: '带队教练员' },
  { key: 'remark', label: '备注', type: 'textarea', placeholder: '其他需要说明的情况' },
])

onMounted(async () => {
  const [team, ts] = await Promise.all([fetchMyTeam(), fetchTournaments()])
  myTeam.value = team
  tournaments.value = ts ?? []
  loaded.value = true
})

async function onSubmit(data: Record<string, string>) {
  if (!myTeam.value) {
    alert('尚未创建球队：请先在「球队信息」页创建球队，再提交报名')
    return
  }
  const tName = data.tournament ?? ''
  const tournament = tournaments.value.find((t) => t.name === tName)
  if (!tournament) {
    alert('请选择报名赛事（后端不可用时无法提交）')
    return
  }
  const leader = (data.leader ?? '').trim()
  const phone = (data.phone ?? '').trim()
  const count = Number(data.playerCount ?? 0)
  if (!leader || !phone) {
    alert('请填写领队姓名和联系电话')
    return
  }
  if (!Number.isInteger(count) || count <= 0) {
    alert('参赛队员数应为正整数')
    return
  }
  submitting.value = true
  try {
    await createRegistration({
      tournament: tournament.id,
      team: myTeam.value.id,
      group_type: myTeam.value.group_type,
      leader_name: leader,
      phone,
      player_count: count,
      coach_name: (data.coach ?? '').trim(),
      remark: (data.remark ?? '').trim(),
    })
    alert('报名表提交成功！已进入市州初审流程，可在「我的报名」查看审核进度')
    router.push('/user/registrations')
  } catch (err) {
    alert(errMsg(err))
  } finally {
    submitting.value = false
  }
}

function onUpload() {
  alert('报名材料批量上传将在后续批次接入（需后端文件上传接口），当前可先在「球队成员」页维护球员名单')
}
</script>

<template>
  <PageHeader title="赛事报名" desc="填写赛事报名表单并提交，进入市州初审 → 省级终审流程（数据来自后端）" />

  <p v-if="loaded && !myTeam" class="page-tip warn-tip">
    尚未创建球队：请先在「球队信息」页创建球队，再提交报名。
  </p>

  <DataForm :fields="formFields" submit-text="提交报名表" @submit="onSubmit" />

  <h3 class="section-title">报名材料</h3>
  <p class="page-tip">
    球员名单请在「球队成员」页逐条报送（后端校验学籍）；盖章扫描件等材料上传将在后续批次接入。
  </p>
  <div class="upload-grid">
    <UploadBlock title="球员信息批量上传" desc="后续批次接入，当前请在「球队成员」页维护" @select="onUpload" />
    <UploadBlock title="球员照片批量上传" desc="打包 zip 上传，用于参赛证件制作（后续批次接入）" @select="onUpload" />
  </div>
</template>

<style scoped>
.warn-tip {
  background: #fdf6ec;
  color: #8a6d3b;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 14px;
}
</style>
