-- CreateTable
CREATE TABLE "AppUser" (
    "token" VARCHAR(5) NOT NULL,
    "profile" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "AppAccount" (
    "id" VARCHAR(128) NOT NULL,
    "userToken" VARCHAR(5) NOT NULL,
    "record" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppConversation" (
    "id" TEXT NOT NULL,
    "userToken" VARCHAR(5) NOT NULL,
    "accountId" VARCHAR(128) NOT NULL,
    "topic" VARCHAR(32) NOT NULL,
    "scope" VARCHAR(128) NOT NULL,
    "messages" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppAccount_userToken_createdAt_idx" ON "AppAccount"("userToken", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppConversation_userToken_accountId_topic_scope_key" ON "AppConversation"("userToken", "accountId", "topic", "scope");

-- AddForeignKey
ALTER TABLE "AppAccount" ADD CONSTRAINT "AppAccount_userToken_fkey" FOREIGN KEY ("userToken") REFERENCES "AppUser"("token") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppConversation" ADD CONSTRAINT "AppConversation_userToken_fkey" FOREIGN KEY ("userToken") REFERENCES "AppUser"("token") ON DELETE CASCADE ON UPDATE CASCADE;
