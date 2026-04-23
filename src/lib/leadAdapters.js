export function normalizeLeadTask(task) {
  return {
    ...task,
    leadId: task.leadId,
    leadName: task.leadName || '未知线索',
  };
}
