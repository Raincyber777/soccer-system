<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import type { FormField } from '../../components/common/types'

// 赛事报名表单（对应需求：填写赛事报名表单 / 报送球员信息 / 球员信息与照片批量上传）
const formFields: FormField[] = [
  { key: 'tournament', label: '报名赛事', type: 'select', options: ['2026 省青少年校园足球联赛（秋季）', '2026 省青少年足球冠军杯'] },
  { key: 'group', label: '报名组别', type: 'select', options: ['小学组', '中学组', '高中组', '高校组'] },
  { key: 'teamName', label: '参赛球队名称', placeholder: '如：实验中学足球队' },
  { key: 'city', label: '所属市州', type: 'select', options: ['贵阳市', '遵义市', '安顺市', '六盘水市', '毕节市', '铜仁市'] },
  { key: 'leader', label: '领队姓名' },
  { key: 'phone', label: '联系电话', placeholder: '用于审核通知' },
  { key: 'playerCount', label: '参赛队员数', type: 'number', placeholder: '含替补' },
  { key: 'coach', label: '带队教练员' },
  { key: 'remark', label: '备注', type: 'textarea', placeholder: '其他需要说明的情况' },
]

function onSubmit(data: Record<string, string>) {
  console.log('报名表单数据：', data)
  alert('【演示】报名表已提交，待接入后端保存')
}

function onUpload() {
  alert('【演示】文件上传：待接入后端')
}
</script>

<template>
  <PageHeader title="赛事报名" desc="填写赛事报名表单，并批量报送球员信息与球员照片" />

  <DataForm :fields="formFields" submit-text="提交报名表" @submit="onSubmit" />

  <h3 class="section-title">球员信息报送</h3>
  <p class="page-tip">
    球员信息请先下载 Excel 模板填写后批量上传；球员照片请按「姓名+身份证号」命名后打包为 zip 上传。
  </p>
  <div class="upload-grid">
    <UploadBlock title="球员信息批量上传" desc="支持 Excel 模板批量导入球员名单" @select="onUpload" />
    <UploadBlock title="球员照片批量上传" desc="打包 zip 上传，用于参赛证件制作" @select="onUpload" />
  </div>
</template>
