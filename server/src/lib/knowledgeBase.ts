import path from 'node:path'

// Next to the source in development; under the working directory when Vercel bundles the function (vercel.json
// includeFiles copies server/knowledge-base.md into it)
const CANDIDATE_PATHS = [
  path.resolve(import.meta.dir, '../../knowledge-base.md'),
  path.resolve(process.cwd(), 'server/knowledge-base.md'),
]

let cached: Promise<string | null> | undefined

// The support knowledge base the AI answers from (server/knowledge-base.md), read once. Null when the file is missing.
export function loadKnowledgeBase() {
  cached ??= (async () => {
    for (const candidate of CANDIDATE_PATHS) {
      const file = Bun.file(candidate)
      if (await file.exists()) return file.text()
    }
    return null
  })()
  return cached
}
