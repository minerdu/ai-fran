import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET current persona settings
export async function GET() {
  try {
    // Get the first user's settings (single-tenant MVP)
    const user = await prisma.user.findFirst({
      include: { settings: true }
    });

    if (!user || !user.settings) {
      // Return defaults if no settings exist yet
      return NextResponse.json({
        companyName: '樊文花美业集团',
        roleDefinition: '你是总部 AI 招商顾问，负责接待加盟代理商负责人、识别资质并推进考察与签约。',
        taskWorkflow: '先采集城市、预算、行业经验、预计开店时间和决策角色，再判断是否进入建档、考察、报价、审批或签约节点。',
        edgeCases: '涉及加盟费折扣、返利、区域独家、合同、打款和收益承诺时，不直接答复，统一转人工审批。',
        formatRules: '回复保持专业、可信、克制，避免门店零售、项目体验、消费转化等 C 端表达。',
      });
    }

    const s = user.settings;
    return NextResponse.json({
      companyName: s.companyName,
      roleDefinition: s.roleDefinition,
      taskWorkflow: s.taskWorkflow,
      edgeCases: s.edgeCases,
      formatRules: s.formatRules,
    });
  } catch (error) {
    console.error('Error fetching persona settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT to save/update persona settings
export async function PUT(request) {
  try {
    const body = await request.json();
    const { companyName, roleDefinition, taskWorkflow, edgeCases, formatRules } = body;

    // Find or create default user (single-tenant MVP)
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          username: 'admin',
          password: 'admin',
          name: '管理员',
          role: 'admin',
        }
      });
    }

    // Upsert persona settings
    const settings = await prisma.personaSetting.upsert({
      where: { userId: user.id },
      update: {
        companyName: companyName || '樊文花美业集团',
        roleDefinition: roleDefinition || '',
        taskWorkflow: taskWorkflow || '',
        edgeCases: edgeCases || '',
        formatRules: formatRules || '',
      },
      create: {
        userId: user.id,
        companyName: companyName || '樊文花美业集团',
        roleDefinition: roleDefinition || '',
        taskWorkflow: taskWorkflow || '',
        edgeCases: edgeCases || '',
        formatRules: formatRules || '',
      }
    });

    return NextResponse.json({
      companyName: settings.companyName,
      roleDefinition: settings.roleDefinition,
      taskWorkflow: settings.taskWorkflow,
      edgeCases: settings.edgeCases,
      formatRules: settings.formatRules,
    });
  } catch (error) {
    console.error('Error saving persona settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
