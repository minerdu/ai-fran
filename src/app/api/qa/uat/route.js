import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * UAT 验收清单
 * 
 * 供 PD 组织验收签字使用，覆盖 M1/M2/M3 全部里程碑验收项。
 */
export async function GET() {
  const checklist = {
    generatedAt: new Date().toISOString(),
    version: '1.0',
    title: 'AI 招商 Growth OS — UAT 验收清单',

    milestones: [
      {
        id: 'M1',
        title: '里程碑 1：核心闭环',
        deadline: '第 8 周',
        items: [
          { id: 'M1-01', category: '导航', title: '5 Tab 底部导航可用', expected: '线索/工作流/AI招商/审批/我的 五个 Tab 可正常切换', status: 'ready' },
          { id: 'M1-02', category: '导航', title: '桌面端双栏布局', expected: '宽屏自动切换为左侧导航+右侧内容双栏', status: 'ready' },
          { id: 'M1-03', category: 'AI 招商', title: 'AI 招商首页', expected: '显示 Dashboard、推荐动作、运行中 Agent、最近指令', status: 'ready' },
          { id: 'M1-04', category: 'AI 招商', title: '下达指令→返回结果卡', expected: '输入自然语言指令，返回结构化结果卡', status: 'ready' },
          { id: 'M1-05', category: '线索', title: '线索首页', expected: '展示线索列表，支持三态筛选（线索池/待建档/已建档）', status: 'ready' },
          { id: 'M1-06', category: '线索', title: '线索详情', expected: '展示基础档案、AI 摘要、评分雷达图、阶段历史、状态机可视化', status: 'ready' },
          { id: 'M1-07', category: '线索', title: '线索时间线', expected: '展示完整交互时间线（企微/电话/事件/AI评分/AI动作）', status: 'ready' },
          { id: 'M1-08', category: '审批', title: '审批首页', expected: '展示待审批/已通过/已驳回列表，支持批量审批、全选', status: 'ready' },
          { id: 'M1-09', category: '审批', title: '审批详情', expected: '展示替代方案、阈值调整、审批说明、到期倒计时', status: 'ready' },
          { id: 'M1-10', category: '闭环', title: 'AI→审批闭环', expected: 'AI 指令触发审批→审批通过→Run 恢复→结果回写', status: 'ready' },
        ],
      },
      {
        id: 'M2',
        title: '里程碑 2：工作流全模块',
        deadline: '第 14 周',
        items: [
          { id: 'M2-01', category: '工作流', title: '工作流首页', expected: '四模块（方案/会务/裂变/执行）+ 四看板 + 日历', status: 'ready' },
          { id: 'M2-02', category: '会务', title: '会务中心首页', expected: '展示活动列表、邀约批次、签到摘要', status: 'ready' },
          { id: 'M2-03', category: '会务', title: '活动详情', expected: '展示签到、会后催签、邀约拨打中态', status: 'ready' },
          { id: 'M2-04', category: '裂变', title: '裂变中心首页', expected: '展示裂变规则列表、反作弊规则', status: 'ready' },
          { id: 'M2-05', category: '裂变', title: '裂变详情', expected: '展示规则配置、物料生成、结算账本', status: 'ready' },
          { id: 'M2-06', category: '执行', title: 'Run 轨迹页', expected: '展示步骤时间线、审批断点、父子关系树', status: 'ready' },
          { id: 'M2-07', category: '方案', title: 'Playbook Studio', expected: '展示方案列表、方案对比、策略预测', status: 'ready' },
          { id: 'M2-08', category: '跳转', title: '跨对象跳转', expected: '工作流↔审批↔线索↔AI 招商可互相跳转', status: 'ready' },
        ],
      },
      {
        id: 'M3',
        title: '里程碑 3：全模块 + 治理',
        deadline: '第 20 周',
        items: [
          { id: 'M3-01', category: '我的', title: '我的首页', expected: '展示状态总览、设置入口列表', status: 'ready' },
          { id: 'M3-02', category: 'Skill', title: 'Skill 中心', expected: '三维度 Tab（招商环节/行业/企业管理）+ 环境过滤', status: 'ready' },
          { id: 'M3-03', category: 'Skill', title: 'Skill 详情', expected: '展示能力项、连接器依赖、环境分布、风险提示', status: 'ready' },
          { id: 'M3-04', category: '品牌', title: '品牌建模', expected: '展示事实卡、缺失上下文、招商策略字段、标杆案例、AI 抽取', status: 'ready' },
          { id: 'M3-05', category: '引擎', title: '自主招商引擎', expected: '9 阶段配置 + SVG 图标 + 自动化率展示', status: 'ready' },
          { id: 'M3-06', category: '报告', title: 'AI 报告', expected: '漏斗可视化、归因分析、优化建议', status: 'ready' },
          { id: 'M3-07', category: '设置', title: 'AI 招商顾问设置', expected: '颜色分区 section + AI 生成 + 快速导入', status: 'ready' },
          { id: 'M3-08', category: '设置', title: 'AI 大模型与知识库', expected: 'Gemini/Kimi + 上下文记忆 + 回复设置 + API 测试', status: 'ready' },
          { id: 'M3-09', category: '沟通', title: '群沟通页', expected: '企微好友/招商群/资料外发三 Tab', status: 'ready' },
          { id: 'M3-10', category: '稳定性', title: 'Agent 全链路稳定性', expected: '5 类 Agent 状态机校验 + 审批恢复 + 覆盖度 + 重试策略', status: 'ready' },
          { id: 'M3-11', category: '回归', title: 'SSE/状态机/审计回归', expected: '7 个命名事件 + Lead/Approval 状态机 + 审计完整性 + 恢复链路', status: 'ready' },
          { id: 'M3-12', category: '联调', title: 'CRM/企微联调准备', expected: 'CRM/企微配置持久化 + 测试接口 + readiness 聚合', status: 'ready' },
          { id: 'M3-13', category: '联调', title: '电话/短信/邮件联调', expected: '需真实 API 凭证', status: 'blocked', blockedBy: '第三方 API 凭证' },
        ],
      },
    ],

    qaEndpoints: [
      { path: '/api/qa/smoke', description: 'Smoke 测试（9 项 BFF 聚合验证）' },
      { path: '/api/qa/regression', description: '回归矩阵（端到端用例定义）' },
      { path: '/api/qa/performance', description: '性能基准（P95 延迟验证）' },
      { path: '/api/qa/execute', description: '全量执行入口（smoke + regression + performance）' },
      { path: '/api/qa/agent-stability', description: 'Agent 全链路稳定性校验' },
      { path: '/api/qa/full-chain', description: '外部渠道全链路回归（SSE/状态机/审计/恢复）' },
      { path: '/api/qa/uat', description: 'UAT 验收清单' },
    ],

    signoff: {
      productOwner: { name: '', signedAt: null },
      techLead: { name: '', signedAt: null },
      qaLead: { name: '', signedAt: null },
    },
  };

  return NextResponse.json(checklist);
}
