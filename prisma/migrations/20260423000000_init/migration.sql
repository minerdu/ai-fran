-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'operator',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaSetting" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT '企业名称',
    "roleDefinition" TEXT NOT NULL DEFAULT '',
    "taskWorkflow" TEXT NOT NULL DEFAULT '',
    "edgeCases" TEXT NOT NULL DEFAULT '',
    "formatRules" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PersonaSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "phone" TEXT,
    "wechatId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'wechat',
    "lifecycleStatus" TEXT NOT NULL DEFAULT 'new',
    "intentScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valueScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "satisfactionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "silentDays" INTEGER NOT NULL DEFAULT 0,
    "aiSummary" TEXT,
    "lastInteractionAt" TIMESTAMP(3),
    "lastKeyQuestion" TEXT,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "crmHistory" TEXT,
    "assignedToId" TEXT,
    "youzanId" TEXT,
    "youzanFansId" TEXT,
    "memberLevel" TEXT,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "lastOrderAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'custom',
    "color" TEXT NOT NULL DEFAULT '#07C160',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerTag" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "aiMode" BOOLEAN NOT NULL DEFAULT true,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "externalMsgId" TEXT,
    "direction" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "taskType" TEXT NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "triggerSource" TEXT NOT NULL DEFAULT 'manual',
    "triggerReason" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'pending',
    "rejectReason" TEXT,
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "executeStatus" TEXT NOT NULL DEFAULT 'draft',
    "scheduledAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SopTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT '✨',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "needApproval" BOOLEAN NOT NULL DEFAULT true,
    "triggerConditions" TEXT NOT NULL,
    "actionDef" TEXT NOT NULL,
    "statsTriggered" INTEGER NOT NULL DEFAULT 0,
    "statsApproved" INTEGER NOT NULL DEFAULT 0,
    "statsReplied" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SopTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiModelConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "apiBaseUrl" TEXT NOT NULL DEFAULT '',
    "apiKey" TEXT NOT NULL DEFAULT '',
    "modelName" TEXT NOT NULL DEFAULT '',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 800,
    "systemPrompt" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "kbSource" TEXT NOT NULL DEFAULT 'default',
    "kbId" TEXT NOT NULL DEFAULT '',
    "kbApiUrl" TEXT NOT NULL DEFAULT '',
    "enableSegment" BOOLEAN NOT NULL DEFAULT true,
    "segmentMaxChars" INTEGER NOT NULL DEFAULT 200,
    "segmentCount" INTEGER NOT NULL DEFAULT 3,
    "segmentTriggerChars" INTEGER NOT NULL DEFAULT 100,
    "segmentModelName" TEXT NOT NULL DEFAULT '',
    "segmentModelApiUrl" TEXT NOT NULL DEFAULT '',
    "segmentModelApiKey" TEXT NOT NULL DEFAULT '',
    "sendInterval" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "stopKeywords" TEXT NOT NULL DEFAULT '',
    "smartSkipMode" BOOLEAN NOT NULL DEFAULT true,
    "imageAnalysis" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiModelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YouzanConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "appId" TEXT NOT NULL DEFAULT '',
    "appSecret" TEXT NOT NULL DEFAULT '',
    "accessToken" TEXT NOT NULL DEFAULT '',
    "tokenExpiry" TIMESTAMP(3),
    "shopId" TEXT NOT NULL DEFAULT '',
    "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "syncInterval" TEXT NOT NULL DEFAULT 'daily',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YouzanConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyRule" (
    "id" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "PersonaSetting_userId_key" ON "PersonaSetting"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_wechatId_key" ON "Customer"("wechatId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_youzanId_key" ON "Customer"("youzanId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerTag_customerId_tagId_key" ON "CustomerTag"("customerId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_externalMsgId_key" ON "Message"("externalMsgId");

-- AddForeignKey
ALTER TABLE "PersonaSetting" ADD CONSTRAINT "PersonaSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerTag" ADD CONSTRAINT "CustomerTag_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerTag" ADD CONSTRAINT "CustomerTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
