import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { isOverloaded } from './aiError'

// Tried in order; the next one is used only when the previous is overloaded or rate limited
export const MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite']

export async function generateWithFallback(options: { instructions: string; prompt: string }) {
  for (const [i, id] of MODELS.entries()) {
    try {
      const { text } = await generateText({ ...options, model: google(id), maxRetries: 1 })
      return text.trim()
    } catch (err) {
      if (!isOverloaded(err) || i === MODELS.length - 1) throw err
      console.warn(`${id} is overloaded, trying ${MODELS[i + 1]}`)
    }
  }
  throw new Error('unreachable')
}
