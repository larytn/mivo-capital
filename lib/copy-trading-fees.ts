export const MIVO_PROFIT_SHARE_RATE = 0.1;
export const MAX_COPIER_PROFIT_SHARE_RATE = 0.9;

export function calculateCopyTradingProfitSplit(copierProfitShareRate: number, eligibleProfit = 1) {
  if (!Number.isFinite(copierProfitShareRate) || copierProfitShareRate < 0 || copierProfitShareRate > MAX_COPIER_PROFIT_SHARE_RATE
    || !Number.isFinite(eligibleProfit) || eligibleProfit < 0) return null;

  const mivoShare = eligibleProfit * MIVO_PROFIT_SHARE_RATE;
  const copierShare = eligibleProfit * copierProfitShareRate;
  return {
    eligibleProfit,
    mivoShare,
    copierShare,
    providerShare: eligibleProfit - mivoShare - copierShare,
    totalCollected: eligibleProfit - copierShare,
  };
}

export function copyFactoryCommissionSettings(copierProfitShareRate: number) {
  if (!Number.isFinite(copierProfitShareRate) || copierProfitShareRate < 0 || copierProfitShareRate > MAX_COPIER_PROFIT_SHARE_RATE) return null;
  const totalCommissionRate = 1 - copierProfitShareRate;
  return {
    commissionRate: totalCommissionRate,
    platformCommissionRate: MIVO_PROFIT_SHARE_RATE / totalCommissionRate,
  };
}
