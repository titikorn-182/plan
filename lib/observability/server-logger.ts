import "server-only";

export type LogContext = Readonly<Record<string, string | number | boolean | null | undefined>>;

type ErrorDetails = {
  name: string;
  message: string;
  code?: string;
  digest?: string;
};

function getStringProperty(value: object, property: string): string | undefined {
  if (!(property in value)) return undefined;
  const candidate = value[property as keyof typeof value];
  return typeof candidate === "string" ? candidate : undefined;
}

function normalizeError(error: unknown): ErrorDetails {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      code: getStringProperty(error, "code"),
      digest: getStringProperty(error, "digest"),
    };
  }
  if (typeof error === "object" && error !== null) {
    return {
      name: "NonErrorObject",
      message: getStringProperty(error, "message") ?? "Unknown server error",
      code: getStringProperty(error, "code"),
      digest: getStringProperty(error, "digest"),
    };
  }
  return { name: "UnknownError", message: String(error) };
}

export function reportServerError(
  operation: string,
  error: unknown,
  context: LogContext = {},
): string {
  const eventId = crypto.randomUUID();
  const record = {
    level: "error",
    eventId,
    timestamp: new Date().toISOString(),
    operation,
    error: normalizeError(error),
    context,
  };

  console.error("[application-error]", JSON.stringify(record));
  return eventId;
}

export function publicFailureMessage(eventId: string): string {
  return `ระบบไม่สามารถดำเนินการได้ในขณะนี้ กรุณาลองใหม่ (รหัส ${eventId.slice(0, 8)})`;
}
