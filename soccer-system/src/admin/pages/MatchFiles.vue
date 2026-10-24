<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import AppSelect from '../../components/common/AppSelect.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'
import { errMsg, fetchAdminMatches } from '../../api/manage'
import { uploadCommonFile } from '../../api/registration'
import type { ApiMatch } from '../../api/types'

// 赛事文件管理：按场次上传签到表/记录集签字确认表/裁判员报告书。
// 后端暂无文件台账模型，走通用上传接口留档（返回地址），台账记录仅本会话可见。

const FILE_TYPES: { type: string; desc: string }[] = [
  { type: '赛事签到表', desc: '赛前双方球队签到表扫描件' },
  { type: '赛事记录集签字确认表', desc: '赛后双方教练员签字确认的比赛记录' },
  { type: '裁判员报告书', desc: '当值裁判组提交的比赛报告' },
]

const matches = ref<ApiMatch[]>([])
const selectedOption = ref('')
const matchOptions = computed(() =>
  matches.value.map((m) => `${m.group_type_display} ${m.round_name}：${m.home_team_name} vs ${m.away_team_name}`),
)
const currentMatch = computed(() => {
  const idx = matchOptions.value.indexOf(selectedOption.value)
  return idx >= 0 ? (matches.value[idx] ?? null) : null
})

const columns: TableColumn[] = [
  { key: 'match', label: '场次' },
  { key: 'type', label: '文件类型', width: '170px' },
  { key: 'name', label: '文件名' },
  { key: 'time', label: '上传时间', width: '160px' },
]

type FileRow = {
  match: string
  type: string
  name: string
  url: string
  time: string
}

const files = ref<FileRow[]>([])
const uploading = ref(false)

async function onUpload(type: string, file: File) {
  const match = currentMatch.value
  if (!match) {
    alert('请先选择对应场次')
    return
  }
  uploading.value = true
  try {
    const res = await uploadCommonFile(file, 'match-files')
    files.value.unshift({
      match: `${match.group_type_display} ${match.round_name}：${match.home_team_name} vs ${match.away_team_name}`.trim(),
      type,
      name: res.name || file.name,
      url: res.url,
      time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    })
  } catch (err) {
    alert(errMsg(err))
  } finally {
    uploading.value = false
  }
}

function onAction(action: string, row: Record<string, unknown>) {
  if (action !== '打开') return
  const r = row as unknown as FileRow
  if (r.url) window.open(r.url, '_blank')
}

onMounted(async () => {
  const list = await fetchAdminMatches()
  if (list) matches.value = list
})
</script>

<template>
  <PageHeader title="赛事文件管理" desc="按场次上传比赛签到表、记录集签字确认表与裁判员报告书" />

  <div class="match-picker">
    <AppSelect v-model="selectedOption" :options="matchOptions" placeholder="请先选择对应场次" />
  </div>
  <p class="page-tip">上传前请先选择对应场次；文件支持 PDF / 图片格式，单个文件不超过 20MB。当前后端仅做文件留存，台账记录在本页展示。</p>

  <div class="upload-grid">
    <UploadBlock v-for="f in FILE_TYPES" :key="f.type" :title="f.type" :desc="f.desc" @select="(file) => onUpload(f.type, file)" />
  </div>

  <h3 v-if="files.length" class="section-title">已上传文件</h3>
  <DataTable v-if="files.length" :columns="columns" :rows="files" :actions="['打开']" @action="onAction" />
</template>

<style scoped>
.match-picker {
  max-width: 480px;
  margin-bottom: 12px;
}
</style>
