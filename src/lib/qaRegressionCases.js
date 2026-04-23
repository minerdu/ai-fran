function makeCase(id, title, priority, path, expected) {
  return { id, title, priority, path, expected };
}

export function getQaRegressionMatrix() {
  return {
    generatedAt: new Date().toISOString(),
    smokeFocus: [
      makeCase('nav_5tabs', '5 Tab 导航可用性', 'P0', '/api/qa/smoke', '首页聚合接口全部返回成功'),
      makeCase('sse_stream', 'SSE 命名事件基础联通', 'P0', '/api/workflow/stream', '包含 analytics.snapshot.ready / event.attendance.updated / brand.facts.ready / skill.activated'),
      makeCase('qa_execute', 'QA 全量执行入口', 'P0', '/api/qa/execute', '返回 smoke、regression、performance、agentStability、fullChain 五组结果'),
    ],
    endToEnd: [
      makeCase('ai_command_mainline', '下达指令 -> 返回结果卡 -> 跳转对象', 'P0', '/ai/command-center', '指令返回 command 对象，存在 linkedObjects，可跳转线索/审批/方案'),
      makeCase('approval_resume', '命中审批 -> 审批通过 -> run 恢复', 'P0', '/approvals', '审批动作写审计，相关任务和 run 状态恢复'),
      makeCase('event_followup', '创建活动 -> 邀约序列 -> 签到 -> 会后跟进', 'P0', '/workflow/events', '活动详情展示邀约批次、签到摘要和会后催签卡'),
      makeCase('referral_closure', '创建裂变规则 -> 审批 -> 生成物料 -> 结算', 'P0', '/workflow/referrals', '裂变详情展示反作弊规则、物料生成批次和结算账本'),
      makeCase('brand_skill_loop', '资料导入 -> 事实卡 -> 推荐 Skill -> Skill 详情', 'P0', '/me', '品牌建模、知识库和 Skill 详情形成闭环'),
      makeCase('rule_report_loop', '改规则 -> 影响 AI 自动化边界 -> 生成报告', 'P1', '/me/agents', '红线规则、朋友圈智能体、报告异常解释同口径'),
      makeCase('integration_readiness', '渠道接入配置 -> 联调准备度总览 -> 单通道测试', 'P1', '/api/integrations/readiness', 'CRM/企微/电话/短信/邮件统一展示配置状态与测试结果'),
    ],
    agentStability: [
      makeCase('agent_state_machine', 'Agent Run 状态机转换校验', 'P0', '/api/qa/agent-stability', '所有 Run 状态在合法转换表内，无 critical/error 问题'),
      makeCase('agent_approval_recovery', 'Agent 审批断点恢复验证', 'P0', '/api/qa/agent-stability', '已决策审批对应的 Run 不应仍处于 paused_for_approval'),
      makeCase('agent_coverage', 'Agent 旅程环节覆盖度', 'P1', '/api/qa/agent-stability', '5 类 Agent 覆盖 9 个招商旅程环节'),
      makeCase('agent_audit_completeness', 'Agent 审计日志完整性', 'P1', '/api/qa/agent-stability', '6 种实体类型均有审计记录'),
      makeCase('agent_retry_backoff', 'Agent 重试与降级策略', 'P1', '/api/qa/agent-stability', '失败任务可重试 3 次，耗尽后写入审计日志'),
    ],
    fullChainRegression: [
      makeCase('sse_all_events', 'SSE 全量命名事件回归', 'P0', '/api/qa/full-chain', '7 个命名事件全部检测到或有合理缺省说明'),
      makeCase('lead_state_machine', '线索状态机合法性回归', 'P0', '/api/qa/full-chain', '所有线索阶段合法，回流路径（rejected→pool, silent→pool）已定义'),
      makeCase('approval_state_machine', '审批状态机合法性回归', 'P0', '/api/qa/full-chain', '所有审批状态合法，pending 有到期时间，决策态有时间戳'),
      makeCase('audit_regression', '审计日志回归', 'P0', '/api/qa/full-chain', '审计表可访问，覆盖多种实体类型，必要字段完整'),
      makeCase('recovery_regression', '恢复链路回归', 'P0', '/api/qa/full-chain', '已通过的审批对应 Run 不应仍暂停，已取消 Run 无遗留 pending 审批'),
    ],
    nonFunctional: [
      makeCase('dashboard_p95', 'Dashboard P95 < 1.5s', 'P1', '/api/qa/smoke', '首页聚合接口耗时落在预算内'),
      makeCase('filter_p95', '列表筛选 P95 < 800ms', 'P1', '/leads', '筛选和审批过滤在中等数据量下无明显阻塞'),
      makeCase('batch_invite', '批量邀约动作 < 5s', 'P1', '/leads', '批量邀约、批量转人工写入成功'),
    ],
    uat: [
      makeCase('uat_checklist', 'UAT 验收清单', 'P0', '/api/qa/uat', '31 项验收清单，覆盖 M1/M2/M3 三个里程碑'),
    ],
  };
}

