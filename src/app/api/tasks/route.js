import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function formatTask(task) {
  return {
    id: task.id,
    leadId: task.customerId,
    leadName: task.customer?.name || '未知线索',
    title: task.title,
    content: task.content,
    triggerSource: task.triggerSource,
    triggerReason: task.triggerReason || '',
    taskType: task.taskType,
    approvalStatus: task.approvalStatus,
    executeStatus: task.executeStatus,
    scheduledAt: task.scheduledAt?.toISOString() || null,
    executedAt: task.executedAt?.toISOString() || null,
    rejectReason: task.rejectReason || null,
    createdAt: task.createdAt.toISOString(),
  };
}

export async function GET(request) {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { name: true }
        }
      }
    });

    const formattedTasks = tasks.map(formatTask);

    return NextResponse.json(formattedTasks);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const targetLeadId = payload.leadId || payload.customerId;
    const content = payload.content;

    if (!targetLeadId || !content) {
      return NextResponse.json({ error: 'leadId and content are required' }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        // Prisma schema still stores lead relation on task.customerId.
        customerId: targetLeadId,
        title: payload.title || '招商跟进任务',
        taskType: payload.taskType || 'text',
        content,
        triggerSource: payload.triggerSource || 'manual',
        triggerReason: payload.triggerReason || '手动创建招商动作',
        approvalStatus: payload.needApproval === false ? 'approved' : 'pending',
        executeStatus: payload.needApproval === false ? 'scheduled' : 'draft',
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
      },
      include: {
        customer: { select: { name: true } }
      }
    });

    return NextResponse.json(formatTask(task), { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    // Accept both { id, action } and { taskId, action } for compatibility
    const taskId = body.id || body.taskId;
    const { action, updateData } = body;

    if (!taskId || !action) {
      return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    let data = {};

    switch (action) {
      case 'approve':
        data.approvalStatus = 'approved';
        data.executeStatus = 'scheduled';
        data.reviewedBy = 'human';
        data.reviewNotes = updateData?.reviewNotes || '人工审批通过';
        data.rejectReason = null;
        if (updateData?.content) data.content = updateData.content;
        if (updateData?.scheduledAt) {
          data.scheduledAt = new Date(updateData.scheduledAt);
        } else if (!task.scheduledAt) {
          data.scheduledAt = new Date(Date.now() + 60000);
        }
        break;
      case 'reject':
        data.approvalStatus = 'rejected';
        data.executeStatus = 'cancelled';
        data.reviewedBy = 'human';
        data.reviewNotes = updateData?.reviewNotes || updateData?.rejectReason || '人工审批驳回';
        if (updateData?.rejectReason) data.rejectReason = updateData.rejectReason;
        break;
      case 'execute':
        data.executeStatus = 'success';
        data.executedAt = new Date();
        break;
      case 'cancel':
        data.executeStatus = 'cancelled';
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        customer: {
          select: { name: true }
        }
      }
    });

    return NextResponse.json({ success: true, updatedTask: formatTask(updatedTask) });
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
