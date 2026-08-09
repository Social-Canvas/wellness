import "server-only"

type LogLevel = "info" | "warn" | "error"

type LogContext = Record<string, unknown>

const SENSITIVE_KEY_SUBSTRINGS = [
  "password",
  "token",
  "secret",
  "key",
  "authorization",
  "cookie",
  "signedurl",
  "payment",
  "card",
] as const

const REDACTED = "[REDACTED]"

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase()

  return SENSITIVE_KEY_SUBSTRINGS.some((substring) => normalized.includes(substring))
}

function redactContextValue(value: unknown, key?: string): unknown {
  if (key && isSensitiveKey(key)) {
    return REDACTED
  }

  if (value instanceof Error) {
    return providerFieldsFromUnknown(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactContextValue(item))
  }

  if (value !== null && typeof value === "object") {
    return redactContext(value as LogContext)
  }

  return value
}

function isErrorLike(value: unknown): value is Error & Record<string, unknown> {
  return value instanceof Error
}

function providerFieldsFromUnknown(error: unknown): LogContext {
  if (!error || typeof error !== "object") {
    return { message: safeErrorMessage(error) }
  }

  const record = error as Record<string, unknown>
  const message =
    typeof record.message === "string" && record.message.trim().length > 0
      ? record.message
      : error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Unknown error"

  return {
    message,
    ...(typeof record.code === "string" && record.code
      ? { code: record.code }
      : {}),
    ...(typeof record.details === "string" && record.details
      ? { details: record.details }
      : {}),
    ...(typeof record.hint === "string" && record.hint
      ? { hint: record.hint }
      : {}),
    ...(typeof record.name === "string" && record.name
      ? { name: record.name }
      : {}),
  }
}

function redactContext(context: LogContext): LogContext {
  // PostgREST / Auth errors often put `message` on Error as non-enumerable.
  // Object.entries alone can yield a misleading empty-looking context.
  if (isErrorLike(context)) {
    return redactContext(providerFieldsFromUnknown(context))
  }

  const redacted: LogContext = {}

  for (const [key, value] of Object.entries(context)) {
    redacted[key] = redactContextValue(value, key)
  }

  return redacted
}

function writeLog(level: LogLevel, message: string, context?: LogContext): void {
  const redactedContext = context ? redactContext(context) : undefined
  const isDevelopment = process.env.NODE_ENV === "development"

  if (isDevelopment) {
    if (redactedContext) {
      console[level === "info" ? "log" : level](message, redactedContext)
      return
    }

    console[level === "info" ? "log" : level](message)
    return
  }

  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(redactedContext ? { context: redactedContext } : {}),
  }

  console[level === "info" ? "log" : level](JSON.stringify(entry))
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || "Unknown error"
  }

  if (typeof error === "string") {
    return error
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message
    }
  }

  return "Unknown error"
}

/** Plain, enumerable fields from Supabase/PostgREST-style errors for logging. */
export function providerErrorFields(error: unknown): {
  message: string
  code: string | null
  details: string | null
  hint: string | null
} {
  const fields = providerFieldsFromUnknown(error)
  return {
    message: typeof fields.message === "string" ? fields.message : "Unknown error",
    code: typeof fields.code === "string" ? fields.code : null,
    details: typeof fields.details === "string" ? fields.details : null,
    hint: typeof fields.hint === "string" ? fields.hint : null,
  }
}

export const logger = {
  info(message: string, context?: LogContext): void {
    writeLog("info", message, context)
  },

  warn(message: string, context?: LogContext): void {
    writeLog("warn", message, context)
  },

  error(message: string, context?: LogContext): void {
    writeLog("error", message, context)
  },
}
