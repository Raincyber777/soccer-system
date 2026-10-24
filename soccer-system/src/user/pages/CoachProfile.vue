<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import type { FormField } from '../../components/common/types'
import { errMsg, fetchMe, updateMe } from '../../api/account'
import { uploadCommonFile } from '../../api/registration'

// 教练员信息：账户基础资料由本人维护（PATCH /api/auth/me/）；
// 执教资质（等级/类别/身份证等）由管理员对照证书录入审核，
// 通过后进入信息公示；证书扫描件在此上传留存。

const baseFields: FormField[] = [
  { key: 'name', label: '姓名 / 单位名' },
  { key: 'phone', label: '联系电话' },
  { key: 'email', label: '邮箱' },
  { key: 'unit', label: '执教单位' },
]

const baseInitial = ref<Record<string, string>>({})
const formKey = ref(0)
const uploading = ref(false)
const files = ref<{ name: string; url: string }[]>([])

onMounted(async () => {
  const me = await fetchMe()
  if (!me) return
  baseInitial.value = { name: me.real_name, phone: me.phone, email: me.email, unit: me.unit_name }
  formKey.value++
})

async function onSubmit(data: Record<string, string>) {
  try {
    await updateMe({
      real_name: data.name?.trim() ?? '',
      phone: data.phone?.trim() ?? '',
      email: data.email?.trim() ?? '',
      unit_name: data.unit?.trim() ?? '',
    })
    alert('基础信息已保存')
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onUpload(file: File) {
  uploading.value = true
  try {
    const r = await uploadCommonFile(file, 'coach-files')
    files.value.unshift({ name: file.name, url: r.url })
    alert(`材料已上传：${r.url}\n可把链接提供给所在球队负责人或管理员，供资质审核查验`)
  } catch (err) {
    alert(errMsg(err))
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <PageHeader title="教练员注册与信息" desc="维护本人联系方式，上传教练员等级证书，资质经审核通过后公示" />

  <p class="page-tip">
    教练员等级、人员类别等资质信息由管理员对照证书录入并审核，通过后显示「已生效」并进入信息公示；
    资质未生效前不能作为带队报名的资格依据。本页维护本人的账户资料，并上传等级证书等扫描件留存。
  </p>

  <h3 class="section-title">账户基础信息</h3>
  <DataForm
    :key="formKey"
    :fields="baseFields"
    :initial="baseInitial"
    submit-text="保存"
    @submit="onSubmit"
  />

  <h3 class="section-title">上传资质材料</h3>
  <div class="upload-grid">
    <UploadBlock
      title="教练员证书上传"
      desc="等级证书、培训班结业证明等，JPG/PDF/ZIP，单件不超过 20MB"
      accept=".pdf,.jpg,.jpeg,.png,.zip"
      @select="onUpload"
    />
  </div>

  <template v-if="files.length">
    <h3 class="section-title">已上传的材料（{{ files.length }}）</h3>
    <ul class="file-list">
      <li v-for="f in files" :key="f.url">
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

.file-list a {
  color: var(--green);
}
</style>
