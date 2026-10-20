<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import type { FormField } from '../../components/common/types'

// 教练员注册与个人信息（对应需求：教练员注册表单 / 个人信息 / 个人中心 / 修改个人信息）
const formFields: FormField[] = [
  { key: 'name', label: '姓名' },
  { key: 'gender', label: '性别', type: 'select', options: ['男', '女'] },
  { key: 'birth', label: '出生日期', type: 'date' },
  { key: 'idCard', label: '身份证号' },
  { key: 'phone', label: '联系电话' },
  { key: 'unit', label: '执教单位' },
  { key: 'years', label: '执教年限', type: 'number' },
  { key: 'level', label: '教练员等级', type: 'select', options: ['亚足联/国际足联A级', '亚足联B级', '亚足联C级', '中国足协D级', '无等级'] },
  { key: 'category', label: '人员类别', type: 'select', options: ['专职教练员', '体育教师兼任', '社会足球从业者', '其他'] },
  { key: 'remark', label: '个人简介', type: 'textarea', placeholder: '执教经历、带队成绩等' },
]

function onSubmit(data: Record<string, string>) {
  console.log('教练员信息：', data)
  alert('【演示】信息已保存，待接入后端')
}
</script>

<template>
  <PageHeader title="教练员注册与信息" desc="填写教练员注册表单，完善后在个人中心可随时修改" />

  <DataForm :fields="formFields" submit-text="保存个人信息" @submit="onSubmit" />
</template>
