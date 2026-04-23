import prisma from '@/lib/prisma';
import { listApprovals } from '@/lib/approvalService';
import ApprovalsClientPage from './ApprovalsClientPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function loadInitialOptimizationTasks() {
  const tasks = await prisma.task.findMany({
    where: {
      approvalStatus: 'pending',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      content: true,
      triggerReason: true,
    },
  });

  return tasks.filter((task) =>
    /AI 优化建议|优化建议执行/.test(`${task.triggerReason || ''} ${task.title}`)
  );
}

export default async function ApprovalsPage() {
  const [initialItems, initialOptimizationTasks] = await Promise.all([
    listApprovals(),
    loadInitialOptimizationTasks(),
  ]);

  return (
    <ApprovalsClientPage
      initialItems={initialItems}
      initialOptimizationTasks={initialOptimizationTasks}
    />
  );
}
