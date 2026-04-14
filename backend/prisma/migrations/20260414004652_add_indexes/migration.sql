-- CreateIndex
CREATE INDEX "AgentNote_agentId_createdAt_idx" ON "AgentNote"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_agentId_updatedAt_idx" ON "Conversation"("agentId", "updatedAt");

-- CreateIndex
CREATE INDEX "FollowUp_scheduledAt_status_idx" ON "FollowUp"("scheduledAt", "status");

-- CreateIndex
CREATE INDEX "KnowledgeFile_agentId_idx" ON "KnowledgeFile"("agentId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageLog_agentId_createdAt_idx" ON "UsageLog"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageLog_createdAt_idx" ON "UsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "WebhookConfig_agentId_idx" ON "WebhookConfig"("agentId");
