export function getCopyTradingBrokerConfig() {
  const brokerName = process.env.MIVO_COPY_TRADING_BROKER_NAME?.trim().slice(0, 100) || null;
  const configuredUrl = process.env.MIVO_COPY_TRADING_BROKER_SIGNUP_URL?.trim();
  let signupUrl: string | null = null;

  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      if (url.protocol === "https:" && !url.username && !url.password) signupUrl = url.toString();
    } catch {
      // Invalid or non-HTTPS broker links stay unavailable to providers.
    }
  }

  return { brokerName, signupUrl };
}
