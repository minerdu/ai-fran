import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { handleIncomingMessage } from '@/lib/services/ai-service';

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedLeadId = searchParams.get('leadId') || searchParams.get('customerId');
    const loadAll = searchParams.get('all') === 'true';

    if (!requestedLeadId) return NextResponse.json([], { status: 400 });

    const queryOptions = {
      where: { conversation: { customerId: requestedLeadId } },
      orderBy: { createdAt: 'desc' },
    };
    // Only limit to 40 if not requesting all history
    if (!loadAll) {
      queryOptions.take = 40;
    }

    const messagesData = await prisma.message.findMany(queryOptions);

    if (!messagesData.length) return NextResponse.json([]);

    // Return messages in the format ChatPanel expects, reversed to chronological
    const messages = messagesData.reverse().map(m => ({
      id: m.id,
      direction: m.direction,
      senderType: m.senderType,
      contentType: m.contentType,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    }));

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const targetLeadId = payload.leadId || payload.customerId;
    const content = payload.content;
    const senderType = payload.senderType;

    if (!targetLeadId || !content) {
      return NextResponse.json({ error: 'leadId and content are required' }, { status: 400 });
    }

    // 1. Find or create active conversation. Prisma schema still stores lead relation as customerId.
    let conversation = await prisma.conversation.findFirst({
      where: { customerId: targetLeadId, status: 'active' },
      orderBy: { createdAt: 'desc' }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { customerId: targetLeadId }
      });
    }

    const direction = senderType === 'customer' ? 'inbound' : 'outbound';

    // 2. Insert standard message
    const newMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction,
        senderType,
        contentType: 'text',
        content,
      }
    });

    // 3. (Async) Trigger AI service for inbound messages — AI-first autonomous mode
    if (direction === 'inbound') {
      // Background execution for AI logic so we don't block the UI response
      handleIncomingMessage(conversation.id, content, targetLeadId).catch(console.error);
    }

    // Returning formatted for front-end
    return NextResponse.json({
      leadId: targetLeadId,
      id: newMessage.id,
      direction: newMessage.direction,
      senderType: newMessage.senderType,
      contentType: newMessage.contentType,
      content: newMessage.content,
      createdAt: newMessage.createdAt.toISOString(),
    });

  } catch (error) {
    console.error('Failed to send message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
