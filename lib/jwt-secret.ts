export function getJwtSecret() {
  const configuredSecret = process.env.JWT_SECRET?.trim();
  if (!configuredSecret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set for production authentication.");
  }
  return configuredSecret || "mivo-secret-key";
}
