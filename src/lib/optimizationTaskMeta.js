const OPTIMIZATION_TASK_PATTERN = /AI 优化建议|优化建议执行|来源扩量计划|中段漏斗修复|沉默激活内容生产|批量审批清理/;

const OPTIMIZATION_CHANNELS = [
  {
    key: 'approval_cleanup',
    label: '审批清障',
    icon: '🧹',
    href: '/approvals',
    accent: '#d97706',
    bg: '#fff7ed',
    match: (text, task) =>
      /审批清理|报价审批|政策|预算/.test(text) || task.taskType === 'request_approval',
  },
  {
    key: 'source_growth',
    label: '来源扩量',
    icon: '📈',
    href: '/ai/playbooks',
    accent: '#2563eb',
    bg: '#eff6ff',
    match: (text, task) =>
      /来源扩量|招商方案|投放素材|Playbook/i.test(text) || task.taskType === 'content_publish',
  },
  {
    key: 'funnel_repair',
    label: '漏斗修复',
    icon: '🛠️',
    href: '/workflow/runs',
    accent: '#0f766e',
    bg: '#ecfdf5',
    match: (text, task) =>
      /漏斗修复|关键阶段|跟进动作|总部考察|催签/.test(text) || task.taskType === 'follow_up',
  },
  {
    key: 'silent_reactivation',
    label: '沉默激活',
    icon: '🌙',
    href: '/me',
    accent: '#7c3aed',
    bg: '#f5f3ff',
    match: (text, task) =>
      /沉默激活|内容包|Skill|赋能/.test(text) || task.taskType === 'asset_bundle',
  },
];

export function isOptimizationTask(task) {
  const text = `${task?.title || ''} ${task?.triggerReason || ''} ${task?.content || ''}`;
  return OPTIMIZATION_TASK_PATTERN.test(text);
}

export function getOptimizationTaskMeta(task) {
  const text = `${task?.title || ''} ${task?.triggerReason || ''} ${task?.content || ''}`;
  const matched = OPTIMIZATION_CHANNELS.find((channel) => channel.match(text, task || {}));

  return matched || {
    key: 'optimization',
    label: '优化动作',
    icon: '🤖',
    href: '/ai',
    accent: '#2563eb',
    bg: '#eff6ff',
  };
}

export function summarizeOptimizationTasks(tasks = []) {
  const summaryMap = tasks
    .filter(isOptimizationTask)
    .reduce((acc, task) => {
      const meta = getOptimizationTaskMeta(task);
      if (!acc[meta.key]) {
        acc[meta.key] = { ...meta, count: 0 };
      }
      acc[meta.key].count += 1;
      return acc;
    }, {});

  return Object.values(summaryMap).sort((a, b) => b.count - a.count);
}
