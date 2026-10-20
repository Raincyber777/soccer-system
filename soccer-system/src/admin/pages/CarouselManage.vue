<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'

// 赛事照片（轮播图）管理（对应需求：上传赛事轮播图 / 上传新闻跳转链接图片）
const columns: TableColumn[] = [
  { key: 'title', label: '图片标题' },
  { key: 'link', label: '跳转链接' },
  { key: 'sort', label: '排序', width: '80px' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows = [
  { title: '秋季联赛开幕图', link: 'https://portal.example.com/news/101', sort: 1, status: '已发布' },
  { title: '最佳阵容第一期', link: 'https://portal.example.com/news/102', sort: 2, status: '已发布' },
  { title: '联赛赞助商联合海报', link: '', sort: 3, status: '已下架' },
]

function onUpload() {
  alert('【演示】图片上传：待接入后端')
}

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}
</script>

<template>
  <PageHeader title="轮播图管理" desc="管理门户首页轮播图与新闻跳转链接图片" />

  <div class="upload-grid">
    <UploadBlock title="上传赛事轮播图" desc="建议尺寸 1920×500，JPG/PNG" @select="onUpload" />
    <UploadBlock title="上传新闻跳转链接图片" desc="轮播图点击后跳转的新闻封面图" @select="onUpload" />
  </div>

  <h3 class="section-title">轮播图列表</h3>
  <DataTable :columns="columns" :rows="rows" :actions="['修改', '删除']" @action="onAction" />
</template>
