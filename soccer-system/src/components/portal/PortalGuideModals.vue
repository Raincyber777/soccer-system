<script setup lang="ts">
import AppModal from '../common/AppModal.vue'

// 门户功能说明弹窗（赛事报名 / 球队管理 / 信息公示）：由 PortalHeader 持有开关状态
// open 传当前要打开的说明 key，传 null 时全部关闭
defineProps<{
  open: 'registration' | 'team' | 'publicity' | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <!-- 功能入口弹窗：访客先了解流程，再引导登录 / 注册 -->
  <AppModal :open="open === 'registration'" title="赛事报名" @close="emit('close')">
    <p class="modal-lead">从组队到出赛的完整流程：</p>
    <ol class="flow-list">
      <li>球队负责人注册 / 登录，按学校标识码绑定所属学校</li>
      <li>在线填报赛事报名表，批量报送球员信息与照片</li>
      <li>上传盖章报名表、学籍验证等报名材料</li>
      <li>市州管理员初审 → 省级终审，审核进度实时可查</li>
      <li>审核通过进入公示，正式参赛</li>
    </ol>
    <p class="modal-tip">
      参赛组别：小学组 / 中学组 / 高中组 / 高校组（随学校学段自动限定）。
      报名属球队级操作，由球队负责人统一办理；队员可在「我的报名」查看进度。
    </p>
    <template #footer>
      <router-link to="/register" class="btn btn-ghost">去注册</router-link>
      <router-link to="/login" class="btn btn-primary">去登录</router-link>
    </template>
  </AppModal>

  <AppModal :open="open === 'team'" title="球队与人员管理" @close="emit('close')">
    <p class="modal-lead">球队与人员的日常维护：</p>
    <ul class="flow-list">
      <li>球队信息：绑定学校、参赛组别、队旗队徽与球队资料</li>
      <li>球员管理：负责人批量报送球员信息，运动员注册个人信息</li>
      <li>教练员：申报资质并上传等级证书，审核通过后带队参赛</li>
      <li>报名资料：盖章件导出与学籍验证材料上传</li>
    </ul>
    <p class="modal-tip">球队资料由球队负责人维护；运动员、教练员使用各自账号注册并维护个人信息。</p>
    <template #footer>
      <router-link to="/register" class="btn btn-ghost">去注册</router-link>
      <router-link to="/login" class="btn btn-primary">去登录</router-link>
    </template>
  </AppModal>

  <AppModal :open="open === 'publicity'" title="信息公示" @close="emit('close')">
    <p class="modal-lead">以下信息全部公开，无需登录即可浏览：</p>
    <ul class="flow-list">
      <li>赛程对阵与比赛结果（赛程赛果页）</li>
      <li>新闻动态与政策文件（新闻政策页）</li>
      <li>组别积分榜与射手榜（榜单页）</li>
    </ul>
    <p class="modal-tip">点击下方按钮直达对应公示页面；登录后可在用户端查看报名进度等个人信息。</p>
    <template #footer>
      <router-link to="/news" class="btn btn-ghost">新闻政策</router-link>
      <router-link to="/schedule" class="btn btn-ghost">赛程赛果</router-link>
      <router-link to="/rankings" class="btn btn-primary">赛事榜单</router-link>
    </template>
  </AppModal>
</template>

<style scoped>
/* 弹窗底部的胶囊按钮（与 PortalHeader 导航区按钮同款） */
.btn {
  padding: 8px 22px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.6;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-ghost {
  border: 1.5px solid var(--green);
  color: var(--green);
}

.btn-ghost:hover {
  background: var(--green-light);
  border-color: var(--green-dark);
}

.btn-primary {
  background: var(--green-dark);
  color: #fff;
  border: 1.5px solid var(--green-dark);
  box-shadow: 0 2px 8px rgba(15, 47, 32, 0.18);
}

.btn-primary:hover {
  background: var(--green-deeper);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 47, 32, 0.25);
}

/* ===== 弹窗内容 ===== */
.modal-lead {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.flow-list {
  margin: 10px 0 0;
  padding-left: 20px;
  display: grid;
  gap: 8px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--muted);
}

.modal-tip {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--green-light);
  font-size: 13px;
  line-height: 1.7;
  color: var(--green-dark);
}
</style>
