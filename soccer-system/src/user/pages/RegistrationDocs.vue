<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import AppIcon from '../../components/common/AppIcon.vue'

// 报名资料管理（对应需求：报名表PDF导出 / 盖章扫描件上传 / 学籍验证材料上传）
function onExport() {
  alert('【演示】报名表 PDF 导出：待接入后端生成')
}

function onUpload() {
  alert('【演示】文件上传：待接入后端')
}
</script>

<template>
  <PageHeader title="报名资料管理" desc="导出报名表 PDF、上传盖章扫描件与球员学籍验证材料" />

  <p class="page-tip">
    流程：先在「我的报名」中选择报名记录导出 PDF → 打印盖章 → 扫描后在本页上传，学籍验证材料由学校统一出具。
  </p>

  <div class="upload-grid">
    <div class="export-card">
      <span class="icon"><AppIcon name="file-text" :size="26" /></span>
      <p class="title">赛事报名表 PDF 导出</p>
      <p class="desc">选择已填写的报名记录，生成正式报名表 PDF</p>
      <button type="button" class="btn btn-primary" @click="onExport">导出 PDF</button>
    </div>
    <UploadBlock title="盖章扫描件上传" desc="上传打印盖章后的报名表扫描件（PDF/图片）" @select="onUpload" />
    <UploadBlock title="球员学籍信息验证材料上传" desc="上传学籍表或学籍证明扫描件，用于资格核验" @select="onUpload" />
    <div class="export-card done">
      <span class="icon"><AppIcon name="circle-check" :size="26" /></span>
      <p class="title">资料齐全校验</p>
      <p class="desc">提交后将自动检查 PDF、盖章件、学籍材料是否齐全</p>
      <button type="button" class="btn btn-ghost" @click="onExport">开始校验</button>
    </div>
  </div>
</template>

<style scoped>
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
</style>
