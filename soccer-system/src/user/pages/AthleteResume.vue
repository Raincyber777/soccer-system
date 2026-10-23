<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import type { TableColumn } from '../../components/common/types'

// 运动员履历管理（对应需求：所属队伍信息 / 必传参赛材料 / 选传履历材料 / 获奖经历）
const teamColumns: TableColumn[] = [
  { key: 'team', label: '所属球队' },
  { key: 'group', label: '组别', width: '100px' },
  { key: 'time', label: '起止时间', width: '200px' },
  { key: 'status', label: '状态', width: '100px' },
]

const teamRows = [
  { team: '实验中学足球队', group: '中学组', time: '2024-09 ~ 至今', status: '已生效' },
  { team: '市青少年足球俱乐部 U15', group: 'U15', time: '2022-03 ~ 2024-06', status: '已归档' },
]

const awards = [
  { key: 'award', label: '获奖经历' },
]

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}

function onUpload() {
  alert('【演示】文件上传：待接入后端')
}
</script>

<template>
  <PageHeader title="运动员履历" desc="维护所属队伍信息，上传参赛资格材料并完善个人履历" />

  <h3 class="section-title">所属队伍信息</h3>
  <DataTable
    :columns="teamColumns"
    :rows="teamRows"
    :actions="['修改']"
    @action="onAction"
  />

  <h3 class="section-title">获奖经历</h3>
  <div class="card">
    <textarea
      class="award-input"
      rows="3"
      placeholder="按「年份 + 赛事名称 + 名次」填写，如：2025 年省中学生运动会足球项目 冠军"
    ></textarea>
    <div class="award-actions">
      <button type="button" class="btn btn-primary" @click="onAction('保存获奖经历')">保存</button>
    </div>
  </div>

  <p class="page-tip">
    必传材料直接关系报名资格与上场审核，请确保扫描件清晰、信息完整；选传材料用于个人履历与球员遴选参考，有则上传。
  </p>

  <h3 class="section-title">必传材料（资格审核）</h3>
  <div class="upload-grid">
    <UploadBlock title="学生学籍证明" desc="学籍表或学校开具的学籍证明扫描件" @select="onUpload" />
    <UploadBlock title="身份证明材料" desc="身份证或户口本本人页扫描件" @select="onUpload" />
    <UploadBlock title="体检与保险材料" desc="体检报告或健康承诺书、意外伤害险保单" @select="onUpload" />
    <UploadBlock title="监护人知情同意书" desc="未成年队员需监护人签字确认" @select="onUpload" />
  </div>

  <h3 class="section-title">选传材料（履历与遴选参考）</h3>
  <div class="upload-grid">
    <UploadBlock title="获奖证书或证明" desc="获奖证书、成绩证明扫描件" @select="onUpload" />
    <UploadBlock title="参与赛事情况" desc="参赛秩序册、成绩册等证明材料" @select="onUpload" />
    <UploadBlock title="运动员等级证书" desc="有则上传，多用于高校高水平运动队招生" @select="onUpload" />
    <UploadBlock title="其他证明材料" desc="上场资格相关的其他证明" @select="onUpload" />
  </div>
</template>

<style scoped>
.award-input {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  resize: vertical;
}

.award-input:focus {
  border-color: var(--green);
}

.award-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
