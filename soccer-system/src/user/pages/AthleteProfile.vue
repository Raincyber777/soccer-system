<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import type { FormField } from '../../components/common/types'
import { errMsg, fetchMe, updateMe } from '../../api/account'
import { uploadCommonFile } from '../../api/registration'

// 运动员信息：账户基础资料由本人维护（PATCH /api/auth/me/）；
// 注册信息（身份证/年级/位置等）由所在学校球队负责人在「队员列表」录入，
// 本人可在「信息公示」查看公示结果；学籍等材料在此上传留存。

const baseFields: FormField[] = [
  { key: 'name', label: '姓名 / 单位名' },
  { key: 'phone', label: '联系电话' },
  { key: 'email', label: '邮箱' },
  { key: 'unit', label: '所属学校' },
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
    const r = await uploadCommonFile(file, 'athlete-files')
    files.value.unshift({ name: file.name, url: r.url })
    alert(`材料已上传：${r.url}\n可把链接提供给所在学校球队负责人，供注册与资格审核查验`)
  } catch (err) {
    alert(errMsg(err))
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <PageHeader title="运动员注册与信息" desc="维护本人联系方式，上传学籍与身份材料，注册信息由学校统一录入" />

  <p class="page-tip">
    注册信息（身份证号、年级、场上位置等）由所在学校球队负责人在「队员列表」中录入并提交审核；
    审核通过后可在「信息公示」查询。本页维护本人的账户资料，并上传学籍证明等材料留存备查。
  </p>

  <h3 class="section-title">账户基础信息</h3>
  <DataForm
    :key="formKey"
    :fields="baseFields"
    :initial="baseInitial"
    submit-text="保存"
    @submit="onSubmit"
  />

  <h3 class="section-title">上传注册辅助材料</h3>
  <div class="upload-grid">
    <UploadBlock
      title="学籍 / 身份材料上传"
      desc="学籍表、身份证扫描件等，JPG/PDF/ZIP，单件不超过 20MB"
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
