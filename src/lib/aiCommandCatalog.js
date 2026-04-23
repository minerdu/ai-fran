export const AI_COMMAND_PROTOCOL_VERSION = '2026-04-21.v1';

export const AI_COMMAND_INTENTS = [
  {
    key: 'lead_filter_and_invite',
    label: '线索筛选与邀约',
    type: 'single',
    triggerExamples: ['筛出华南区高意向加盟商，安排总部考察', '把高预算线索分配给广州团队'],
    returnFields: ['intent', 'type', 'filter', 'action', 'summary'],
  },
  {
    key: 'approval_query',
    label: '审批查询与汇总',
    type: 'single',
    triggerExamples: ['汇总 24 小时内即将到期的审批', '找出高风险待审批项'],
    returnFields: ['intent', 'type', 'filter', 'action', 'summary'],
  },
  {
    key: 'playbook_generate',
    label: '招商方案生成',
    type: 'single',
    triggerExamples: ['生成华南区 Q2 的 3 套招商方案', '为杭州区域生成稳健型招商策略'],
    returnFields: ['intent', 'type', 'filter', 'action', 'summary'],
  },
  {
    key: 'asset_delivery',
    label: '资料外发与内容包',
    type: 'single',
    triggerExamples: ['给张国栋发送加盟手册和 ROI 测算表', '向沉默线索批量外发同城案例'],
    returnFields: ['intent', 'type', 'filter', 'action', 'summary'],
  },
  {
    key: 'sop_workflow',
    label: '多步 SOP 编排',
    type: 'sop',
    triggerExamples: ['把沉默超过 7 天的线索做 3 步唤醒 SOP', '连续跟进一周，推进签约'],
    returnFields: ['intent', 'type', 'filter', 'sop_schedule', 'needApproval', 'summary'],
  },
];

export const AI_COMMAND_QUICK_ACTIONS = [
  '筛出华南区高意向加盟商，安排总部考察',
  '把沉默超过 7 天的线索做 3 步唤醒 SOP',
  '汇总 24 小时内即将到期的审批',
  '给谈判中的线索生成本周签约推进动作',
  '向高意向线索发起报价审批',
  '生成华南区 Q2 的 3 套招商方案',
];

export function getAiCommandCatalog() {
  return {
    version: AI_COMMAND_PROTOCOL_VERSION,
    currentTabFields: ['current_tab', 'workspace_id', 'brand_id'],
    quickActions: AI_COMMAND_QUICK_ACTIONS,
    intents: AI_COMMAND_INTENTS,
    resultContract: {
      success: 'boolean',
      type: 'text | workflow | sop_workflow',
      command: {
        id: 'string',
        input: 'string',
        intent: 'string',
        status: 'completed | pending_approval | failed',
        resultType: 'string',
        resultSummary: 'string',
        linkedObjects: 'array',
        execution: 'object',
        context: 'object',
      },
    },
  };
}
