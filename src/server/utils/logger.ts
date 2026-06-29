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
    return { name: value.name, message: value.message }
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactContextValue(item))
  }

  if (value !== null && typeof value === "object") {
    return redactContext(value as LogContext)
  }

  return value
}

function redactContext(context: LogContext): LogContext {
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
    return error.message
  }

  if (typeof error === "string") {
    return error
  }

  return "Unknown error"
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
