<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import { uploadCommonFile } from '../../api/registration'
import { errMsg } from '../../api/registration'

// 教练员履历：执教记录与各类证书上传留存（通用文件接口），
// 资质审核对照证书进行，通过后进入教练员信息公示。

const uploading = ref(false)
const files = ref<{ name: string; url: string; label: string }[]>([])

const SLOTS = [
  { key: 'record', title: '执教记录', desc: '执教队伍、时间与成绩说明' },
  { key: 'matches', title: '参与比赛记录', desc: '带队参加比赛的秩序册或成绩册' },
  { key: 'award', title: '获奖证书', desc: '个人或带队获奖证书扫描件' },
  { key: 'degree', title: '学历证明', desc: '最高学历证书扫描件' },
  { key: 'school', title: '学籍证明', desc: '在读期间学籍证明（如适用）' },
  { key: 'training', title: '参与培训记录', desc: '教练员培训班结业证明' },
  { key: 'teacher', title: '教师资格证', desc: '教师资格证书扫描件' },
  { key: 'cert', title: '亚足联/国际足联教练员证书', desc: '等级教练员证书扫描件' },
]

async function onUpload(slot: { key: string; title: string }, file: File) {
  uploading.value = true
  try {
    const r = await uploadCommonFile(file, `coach-${slot.key}`)
    files.value.unshift({ name: file.name, url: r.url, label: slot.title })
    alert(`「${slot.title}」已上传：${r.url}`)
  } catch (err) {
    alert(errMsg(err))
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <PageHeader title="教练员履历" desc="上传执教记录与各类证书，资质经审核通过后进入教练员信息公示" />

  <p class="page-tip">
    所属球队信息由球队负责人或管理员维护；本页上传的证书与记录经通用文件接口留存，
    请把生成链接提供给管理员对照审核资质。
  </p>

  <h3 class="section-title">履历与证书上传</h3>
  <div class="upload-grid">
    <UploadBlock
      v-for="s in SLOTS"
      :key="s.key"
      :title="s.title"
      :desc="s.desc"
      accept=".pdf,.jpg,.jpeg,.png,.zip"
      @select="(f: File) => onUpload(s, f)"
    />
  </div>

  <template v-if="files.length">
    <h3 class="section-title">已上传的材料（{{ files.length }}）</h3>
    <ul class="file-list">
      <li v-for="f in files" :key="f.url">
        <span class="label">{{ f.label }}</span>
        <a :href="f.url" target="_blank" rel="noopener">{{ f.name }}</a>
      </li>
    </ul>
  </template>
</template>

<style scoped>
.file-list {
  padding-left: 20px;
  font-size: 13px;
}

.file-list .label {
  color: var(--muted);
  margin-right: 8px;
}

.file-list a {
  color: var(--green);
}
</style>
