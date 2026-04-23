import { handleIncomingMessage } from '@/lib/services/ai-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Optional: Security token matching
const EXPECTED_AUTH = process.env.OPENAPI_BRIDGE_AUTH || '';

export async function POST(req) {
  try {
    // 1. Auth check
    if (EXPECTED_AUTH) {
      const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key');
      // Just a loose check if they configured it
      if (authHeader && !authHeader.includes(EXPECTED_AUTH) && authHeader !== EXPECTED_AUTH) {
        console.warn(`[WeCom Webhook] Unauthorized request received.`);
        return new Response(JSON.stringify({ code: 401, error: 'Unauthorized' }), { status: 401 });
      }
    }

    const payload = await req.json();
    console.log(`\n[WeCom Webhook] Received payload:`, JSON.stringify(payload).substring(0, 500));

    let leadWechatId = payload.leadId || payload.customerId || '';
    let robotId = payload.robotId || '';
    let msgId = payload.msgId || '';
    let msg = payload.msg || '';
    let msgType = payload.msgType || payload.msgtype;
    let isGroup = false;

    // Detect if this is an OpenClaw `/v1/responses` payload coming from the colleague's local Bridge
    if (payload.model && payload.user && payload.input) {
      console.log(`[WeCom Webhook] Detected OpenClaw JSON format from Bridge`);
      
      // Extract from user field: e.g. "openapi-private_wx123_robot456" or "openapi-group_12345"
      const userStr = payload.user || '';
      if (userStr.includes('private_')) {
        const parts = userStr.split('private_')[1].split('_');
        leadWechatId = parts[0];
        if (parts.length > 1) robotId = parts[1];
      } else if (userStr.includes('group_')) {
        leadWechatId = userStr.split('group_')[1];
        isGroup = true;
      } else {
        leadWechatId = userStr.replace('openapi-', ''); // fallback
      }

      // Extract msg text from input blocks
      const inputBlocks = payload.input || [];
      for (const block of inputBlocks) {
        if (block.content && Array.isArray(block.content)) {
          for (const item of block.content) {
            if (item.type === 'input_text' && item.text) {
              msg += item.text + '\n';
            }
          }
        }
      }
      msg = msg.trim();
    } 
    // Handle Raw Group Callback format (400006)
    else if (payload.type === 400006 || payload.type === '400006') {
      const data = payload.data || {};
      leadWechatId = data.sender_serial_no || '';
      robotId = data.wxId || data.robot_serial_no || payload.wxId || '';
      msgId = data.msg_id || data.msg_serial_no || '';
      
      if (data.msg_content) {
        try {
          msg = Buffer.from(data.msg_content, 'base64').toString('utf-8');
        } catch (e) {
          msg = data.msg_content;
        }
      } else {
        msg = data.href || data.title || '[Media/Link]';
      }
      
      msgType = data.msg_type;
      isGroup = true;
    }

    // Filter self-echo (Self sending messages shouldn't trigger AI unless needed)
    if (leadWechatId && leadWechatId === robotId) {
      console.log(`[WeCom Webhook] Ignoring self-echo from robot: ${robotId}`);
      return new Response(JSON.stringify({ code: 0, message: 'ignored self echo' }));
    }

    if (!leadWechatId || !msg) {
      console.warn(`[WeCom Webhook] Missing leadWechatId or msg. Payload:`, payload);
      return new Response(JSON.stringify({ code: 0, message: 'missing required fields' }));
    }

    // 3. Upsert Lead in CRM
    // If the lead doesn't exist, create a skeleton profile first
    let lead = await prisma.customer.findUnique({
      where: { wechatId: leadWechatId }
    });

    if (!lead) {
      console.log(`[WeCom Webhook] Creating new lead profile for ${leadWechatId}`);
      lead = await prisma.customer.create({
        data: {
          name: `加盟线索_${leadWechatId.substring(0, 6)}`,
          wechatId: leadWechatId,
          source: 'wechat',
          isGroup: isGroup,
          lifecycleStatus: 'new',
        }
      });
    }

    // 4. Find or create active conversation and persist inbound message
    let conversation = await prisma.conversation.findFirst({
      where: { customerId: lead.id, status: 'active' },
      orderBy: { createdAt: 'desc' }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          customerId: lead.id,
          status: 'active',
          aiMode: true,
          lastMessageAt: new Date(),
        }
      });
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        externalMsgId: msgId || null,
        direction: 'inbound',
        senderType: 'customer',
        contentType: msgType === 'image' ? 'image' : 'text',
        content: msg,
      }
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
      }
    });

    // 5. Forward to AI Service Pipeline
    console.log(`[WeCom Webhook] Processing lead pipeline for ${lead.name} (${leadWechatId})`);
    
    // Fire and forget (don't block the webhook response)
    handleIncomingMessage(conversation.id, msg, lead.id).catch(err => {
      console.error(`[WeCom Webhook] Pipeline Error:`, err);
    });

    // 6. Return success immediately to provider
    const responsePayload = (payload.model && payload.user && payload.input)
      ? { output: [{ type: "output_text", text: "NO_REPLY" }] }
      : { code: 0, message: 'success' };

    return new Response(JSON.stringify(responsePayload), {
      headers: { 'Content-Type': 'application/json' }
    });


  } catch (error) {
    console.error(`[WeCom Webhook] Parse Error:`, error);
    return new Response(JSON.stringify({ code: 500, error: 'Internal Server Error' }), { status: 500 });
  }
}
