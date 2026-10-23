<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import SchoolSelect from '../../components/common/SchoolSelect.vue'
import type { FormField } from '../../components/common/types'
import type { SchoolInfo } from '../../data/sichuan-schools'
import { todayStr } from '../../utils/date'

// 运动员注册与个人信息（对应需求：运动员注册表单 / 个人信息 / 数据匹配 / 信息确认）
// 所在学校统一通过「学校标识码」选择，避免重名错填；提交后按学校 + 身份证/学籍号做学籍数据匹配
const school = ref<SchoolInfo | null>(null)

const formFields: FormField[] = [
  { key: 'name', label: '姓名' },
  { key: 'gender', label: '性别', type: 'select', options: ['男', '女'] },
  { key: 'birth', label: '出生日期', type: 'date', max: todayStr() },
  { key: 'idCard', label: '身份证号', placeholder: '用于学籍数据匹配' },
  { key: 'school', label: '所在学校', type: 'custom' },
  { key: 'grade', label: '年级', type: 'select', options: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三'] },
  { key: 'studentNo', label: '学籍号' },
  { key: 'position', label: '场上位置', type: 'select', options: ['守门员', '后卫', '中场', '前锋'] },
  { key: 'shirtNo', label: '球衣号码', type: 'number' },
  { key: 'phone', label: '联系电话' },
  { key: 'remark', label: '个人简介', type: 'textarea', placeholder: '踢球经历、擅长位置等' },
]

function onSubmit(data: Record<string, string>) {
  console.log('运动员信息：', { ...data, schoolCode: school.value?.code ?? '' })
  alert('【演示】信息已提交，学籍数据匹配与确认流程待接入后端')
}
</script>

<template>
  <PageHeader title="运动员注册与信息" desc="填写运动员注册表单，系统将自动匹配学籍数据，确认后进入公示" />

  <p class="page-tip">
    提交后系统会按身份证号 / 学籍号进行「运动员数据匹配」，匹配结果请在下方确认；信息确认前可反复修改。
  </p>

  <DataForm :fields="formFields" submit-text="保存并提交匹配" @submit="onSubmit">
    <template #field-school>
      <SchoolSelect v-model="school" />
    </template>
  </DataForm>
</template>
