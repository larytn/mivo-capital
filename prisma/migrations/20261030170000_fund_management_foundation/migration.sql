-- Fund Management foundation. No live account, deposit, trade or payout data is created here.
CREATE TABLE IF NOT EXISTS "FundManagerProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bio" TEXT NOT NULL,
  "experience" TEXT NOT NULL,
  "specialties" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FundManagerProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FundManagerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "FundManagementApplication" (
  "id" TEXT NOT NULL,
  "investorId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "investmentExperience" TEXT NOT NULL,
  "investmentObjective" TEXT NOT NULL,
  "riskTolerance" TEXT NOT NULL,
  "lossCapacity" TEXT NOT NULL,
  "riskDisclosureVersion" TEXT NOT NULL,
  "riskDisclosureAcceptedAt" TIMESTAMP(3) NOT NULL,
  "identityVerificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "suitabilityStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "verificationReference" TEXT,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FundManagementApplication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FundManagementApplication_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "FundManagementMandate" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "investorId" TEXT NOT NULL,
  "managerProfileId" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'DEMO',
  "status" TEXT NOT NULL DEFAULT 'PENDING_AGREEMENT',
  "currency" TEXT,
  "investorProfitShareRate" DECIMAL(8,6) NOT NULL,
  "mivoProfitShareRate" DECIMAL(8,6) NOT NULL,
  "settlementFrequency" TEXT NOT NULL,
  "maxDrawdownPercent" DECIMAL(8,4) NOT NULL,
  "maxLeverage" DECIMAL(8,4),
  "highWaterMarkProfit" DECIMAL(30,10) NOT NULL DEFAULT 0,
  "lossCarryForward" DECIMAL(30,10) NOT NULL DEFAULT 0,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FundManagementMandate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FundManagementMandate_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "FundManagementApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementMandate_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementMandate_managerProfileId_fkey" FOREIGN KEY ("managerProfileId") REFERENCES "FundManagerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementMandate_demo_only_check" CHECK ("environment" = 'DEMO'),
  CONSTRAINT "FundManagementMandate_profit_split_check" CHECK ("investorProfitShareRate" >= 0 AND "mivoProfitShareRate" >= 0 AND "investorProfitShareRate" + "mivoProfitShareRate" = 1),
  CONSTRAINT "FundManagementMandate_risk_limits_check" CHECK ("maxDrawdownPercent" > 0 AND "maxDrawdownPercent" <= 100 AND ("maxLeverage" IS NULL OR "maxLeverage" > 0)),
  CONSTRAINT "FundManagementMandate_accounting_nonnegative_check" CHECK ("highWaterMarkProfit" >= 0 AND "lossCarryForward" >= 0)
);

CREATE TABLE IF NOT EXISTS "FundManagementAgreement" (
  "id" TEXT NOT NULL,
  "mandateId" TEXT NOT NULL,
  "investorId" TEXT NOT NULL,
  "termsVersion" TEXT NOT NULL,
  "investorProfitShareRate" DECIMAL(8,6) NOT NULL,
  "mivoProfitShareRate" DECIMAL(8,6) NOT NULL,
  "settlementFrequency" TEXT NOT NULL,
  "riskLimits" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PRESENTED',
  "presentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FundManagementAgreement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FundManagementAgreement_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "FundManagementMandate"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementAgreement_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementAgreement_profit_split_check" CHECK ("investorProfitShareRate" >= 0 AND "mivoProfitShareRate" >= 0 AND "investorProfitShareRate" + "mivoProfitShareRate" = 1),
  CONSTRAINT "FundManagementAgreement_demo_status_check" CHECK ("status" IN ('PRESENTED', 'DEMO_ACKNOWLEDGED'))
);

CREATE TABLE IF NOT EXISTS "FundManagementAccount" (
  "id" TEXT NOT NULL,
  "mandateId" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'DEMO',
  "status" TEXT NOT NULL DEFAULT 'NOT_PROVISIONED',
  "brokerName" TEXT,
  "maskedAccountReference" TEXT,
  "currency" TEXT,
  "balance" DECIMAL(30,10),
  "equity" DECIMAL(30,10),
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FundManagementAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FundManagementAccount_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "FundManagementMandate"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementAccount_demo_only_check" CHECK ("environment" = 'DEMO')
);

CREATE TABLE IF NOT EXISTS "FundManagementStatement" (
  "id" TEXT NOT NULL,
  "mandateId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL,
  "balance" DECIMAL(30,10),
  "equity" DECIMAL(30,10),
  "realizedPnl" DECIMAL(30,10) NOT NULL,
  "unrealizedPnl" DECIMAL(30,10) NOT NULL,
  "tradingCosts" DECIMAL(30,10) NOT NULL DEFAULT 0,
  "maxDrawdownAmount" DECIMAL(30,10),
  "maxDrawdownPercent" DECIMAL(8,4),
  "sourceReference" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  "verifiedAt" TIMESTAMP(3),
  "verifiedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FundManagementStatement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FundManagementStatement_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "FundManagementMandate"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementStatement_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementStatement_period_check" CHECK ("periodStart" < "periodEnd"),
  CONSTRAINT "FundManagementStatement_status_check" CHECK ("status" IN ('UNVERIFIED', 'VERIFIED', 'REJECTED')),
  CONSTRAINT "FundManagementStatement_verified_record_check" CHECK ("status" <> 'VERIFIED' OR ("verifiedAt" IS NOT NULL AND "verifiedById" IS NOT NULL)),
  CONSTRAINT "FundManagementStatement_costs_check" CHECK ("tradingCosts" >= 0 AND ("maxDrawdownAmount" IS NULL OR "maxDrawdownAmount" >= 0) AND ("maxDrawdownPercent" IS NULL OR "maxDrawdownPercent" >= 0))
);

CREATE TABLE IF NOT EXISTS "FundManagementTrade" (
  "id" TEXT NOT NULL,
  "mandateId" TEXT NOT NULL,
  "sourceReference" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  "volume" DECIMAL(20,8),
  "entryPrice" DECIMAL(30,10),
  "exitPrice" DECIMAL(30,10),
  "realizedPnl" DECIMAL(30,10),
  "commission" DECIMAL(30,10) NOT NULL DEFAULT 0,
  "swap" DECIMAL(30,10) NOT NULL DEFAULT 0,
  "openedAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "verifiedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FundManagementTrade_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FundManagementTrade_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "FundManagementMandate"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementTrade_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementTrade_status_check" CHECK ("status" IN ('UNVERIFIED', 'VERIFIED', 'REJECTED')),
  CONSTRAINT "FundManagementTrade_verified_record_check" CHECK ("status" <> 'VERIFIED' OR ("verifiedAt" IS NOT NULL AND "verifiedById" IS NOT NULL)),
  CONSTRAINT "FundManagementTrade_costs_check" CHECK ("commission" >= 0)
);

CREATE TABLE IF NOT EXISTS "FundManagementExpense" (
  "id" TEXT NOT NULL,
  "mandateId" TEXT NOT NULL,
  "statementId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(30,10) NOT NULL,
  "currency" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "approvedAt" TIMESTAMP(3),
  "approvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FundManagementExpense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FundManagementExpense_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "FundManagementMandate"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementExpense_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "FundManagementStatement"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementExpense_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementExpense_amount_check" CHECK ("amount" >= 0),
  CONSTRAINT "FundManagementExpense_approved_record_check" CHECK ("status" <> 'APPROVED' OR ("approvedAt" IS NOT NULL AND "approvedById" IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS "FundManagementSettlement" (
  "id" TEXT NOT NULL,
  "mandateId" TEXT NOT NULL,
  "agreementId" TEXT NOT NULL,
  "statementId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "frequency" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "balanceSnapshot" DECIMAL(30,10),
  "equitySnapshot" DECIMAL(30,10),
  "realizedPnl" DECIMAL(30,10) NOT NULL,
  "unrealizedPnl" DECIMAL(30,10) NOT NULL,
  "tradingCosts" DECIMAL(30,10) NOT NULL,
  "approvedExpenses" DECIMAL(30,10) NOT NULL,
  "netRealizedProfit" DECIMAL(30,10) NOT NULL,
  "eligibleProfit" DECIMAL(30,10) NOT NULL,
  "highWaterMarkBefore" DECIMAL(30,10) NOT NULL,
  "highWaterMarkAfter" DECIMAL(30,10) NOT NULL,
  "lossCarryForwardBefore" DECIMAL(30,10) NOT NULL,
  "lossCarryForwardAfter" DECIMAL(30,10) NOT NULL,
  "mivoShareAmount" DECIMAL(30,10) NOT NULL,
  "investorShareAmount" DECIMAL(30,10) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PREVIEW_ONLY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FundManagementSettlement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FundManagementSettlement_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "FundManagementMandate"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementSettlement_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "FundManagementAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementSettlement_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "FundManagementStatement"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementSettlement_preview_only_check" CHECK ("status" = 'PREVIEW_ONLY')
);

CREATE TABLE IF NOT EXISTS "FundManagementRedemptionRequest" (
  "id" TEXT NOT NULL,
  "mandateId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "investorId" TEXT NOT NULL,
  "requestedAmount" DECIMAL(30,10),
  "currency" TEXT,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DEMO_REQUESTED',
  "handledAt" TIMESTAMP(3),
  "handledById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FundManagementRedemptionRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FundManagementRedemptionRequest_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "FundManagementMandate"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementRedemptionRequest_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "FundManagementApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementRedemptionRequest_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementRedemptionRequest_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementRedemptionRequest_demo_status_check" CHECK ("status" IN ('DEMO_REQUESTED', 'DEMO_REVIEWED', 'DECLINED')),
  CONSTRAINT "FundManagementRedemptionRequest_amount_check" CHECK ("requestedAmount" IS NULL OR "requestedAmount" > 0)
);

CREATE TABLE IF NOT EXISTS "FundManagementAudit" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "applicationId" TEXT,
  "mandateId" TEXT,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FundManagementAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FundManagementAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementAudit_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "FundManagementApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FundManagementAudit_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "FundManagementMandate"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "FundManagerProfile_userId_key" ON "FundManagerProfile"("userId");
CREATE INDEX IF NOT EXISTS "FundManagerProfile_status_createdAt_idx" ON "FundManagerProfile"("status", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "FundManagementApplication_investorId_key" ON "FundManagementApplication"("investorId");
CREATE INDEX IF NOT EXISTS "FundManagementApplication_status_createdAt_idx" ON "FundManagementApplication"("status", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "FundManagementMandate_applicationId_key" ON "FundManagementMandate"("applicationId");
CREATE INDEX IF NOT EXISTS "FundManagementMandate_investorId_status_idx" ON "FundManagementMandate"("investorId", "status");
CREATE INDEX IF NOT EXISTS "FundManagementMandate_managerProfileId_status_idx" ON "FundManagementMandate"("managerProfileId", "status");
CREATE INDEX IF NOT EXISTS "FundManagementMandate_environment_status_idx" ON "FundManagementMandate"("environment", "status");
CREATE INDEX IF NOT EXISTS "FundManagementAgreement_mandateId_presentedAt_idx" ON "FundManagementAgreement"("mandateId", "presentedAt");
CREATE INDEX IF NOT EXISTS "FundManagementAgreement_investorId_acceptedAt_idx" ON "FundManagementAgreement"("investorId", "acceptedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "FundManagementAccount_mandateId_key" ON "FundManagementAccount"("mandateId");
CREATE INDEX IF NOT EXISTS "FundManagementAccount_environment_status_idx" ON "FundManagementAccount"("environment", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "FundManagementStatement_mandateId_sourceReference_key" ON "FundManagementStatement"("mandateId", "sourceReference");
CREATE INDEX IF NOT EXISTS "FundManagementStatement_mandateId_periodEnd_idx" ON "FundManagementStatement"("mandateId", "periodEnd");
CREATE INDEX IF NOT EXISTS "FundManagementStatement_status_periodEnd_idx" ON "FundManagementStatement"("status", "periodEnd");
CREATE UNIQUE INDEX IF NOT EXISTS "FundManagementTrade_mandateId_sourceReference_key" ON "FundManagementTrade"("mandateId", "sourceReference");
CREATE INDEX IF NOT EXISTS "FundManagementTrade_mandateId_openedAt_idx" ON "FundManagementTrade"("mandateId", "openedAt");
CREATE INDEX IF NOT EXISTS "FundManagementTrade_mandateId_status_openedAt_idx" ON "FundManagementTrade"("mandateId", "status", "openedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "FundManagementExpense_statementId_reference_key" ON "FundManagementExpense"("statementId", "reference");
CREATE INDEX IF NOT EXISTS "FundManagementExpense_mandateId_status_idx" ON "FundManagementExpense"("mandateId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "FundManagementSettlement_statementId_key" ON "FundManagementSettlement"("statementId");
CREATE INDEX IF NOT EXISTS "FundManagementSettlement_mandateId_periodEnd_idx" ON "FundManagementSettlement"("mandateId", "periodEnd");
CREATE INDEX IF NOT EXISTS "FundManagementSettlement_status_periodEnd_idx" ON "FundManagementSettlement"("status", "periodEnd");
CREATE INDEX IF NOT EXISTS "FundManagementRedemptionRequest_investorId_status_createdAt_idx" ON "FundManagementRedemptionRequest"("investorId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "FundManagementRedemptionRequest_mandateId_status_idx" ON "FundManagementRedemptionRequest"("mandateId", "status");
CREATE INDEX IF NOT EXISTS "FundManagementAudit_applicationId_createdAt_idx" ON "FundManagementAudit"("applicationId", "createdAt");
CREATE INDEX IF NOT EXISTS "FundManagementAudit_mandateId_createdAt_idx" ON "FundManagementAudit"("mandateId", "createdAt");
CREATE INDEX IF NOT EXISTS "FundManagementAudit_actorId_createdAt_idx" ON "FundManagementAudit"("actorId", "createdAt");
