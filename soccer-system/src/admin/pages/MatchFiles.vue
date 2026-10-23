<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'

// 赛事文件管理（对应需求：上传签到表 / 记录集签字确认表 / 裁判员报告书）
function onUpload() {
  alert('【演示】文件上传：待接入后端')
}
</script>

<template>
  <PageHeader title="赛事文件管理" desc="按场次上传比赛签到表、记录集签字确认表与裁判员报告书" />

  <p class="page-tip">上传前请先选择对应场次；文件支持 PDF / 图片格式，单个文件不超过 20MB。</p>

  <div class="upload-grid">
    <UploadBlock title="赛事签到表" desc="赛前双方球队签到表扫描件" @select="onUpload" />
    <UploadBlock title="赛事记录集签字确认表" desc="赛后双方教练员签字确认的比赛记录" @select="onUpload" />
    <UploadBlock title="裁判员报告书" desc="当值裁判组提交的比赛报告" @select="onUpload" />
  </div>
</template>
