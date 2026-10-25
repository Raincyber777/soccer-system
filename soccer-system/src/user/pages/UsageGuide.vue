<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth, personaLabels, type UserPersona } from '../../stores/auth'
import PageHeader from '../../components/common/PageHeader.vue'
import GuideSteps from '../../components/common/GuideSteps.vue'

// 用户端使用说明按身份拆成三份：能看到本页说明已登录，直接从业务动作讲起，不教注册登录。
// 同一个组件被三条路由共用（/user/usage-guide 等），内容由路由 meta.persona 决定；
// 路由 meta.personas 限定可见身份，守卫保证学生进不了教练的说明页
interface GuideStepItem {
  title: string
  desc: string
}
interface GuideData {
  title: string
  desc: string
  steps: GuideStepItem[]
}

const GUIDES: Record<UserPersona, GuideData> = {
  leader: {
    title: '使用说明 · 球队负责人',
    desc: '你的专属指引：从建队到代表学校报名参赛',
    steps: [
      {
        title: '完善球队信息',
        desc: '在「我的球队 → 球队信息」填写球队名称、队徽队旗、所属学校与参赛组别；球队资料越完整，越容易通过审核。',
      },
      {
        title: '添加队员与教练',
        desc: '在「队员列表」「教练列表」中添加本队队员与教练员；学生和教练会在各自的端上完善学籍与资质材料。',
      },
      {
        title: '报名赛事',
        desc: '在「赛事报名」选择赛事与组别，在线填写报名表并上传报名资料；提交后在「我的报名」随时跟踪进度。',
      },
      {
        title: '处理审核反馈',
        desc: '报名被驳回时，在「报名审核信息」查看驳回原因，按要求修改材料后重新提交即可。',
      },
      {
        title: '个人中心与账号安全',
        desc: '维护基础信息、修改登录密码；在公共场所使用后记得退出登录。',
      },
    ],
  },
  student: {
    title: '使用说明 · 学生运动员',
    desc: '你的专属指引：把个人履历建完整，随队参赛',
    steps: [
      {
        title: '完善注册信息',
        desc: '在「运动员中心 → 注册与信息」核对姓名、学校、年级等个人信息，并上传学籍证明材料。',
      },
      {
        title: '上传证书与获奖记录',
        desc: '在「运动员履历」上传等级证书、获奖证书并记录上场经历；履历完整的运动员更容易入选参赛名单。',
      },
      {
        title: '加入球队',
        desc: '由本队负责人在「队员列表」中把你加入球队；如果还没有入队，请联系球队负责人。',
      },
      {
        title: '查看公示',
        desc: '在「信息公示」查询自己的公示状态、赛程对阵与赛果。',
      },
      {
        title: '个人中心与账号安全',
        desc: '维护联系方式、修改登录密码；在公共场所使用后记得退出登录。',
      },
    ],
  },
  coach: {
    title: '使用说明 · 教练员',
    desc: '你的专属指引：资质维护与信息确认',
    steps: [
      {
        title: '维护执教资质',
        desc: '在「教练员中心 → 注册与信息」填写执教经历，上传教练员证书等资质材料。',
      },
      {
        title: '确认个人信息',
        desc: '核对联系方式与身份信息，确保对外公示内容准确无误。',
      },
      {
        title: '加入球队',
        desc: '由本队负责人在「教练列表」中把你加入球队；执教多支球队时请分别确认。',
      },
      {
        title: '个人中心与账号安全',
        desc: '维护基础信息、修改登录密码；在公共场所使用后记得退出登录。',
      },
    ],
  },
}

const route = useRoute()
const auth = useAuth()

const persona = computed<UserPersona>(() => {
  const p = route.meta.persona as UserPersona | undefined
  return p ?? auth.state.persona ?? 'leader'
})
const guide = computed(() => GUIDES[persona.value])
const personaLabel = computed(() => personaLabels[persona.value])
</script>

<template>
  <PageHeader :title="guide.title" :desc="guide.desc" />

  <h3 class="section-title">操作流程（{{ personaLabel }}）</h3>
  <GuideSteps :steps="guide.steps" />

  <p class="page-tip">提示：使用中遇到账号或审核问题，可联系学校管理员协助处理。</p>
</template>
