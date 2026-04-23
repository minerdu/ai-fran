import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { 
  mockLeadProfiles,
  mockLeadMessages,
  mockLeadTasks,
  mockPersona, 
  mockMaterials 
} from '@/lib/mockData';

export async function GET() {
  // 生产环境禁止执行 seed（防止误清数据）
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Seed is disabled in production environment' },
      { status: 403 }
    );
  }

  try {
    // 1. Clear existing data
    await prisma.message.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.customerTag.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.material.deleteMany({});
    await prisma.personaSetting.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.sopTemplate.deleteMany({});

    // 2. Create User
    const user = await prisma.user.create({
      data: {
        username: 'admin',
        password: 'password123',
        name: '招商管理员',
        role: 'admin',
      }
    });

    // 3. Create Persona Settings
    await prisma.personaSetting.create({
      data: {
        userId: user.id,
        companyName: mockPersona.companyName,
        roleDefinition: mockPersona.roleDefinition,
        taskWorkflow: mockPersona.taskWorkflow,
        edgeCases: mockPersona.edgeCases,
        formatRules: mockPersona.formatRules,
      }
    });

    // 4. Create Tags mapping
    const tagMap = new Map();
    const allTagsSet = new Set();
    const tagStore = [];

    mockLeadProfiles.forEach(c => {
      c.tags.forEach(t => {
        const key = t.name + t.category;
        if (!allTagsSet.has(key)) {
          allTagsSet.add(key);
          tagStore.push({ name: t.name, category: t.category, color: t.color });
        }
      });
    });

    for (const t of tagStore) {
      const createdTag = await prisma.tag.create({
        data: { name: t.name, category: t.category, color: t.color }
      });
      tagMap.set(t.name, createdTag.id);
    }

    // 5. Create Customers, Tags correlation, Conversations and Messages
    for (const lead of mockLeadProfiles) {
      const customer = await prisma.customer.create({
        data: {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          wechatId: lead.wechatId,
          source: lead.source,
          lifecycleStatus: lead.lifecycleStatus,
          intentScore: lead.intentScore,
          valueScore: lead.valueScore,
          satisfactionScore: lead.satisfactionScore,
          silentDays: lead.silentDays,
          aiSummary: lead.aiSummary,
          lastInteractionAt: lead.lastInteractionAt ? new Date(lead.lastInteractionAt) : null,
          lastKeyQuestion: lead.lastKeyQuestion,
          assignedToId: lead.assignedToId || lead.assignedTo,
          crmHistory: JSON.stringify([{
            company: lead.company,
            city: lead.city,
            region: lead.region,
            investBudget: lead.investBudget,
            experience: lead.experience,
            storeCount: lead.storeCount
          }]),
        }
      });

      // Tie tags
      for (const t of lead.tags) {
        await prisma.customerTag.create({
          data: {
            customerId: customer.id,
            tagId: tagMap.get(t.name)
          }
        });
      }

      // Create conversation
      const conversation = await prisma.conversation.create({
        data: {
          customerId: customer.id,
          status: 'active',
          aiMode: true,
          lastMessageAt: lead.lastInteractionAt ? new Date(lead.lastInteractionAt) : null,
          unreadCount: 0,
        }
      });

      // Generate 10-30 dynamic messages based on customer
      const numMessages = Math.floor(Math.random() * 21) + 10; // 10 to 30
      const now = lead.lastInteractionAt ? new Date(lead.lastInteractionAt) : new Date();
      
      // "added time": 30 to 180 days before now
      const addedDaysAgo = Math.floor(Math.random() * 150) + 30;
      const createdAt = new Date(now.getTime() - addedDaysAgo * 24 * 3600000);
      const totalDuration = now.getTime() - createdAt.getTime();
      const interval = totalDuration / numMessages;
      
      const conversationStyles = [
        // Style 1: 经验老道的老板，直接了当
        [
          { role: 'c', text: "你好，最近在看你们的项目。" },
          { role: 'a', text: `您好${lead.name}老板！感谢关注，请问您目前在哪个城市看店面呢？` },
          { role: 'c', text: `${lead.city || '本地'}，位置看好了几个，还在对比` },
          { role: 'c', text: "不过我想先了解下你们的政策" },
          { role: 'a', text: "没问题的老板。以咱们这边的市场情况，目前有标准店和旗舰店两种模型，您的预算大概在什么区间？" },
          { role: 'c', text: `${lead.investBudget || '三十万左右'}吧，不想弄太大` },
          { role: 'c', text: "人员不好招" },
          { role: 'a', text: "明白，那做个60平左右的标准店非常合适，人员配置只需要店长+2个导购。给您发一份详细测算表，您先看看【文件：标准单店盈利测算.pdf】" },
          { role: 'c', text: "好，我晚点看" },
          { role: 'c', text: "你们这边保证金怎么退？" },
          { role: 'a', text: "合同期满无违约全额退还的，我们是大品牌这块很正规。平时物料折扣能拿到多少您有关心吗？" },
          { role: 'c', text: "物料折扣多少？竞品给的是4折" },
          { role: 'a', text: "我们基础折扣是4.5折，但是年终有阶梯返利，算下来其实能做到3.8折。而且总部的品牌推广力度远超竞品。" },
          { role: 'c', text: "可以，什么时候能去你们总部看看？" },
          { role: 'a', text: "随时欢迎！下周三有个小型对接会，您看时间方便吗？可以安排专车接站。" },
          { role: 'c', text: "下周三我看下行程，可能要周四" },
          { role: 'a', text: "周四也可以的，我这边给您提前预留接待名额和考察门店行程。" },
          { role: 'c', text: "好的，先这样。" }
        ],
        // Style 2: 新手小白，问题多，犹豫不决
        [
          { role: 'c', text: "在吗？想问下加盟的事情。" },
          { role: 'a', text: `在的${lead.name}，很高兴为您服务。请问您以前做过类似的门店生意吗？` },
          { role: 'c', text: "没有，小白一个😂" },
          { role: 'c', text: "所以怕做不好，亏钱" },
          { role: 'a', text: "理解您的担忧。其实我们80%的加盟商都是跨行过来的，总部有从选址到开业的‘保姆式’带店支持。" },
          { role: 'c', text: "培训要多久啊？我不懂技术能学会吗" },
          { role: 'c', text: "我比较笨，怕学不会" },
          { role: 'a', text: "完全不用担心，技术培训是标准化的，在总部封闭式学习15天，考核通过才下店。而且开业前我们会有老店长带店7天。" },
          { role: 'c', text: `我在${lead.city || '这边'}，这儿人流一般，不知道能不能做起来` },
          { role: 'a', text: `我们在${lead.city || '那边'}其实有专门的市场调研组，选址阶段是不达标不予立项的，帮您把好第一道关。` },
          { role: 'c', text: "那大概要投多少钱？" },
          { role: 'a', text: "前期总投入（包含装修、设备和首批货款）大概在20-30万左右，具体看您的门店面积。" },
          { role: 'c', text: "啊，这么多吗？能便宜点不" },
          { role: 'c', text: "有没有那种微型店？" },
          { role: 'a', text: "目前为了保证品牌形象和盈利体验，最小面积要求是40平米。不过本月加盟有个补贴政策，能省下大概3万的装修费。" },
          { role: 'c', text: "哦哦，那我跟家里人商量下吧" },
          { role: 'a', text: "好的，我把一些小白成功开店的案例发给您参考下。有问题随时微信滴我~" }
        ],
        // Style 3: 投资客，只关心数据和回报
        [
          { role: 'c', text: "发下资料" },
          { role: 'c', text: "要包含财务测算和回本周期" },
          { role: 'a', text: `您好${lead.name}，资料已整理好：【品牌画册.pdf】【2025各店型投资测算表.xlsx】` },
          { role: 'c', text: "你们的毛利率能做到多少？" },
          { role: 'a', text: "综合毛利率在65%-70%之间，其中高客单价的服务项目能做到80%以上。" },
          { role: 'c', text: `我预算有${lead.investBudget || '一百万'}，如果我在${lead.city || '市区'}拿三个商场店，有区域保护吗？` },
          { role: 'a', text: "您的预算非常充足。拿三店的话我们可以签区域代理合同，或者锁定商圈半径3公里内的独家保护权。" },
          { role: 'c', text: "这三个店我都不参与日常管理，你们有托管模式吗？" },
          { role: 'a', text: "目前主要是加盟商直营，但如果您拿多店，总部可以协助招聘并输出成熟的店长，每个月会出具详尽的财务和运营报表。" },
          { role: 'c', text: "店长的提成怎么算？你们抽成多少" },
          { role: 'a', text: "店长底薪+业绩阶梯抽成，大概占比营业额的8%。总部不抽成营业额，主要是物料和后期的供应链利润。" },
          { role: 'c', text: "好，这周五我让助理去一趟你们那" },
          { role: 'c', text: "把你们法务和招商总监约好，我带着合同直接谈" },
          { role: 'a', text: "没问题，我马上为您协调总监的时间，周五见！" }
        ],
        // Style 4: 随性，偶尔回复，碎片化沟通
        [
          { role: 'c', text: "你好" },
          { role: 'a', text: `您好${lead.name}！想了解下加盟是吗？目前考虑什么位置呢？` },
          { role: 'c', text: `嗯，${lead.city || '老家'}这边` },
          { role: 'c', text: "还没怎么看门面" },
          { role: 'a', text: "没关系，选址可以慢慢看，核心商圈和社区底商我们都有对应的店型。您预计什么时候想把店开起来？" },
          { role: 'c', text: "今年下半年吧" },
          { role: 'c', text: "随便看看" },
          { role: 'a', text: "那现在了解正是时候，我先把大致的合作流程发您了解一下？" },
          { role: 'c', text: "嗯" },
          { role: 'c', text: "加盟费多少" },
          { role: 'a', text: "加盟费是按年收的，目前特惠期一年是2.98万。包含了品牌使用、全套SOP运营指导和督导下店服务。" },
          { role: 'c', text: "哦，还行" },
          { role: 'c', text: "带设备吗" },
          { role: 'a', text: "设备是单独结算的，因为门店大小不同，配备的仪器数量不一样。标准店的设备包大概在4万左右。" },
          { role: 'c', text: "行吧，我上班有点忙，空了看资料" },
          { role: 'a', text: "好的，资料已经发您了。您先忙，有不懂的随时微信给我留言就行。" },
          { role: 'c', text: "👍" }
        ]
      ];

      const chosenStyle = conversationStyles[Math.floor(Math.random() * conversationStyles.length)];
      // Trim to match 10-30 or use the whole array if shorter, then loop if needed.
      const msgsToGenerate = [];
      let ptr = 0;
      for (let i = 0; i < numMessages; i++) {
        msgsToGenerate.push(chosenStyle[ptr]);
        ptr = (ptr + 1) % chosenStyle.length;
      }

      for (let i = 0; i < msgsToGenerate.length; i++) {
        const msg = msgsToGenerate[i];
        const isCustomer = msg.role === 'c';
        const msgDate = new Date(createdAt.getTime() + i * interval);
        
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            direction: isCustomer ? 'inbound' : 'outbound',
            senderType: isCustomer ? 'customer' : 'ai',
            contentType: 'text',
            content: msg.text,
            createdAt: msgDate
          }
        });
      }
    }

    // 5.5 Create Groups for regions
    const regions = ['华东', '华南', '西南'];
    let groupCounter = 1;
    for (const region of regions) {
      const regionLeads = mockLeadProfiles.filter(l => l.region === region);
      const shuffledLeads = [...regionLeads].sort(() => Math.random() - 0.5);
      const chunkSize = Math.ceil(shuffledLeads.length / 3);

      for (let i = 1; i <= 3; i++) {
        const groupName = `${region}招商沟通${i}群`;
        const groupId = `group_${groupCounter++}`;
        const groupLeads = shuffledLeads.slice((i - 1) * chunkSize, i * chunkSize);
        
        const summaries = [
          "面向该区域新意向客户，日常分享成功案例与门店选址经验。",
          "针对正在谈判阶段的加盟商，集中解答合同、保证金及退改政策。",
          "活跃交流群，主要探讨区域保护政策及最新特惠活动细节。",
          "专属答疑群，供潜在客户了解供应链配送时效、物料折扣及开业前筹备工作。",
          "聚焦新手小白的培训体系问题解答，包含店长管理与员工内训大纲。",
          "高净值客户群，主要解答投资回报率(ROI)、门店模型与回本周期预估。"
        ];
        
        const group = await prisma.customer.create({
          data: {
            id: groupId,
            name: groupName,
            phone: '',
            wechatId: `wx_${groupId}`,
            source: 'wechat',
            lifecycleStatus: 'pool',
            intentScore: 0,
            valueScore: 0,
            satisfactionScore: 0,
            silentDays: 0,
            isGroup: true,
            aiSummary: `【${region}专区】${summaries[(groupCounter - 1) % summaries.length]}`,
            lastInteractionAt: new Date(),
            assignedToId: user.id,
            crmHistory: JSON.stringify([{
              company: '招商沟通群',
              city: region,
              region: region,
            }]),
          }
        });

        const conversation = await prisma.conversation.create({
          data: {
            customerId: group.id,
            status: 'active',
            aiMode: true,
            lastMessageAt: new Date(),
            unreadCount: Math.floor(Math.random() * 5),
          }
        });

        // Add some messages to the group
        const groupQuestions = [
          `请问${region}的代理政策是怎样的？`,
          "保证金是多少？可以退吗？",
          "大家有没有最近去总部考察的？",
          "这个月加盟有什么优惠活动吗？",
          "我是做餐饮的，跨行好做吗？",
          `现在${region}还能开区域代理吗？`,
          "资料收到了，正在看",
          "门店装修是自己装还是总部派人？",
          "店长培训要收学费吗？",
          "如果旁边有人开竞品怎么应对？"
        ];
        for (let j = 0; j < 15; j++) {
          const randomLead = groupLeads[Math.floor(Math.random() * groupLeads.length)] || { name: '客户A' };
          const isCustomer = j % 2 === 0;
          const q = groupQuestions[Math.floor(Math.random() * groupQuestions.length)];
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              direction: isCustomer ? 'inbound' : 'outbound',
              senderType: isCustomer ? 'customer' : 'ai',
              contentType: 'text',
              content: isCustomer ? `${randomLead.name}: ${q}` : 'AI 招商顾问: 感谢关注，详细资料已在群内共享，有具体问题可以@我解答。',
              createdAt: new Date(Date.now() - (15 - j) * 3600000)
            }
          });
        }
      }
    }

    // 6. Create Tasks
    for (const task of mockLeadTasks) {
      await prisma.task.create({
        data: {
          id: task.id,
          customerId: task.leadId,
          title: task.title,
          taskType: task.taskType,
          content: task.content,
          triggerSource: task.triggerSource,
          triggerReason: task.triggerReason,
          approvalStatus: task.approvalStatus,
          executeStatus: task.executeStatus,
          scheduledAt: task.scheduledAt ? new Date(task.scheduledAt) : null,
        }
      });
    }

    // 7. Create Materials
    for (const mat of mockMaterials) {
      await prisma.material.create({
        data: {
          id: mat.id,
          title: mat.title,
          type: mat.type,
          content: mat.content || mat.title, // Default content
          tags: mat.tags,
        }
      });
    }

    return NextResponse.json({ success: true, message: '招商 mock 数据已初始化' });

  } catch (error) {
    console.error('Seeding error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
