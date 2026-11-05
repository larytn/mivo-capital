type DatabaseErrorShape = {
  code?: unknown;
  errorCode?: unknown;
  meta?: { code?: unknown };
  cause?: DatabaseErrorShape;
};

function databaseErrorCode(error: unknown): string | undefined {
  let current = error as DatabaseErrorShape | null;
  let depth = 0;

  while (current && typeof current === "object" && depth < 6) {
    const code = [current.code, current.errorCode, current.meta?.code].find(
      (candidate): candidate is string => typeof candidate === "string",
    );
    if (code) return code;
    current = current.cause ?? null;
    depth += 1;
  }

  const message = error instanceof Error ? error.message : "";
  return message.match(/\bP\d{4}\b/)?.[0];
}

/** Return a safe, actionable message without exposing connection details. */
export function databaseErrorMessage(error: unknown, feature: string) {
  const code = databaseErrorCode(error);

  if (["P1001", "P1002", "P1017", "08000", "08003", "08006"].includes(code || "")) {
    return `${feature} cannot reach the database. Check DATABASE_URL and database network access.`;
  }

  if (code === "P1011") {
    return `${feature} could not establish a secure database connection. Check the database SSL settings.`;
  }

  if (["P2021", "P2022", "42P01", "42703"].includes(code || "")) {
    if (feature === "Chat") {
      return "Chat is not ready because its database table has not been set up. The site administrator must apply the chat database update.";
    }
    return `${feature} database tables are missing or out of date. Run npm run db:sync:ecosystem, then restart or redeploy.`;
  }

  return `${feature} could not be completed. Check the server log for the database error.`;
}
