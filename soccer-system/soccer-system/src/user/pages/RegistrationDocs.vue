<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import AppIcon from '../../components/common/AppIcon.vue'
import AppSelect from '../../components/common/AppSelect.vue'
import {
  downloadRegistrationWord,
  errMsg,
  fetchRegistrationDetail,
  fetchRegistrations,
  uploadCommonFile,
  uploadRegistrationFile,
  type RegistrationList,
} from '../../api/registration'

// 报名资料管理：选择报名件后导出信息表、上传盖章扫描件（存报名件）、
// 上传学籍验证材料（通用文件接口）并一键校验资料齐全度。

const regs = ref<RegistrationList[]>([])
const regOptions = ref<string[]>([])
const selectedOpt = ref('')
const uploading = ref(false)
const studyFiles = ref<{ name: string; url: string }[]>([])

const selectedId = () => {
  const idx = regOptions.value.indexOf(selectedOpt.value)
  return idx >= 0 ? (regs.value[idx]?.id ?? null) : null
}

async function refresh() {
  const list = await fetchRegistrations()
  if (!list) return // 后端不可用：保持空选项
  regs.value = list
  regOptions.value = list.map((r) => `${r.tournament_name} · ${r.team_name}（${r.status_display}）`)
}

onMounted(refresh)

async function onExport() {
  const id = selectedId()
  if (!id) {
    alert('请先选择报名记录')
    return
  }
  const reg = regs.value.find((r) => r.id === id)
  try {
    await downloadRegistrationWord(id, reg?.team_name ?? '')
    alert('报名信息表已开始下载（CSV，Excel/WPS 可直接打开），打印盖章后回到本页上传扫描件')
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onUploadStamp(file: File) {
  const id = selectedId()
  if (!id) {
    alert('请先在上方选择报名记录')
    return
  }
  if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) {
    alert('盖章扫描件仅支持 PDF/JPG/PNG 格式')
    return
  }
  uploading.value = true
  try {
    await uploadRegistrationFile(id, 'stamp_file', file)
    alert('盖章扫描件已上传并关联到所选报名件')
  } catch (err) {
    alert(errMsg(err))
  } finally {
    uploading.value = false
  }
}

async function onUploadStudy(file: File) {
  uploading.value = true
  try {
    const r = await uploadCommonFile(file, 'student-files')
    studyFiles.value.unshift({ name: file.name, url: r.url })
    alert(`学籍验证材料已上传：${r.url}\n可将链接粘贴到报名件备注，供审核人员查验`)
  } catch (err) {
    alert(errMsg(err))
  } finally {
    uploading.value = false
  }
}

async function onCheck() {
  const id = selectedId()
  if (!id) {
    alert('请先选择报名记录')
    return
  }
  try {
    const d = await fetchRegistrationDetail(id)
    if (!d) {
      alert('获取报名详情失败，请确认后端服务可用')
      return
    }
    const items = [
      { label: '球员信息表', ok: !!d.player_excel },
      { label: '球员照片包', ok: !!d.photo_zip },
      { label: '盖章扫描件', ok: !!d.stamp_file },
    ]
    const missing = items.filter((i) => !i.ok).map((i) => i.label)
    alert(
      missing.length
        ? `「${d.team_name}」资料未齐全，缺少：${missing.join('、')}\n（球员信息表/照片包可在提交报名时上传，盖章件在本页上传）`
        : `「${d.team_name}」资料齐全：球员信息表、照片包、盖章扫描件均已上传 ✓`,
    )
  } catch (err) {
    alert(errMsg(err))
  }
}
</script>

<template>
  <PageHeader title="报名资料管理" desc="导出报名信息表、上传盖章扫描件与学籍验证材料，并校验资料齐全度" />

  <p class="page-tip">
    流程：选择报名记录导出信息表 → 打印盖章 → 扫描后在本页上传；学籍验证材料由学校统一出具后上传留存。
  </p>

  <div class="card reg-picker">
    <span class="picker-label">选择报名记录</span>
    <AppSelect v-model="selectedOpt" :options="regOptions" placeholder="请选择报名记录" />
    <button type="button" class="btn btn-ghost" :disabled="uploading" @click="refresh">刷新列表</button>
  </div>

  <div class="upload-grid">
    <div class="export-card">
      <span class="icon"><AppIcon name="file-text" :size="26" /></span>
      <p class="title">赛事报名信息表导出</p>
      <p class="desc">选择报名记录，导出含球员名单的正式信息表</p>
      <button type="button" class="btn btn-primary" @click="onExport">导出信息表</button>
    </div>
    <UploadBlock
      title="盖章扫描件上传"
      desc="上传打印盖章后的报名表扫描件（PDF/JPG/PNG），将关联到所选报名件"
      accept=".pdf,.jpg,.jpeg,.png"
      @select="onUploadStamp"
    />
    <UploadBlock
      title="球员学籍信息验证材料上传"
      desc="上传学籍表或学籍证明扫描件，用于资格核验留存"
      accept=".pdf,.jpg,.jpeg,.png,.zip"
      @select="onUploadStudy"
    />
    <div class="export-card done">
      <span class="icon"><AppIcon name="circle-check" :size="26" /></span>
      <p class="title">资料齐全校验</p>
      <p class="desc">检查所选报名件的信息表、照片包与盖章件是否齐全</p>
      <button type="button" class="btn btn-ghost" @click="onCheck">开始校验</button>
    </div>
  </div>

  <template v-if="studyFiles.length">
    <h3 class="section-title">已上传的学籍材料（{{ studyFiles.length }}）</h3>
    <ul class="study-list">
      <li v-for="f in studyFiles" :key="f.url">
        <a :href="f.url" target="_blank" rel="noopener">{{ f.name }}</a>
      </li>
    </ul>
  </template>
</template>

<style scoped>
.reg-picker {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.picker-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
}

.reg-picker :deep(.app-select) {
  flex: 1;
  min-width: 280px;
}

.export-card {
  background: #fff;
  border: 2px solid #bfd6c5;
  border-radius: 12px;
  padding: 24px 18px;
  text-align: center;
}

.export-card.done {
  border-style: solid;
}

.export-card .icon {
  width: 52px;
  height: 52px;
  margin: 0 auto;
  border-radius: 50%;
  background: var(--green-light);
  color: var(--green);
  display: flex;
  align-items: center;
  justify-content: center;
}

.export-card .title {
  margin-top: 8px;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}

.export-card .desc {
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}

.export-card .btn {
  margin-top: 12px;
}

.study-list {
  padding-left: 20px;
  font-size: 13px;
}

.study-list a {
  color: var(--green);
}
</style>
