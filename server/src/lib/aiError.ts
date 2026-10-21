function providerError(err: unknown) {
  // The AI SDK wraps the provider error after retries (RetryError.lastError)
  const cause = (err as { lastError?: unknown } | null)?.lastError ?? err
  return (cause ?? {}) as { statusCode?: number; message?: unknown }
}

// Overloaded or rate limited (503/429): temporary, so another model may still answer
export function isOverloaded(err: unknown) {
  const { statusCode } = providerError(err)
  return statusCode === 429 || statusCode === 503
}

// The message to show the agent when an AI provider call fails. Overload and rate-limit messages are safe and
// useful to show as is. Anything else (bad key, no credits, ...) stays generic so provider details don't reach the browser.
export function aiErrorMessage(err: unknown, fallback: string) {
  const { message } = providerError(err)
  return isOverloaded(err) && typeof message === 'string' && message ? message : fallback
}
