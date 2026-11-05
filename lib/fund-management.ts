export const FUND_MANAGEMENT_ENVIRONMENT = "DEMO" as const;
export const FUND_MANAGEMENT_LIVE_ENABLED = false as const;
export const FUND_MANAGEMENT_TERMS_VERSION = "MIVO-FM-DEMO-NOT-A-LIVE-AGREEMENT-V1";
export const FUND_MANAGEMENT_DISCLOSURE_VERSION = "MIVO-FM-RISK-DISCLOSURE-V1";
export const FUND_MANAGEMENT_FREQUENCIES = ["WEEKLY", "BIWEEKLY", "MONTHLY"] as const;

export const FUND_MANAGEMENT_DEMO_TERMS = [
  "This acknowledgement is for a demo workflow only and is not an investment management agreement.",
  "No money is accepted or held by Mivo through this portal. No broker account is connected or traded by this service.",
  "Performance, settlement and redemption information will be shown only when supported by verified account records.",
  "Investment values can fall. Returns are not guaranteed, and a demo status does not promise an account or service launch.",
].join(" ");

export function assertFundManagementLiveDisabled() {
  if (!FUND_MANAGEMENT_LIVE_ENABLED) {
    throw new Error("Fund Management is demo-only. Deposits, custody, discretionary live trading and payouts are disabled pending Mivo's required approvals and integrations.");
  }
}
