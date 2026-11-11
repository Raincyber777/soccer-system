<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import GuideSteps from '../../components/common/GuideSteps.vue'

// 校级管理员使用说明：从登录到比赛运营、人员维护、报名与设备联调的完整指引
const steps = [
  {
    title: '登录管理员端',
    desc: '校级管理员与普通管理员、超级管理员共用 /admin/login 入口，使用学校分配的账号登录（不开放注册）。登录后进入「校级工作台」，所有页面只展示本校数据，跨校操作会被服务端拒绝。',
  },
  {
    title: '发布校级赛事',
    desc: '在「校级赛事」创建本校比赛，填写赛事名称、组别与报名起止时间。创建后先「发布」，发布后自动开放报名；报名期间可随时关闭或重新开放报名，已结束的赛事可下架。',
  },
  {
    title: '举办本校比赛',
    desc: '在「本校比赛」点击举办比赛，至少一支参赛球队须属于本校。未开始的比赛可以编辑与删除；开赛后可录入数据；已结束的比赛自动锁定。',
  },
  {
    title: '维护比赛数据',
    desc: '进入比赛运营后，先在「比分与阶段」切换上半场 / 中场休息 / 下半场；「比赛事件」录入进球、红黄牌、换人与文字，进球会自动联动比分；「首发阵容」最多 11 人并做球衣号与姓名查重。',
  },
  {
    title: '配置裁判、文件与直播',
    desc: '「裁判配置」最多 4 人（主裁 1、助理裁判 2、第四官员 1）；「赛事文件」上传签到表、记录确认单、裁判报告单；「直播链接」保存后同步到门户比赛详情。',
  },
  {
    title: '计分板与手机端上传',
    desc: '「计分板接入」绑定设备后可生成专用端口密钥，由现场计分板推送比分与阶段；「手机端上传」链接可在手机浏览器打开，用于现场快速记分、录事件与撤销误操作。',
  },
  {
    title: '维护球队与人员',
    desc: '「本校球队」查看球队完善度；「本校人员」为每支球队维护教练组与球员名单，支持批量上传（每行：姓名,身份证号,出生日期,位置,球衣号）。教练至少 1 名、球员至少 5 名才满足报名资格。',
  },
  {
    title: '查看与代报名',
    desc: '「本校报名」只展示本校球队的报名记录。可代本校球队提交报名，报名前需球队资料完善；被上级驳回的记录会显示原因，可修改后重新提交。',
  },
  {
    title: '查看本校数据',
    desc: '「本校数据」按最近一周、最近一月或全部时间统计比赛场次、进球、助攻与红黄牌，并支持按球队、比赛（对手）筛选；「AI 比赛报告」在比赛结束后自动生成并同步门户新闻。',
  },
]

const errors = [
  { code: '20004', desc: '跨校操作或账号未绑定学校：检查当前账号是否属于本校。' },
  { code: '40002', desc: '比赛状态不允许该操作：已结束比赛只读，阶段只能向前推进。' },
  { code: '40009', desc: '数据版本冲突：阵容等信息已被其他页面更新，刷新后重试。' },
  { code: '10001', desc: '参数不合法：检查比分范围、球员姓名、文件格式等输入。' },
  { code: '5109', desc: '球队信息未完善：先补齐教练与球员名单再报名。' },
  { code: '5110', desc: '重复报名：同一球队不能重复报名同一赛事。' },
]
</script>

<template>
  <div class="page-root">
  <PageHeader title="使用说明" desc="校级管理员操作指引：本校赛事、比赛运营、人员与报名" />

  <h3 class="section-title">操作流程</h3>
  <GuideSteps :steps="steps" />

  <h3 class="section-title">常见提示与处理</h3>
  <div class="error-card">
    <div v-for="item in errors" :key="item.code" class="error-row">
      <span class="error-code">{{ item.code }}</span>
      <span class="error-desc">{{ item.desc }}</span>
    </div>
  </div>

  <p class="page-tip">
    提示：校级端聚焦赛事发布、比赛数据与人员报名，不包含摄像设备、ESP32 联调、AI 进球审核等专业赛事运营功能；
    相关设备与审核由赛事管理员统一负责。校级账号只能访问管理员端的「校级」菜单，数据范围互不影响。
  </p>
  </div>
</template>

<style scoped>
.error-card {
  padding: 6px 20px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(20, 60, 40, 0.05);
}

.error-row {
  display: flex;
  gap: 14px;
  padding: 11px 0;
  font-size: 13px;
  line-height: 1.7;
}

.error-row + .error-row {
  border-top: 1px dashed var(--line);
}

.error-code {
  flex: 0 0 64px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-weight: 700;
  color: #a3312a;
}

.error-desc {
  color: var(--ink);
}
</style>
