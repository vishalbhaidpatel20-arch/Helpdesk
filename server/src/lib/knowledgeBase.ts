import path from 'node:path'

const KNOWLEDGE_BASE_PATH = path.resolve(import.meta.dir, '../../knowledge-base.md')

let cached: Promise<string | null> | undefined

// The support knowledge base the AI answers from (server/knowledge-base.md), read once. Null when the file is missing.
export function loadKnowledgeBase() {
  cached ??= (async () => {
    const file = Bun.file(KNOWLEDGE_BASE_PATH)
    return (await file.exists()) ? file.text() : null
  })()
  return cached
}
