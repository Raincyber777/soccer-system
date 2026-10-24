<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import { errMsg } from '../../api/registration'
import { uploadCommonFile } from '../../api/registration'

// 运动员履历：所属队伍由学校球队负责人维护（本页展示说明）；
// 必传材料关系报名资格与上场审核，选传材料用于履历与球员遴选参考。
// 材料经通用文件接口上传留存，上传后可把链接提供给球队负责人或审核人员。

const uploading = ref(false)
const files = ref<{ name: string; url: string; label: string }[]>([])

const MUST_SLOTS = [
  { key: 'xueji', title: '学生学籍证明', desc: '学籍表或学校开具的学籍证明扫描件' },
  { key: 'identity', title: '身份证明材料', desc: '身份证或户口本本人页扫描件' },
  { key: 'health', title: '体检与保险材料', desc: '体检报告或健康承诺书、意外伤害险保单' },
  { key: 'consent', title: '监护人知情同意书', desc: '未成年队员需监护人签字确认' },
]

const EXTRA_SLOTS = [
  { key: 'award', title: '获奖证书或证明', desc: '获奖证书、成绩证明扫描件' },
  { key: 'matches', title: '参与赛事情况', desc: '参赛秩序册、成绩册等证明材料' },
  { key: 'level', title: '运动员等级证书', desc: '有则上传，多用于高校高水平运动队招生' },
  { key: 'other', title: '其他证明材料', desc: '上场资格相关的其他证明' },
]

async function onUpload(slot: { key: string; title: string }, file: File) {
  uploading.value = true
  try {
    const r = await uploadCommonFile(file, `athlete-${slot.key}`)
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
  <PageHeader title="运动员履历" desc="上传参赛资格材料并完善个人履历，所属队伍信息由球队负责人维护" />

  <p class="page-tip">
    所属球队信息由所在学校球队负责人在「队员列表」中维护，公示后可在「信息公示」查询；
    本页上传的材料经通用文件接口留存，请把生成链接提供给球队负责人或审核人员查验。
  </p>

  <h3 class="section-title">必传材料（资格审核）</h3>
  <div class="upload-grid">
    <UploadBlock
      v-for="s in MUST_SLOTS"
      :key="s.key"
      :title="s.title"
      :desc="s.desc"
      accept=".pdf,.jpg,.jpeg,.png,.zip"
      @select="(f: File) => onUpload(s, f)"
    />
  </div>

  <h3 class="section-title">选传材料（履历与遴选参考）</h3>
  <div class="upload-grid">
    <UploadBlock
      v-for="s in EXTRA_SLOTS"
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
