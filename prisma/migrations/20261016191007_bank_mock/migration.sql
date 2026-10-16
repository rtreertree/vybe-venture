-- CreateTable
CREATE TABLE "BankUser" (
    "userId" VARCHAR(5) NOT NULL,
    "cashBalance" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankUser_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "BankProduct" (
    "symbol" VARCHAR(12) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "area" VARCHAR(64) NOT NULL,
    "description" TEXT NOT NULL,
    "risk" VARCHAR(8) NOT NULL,
    "riskNote" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "issuer" VARCHAR(150) NOT NULL,
    "region" VARCHAR(64) NOT NULL,
    "currentPrice" DECIMAL(24,6) NOT NULL,
    "prevClose" DECIMAL(24,6) NOT NULL,
    "dividendYieldPercent" DECIMAL(8,2) NOT NULL,
    "size" DECIMAL(24,2) NOT NULL,
    "inceptionDate" DATE NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankProduct_pkey" PRIMARY KEY ("symbol")
);

-- CreateTable
CREATE TABLE "BankProductHolding" (
    "id" SERIAL NOT NULL,
    "symbol" VARCHAR(12) NOT NULL,
    "holdingName" VARCHAR(150) NOT NULL,
    "weightPercent" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "BankProductHolding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankPricePoint" (
    "id" BIGSERIAL NOT NULL,
    "symbol" VARCHAR(12) NOT NULL,
    "t" TIMESTAMP(3) NOT NULL,
    "price" DECIMAL(24,6) NOT NULL,

    CONSTRAINT "BankPricePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankHolding" (
    "id" SERIAL NOT NULL,
    "userId" VARCHAR(5) NOT NULL,
    "accountRef" VARCHAR(128) NOT NULL DEFAULT '',
    "symbol" VARCHAR(12) NOT NULL,
    "quantity" DECIMAL(24,6) NOT NULL,
    "avgCost" DECIMAL(24,6) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankHolding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankOrder" (
    "orderId" VARCHAR(32) NOT NULL,
    "userId" VARCHAR(5) NOT NULL,
    "accountRef" VARCHAR(128) NOT NULL DEFAULT '',
    "symbol" VARCHAR(12) NOT NULL,
    "side" VARCHAR(4) NOT NULL,
    "status" VARCHAR(12) NOT NULL,
    "quantity" DECIMAL(24,6) NOT NULL,
    "filledPrice" DECIMAL(24,6) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "idempotencyKey" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankOrder_pkey" PRIMARY KEY ("orderId")
);

-- CreateIndex
CREATE INDEX "BankProduct_area_idx" ON "BankProduct"("area");

-- CreateIndex
CREATE INDEX "BankProductHolding_symbol_idx" ON "BankProductHolding"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "BankPricePoint_symbol_t_key" ON "BankPricePoint"("symbol", "t");

-- CreateIndex
CREATE INDEX "BankHolding_userId_idx" ON "BankHolding"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BankHolding_userId_accountRef_symbol_key" ON "BankHolding"("userId", "accountRef", "symbol");

-- CreateIndex
CREATE INDEX "BankOrder_userId_createdAt_idx" ON "BankOrder"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BankOrder_userId_idempotencyKey_key" ON "BankOrder"("userId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "BankProductHolding" ADD CONSTRAINT "BankProductHolding_symbol_fkey" FOREIGN KEY ("symbol") REFERENCES "BankProduct"("symbol") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankPricePoint" ADD CONSTRAINT "BankPricePoint_symbol_fkey" FOREIGN KEY ("symbol") REFERENCES "BankProduct"("symbol") ON DELETE CASCADE ON UPDATE CASCADE;
