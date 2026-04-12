-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "tags" TEXT;

-- CreateTable
CREATE TABLE "Blocklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Blocklist_phone_key" ON "Blocklist"("phone");
