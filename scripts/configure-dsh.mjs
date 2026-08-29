// Configure DeepSeek Harness to use AgentRouter (via the local proxy).
//
// Writes an `agentrouter` custom provider into ~/.dsh/settings.yaml and a
// placeholder credential into ~/.dsh/.credentials.yaml. The REAL API key never
// touches these files — it lives only in proxy/.key, and the proxy injects it.
//
// Conservative and idempotent: it never overwrites an existing agentrouter
// provider, and if it cannot safely merge into an existing `llm-pi-ai` block it
// prints the snippet for you to paste rather than risk corrupting your config.
//
// No dependencies — Node built-ins only. dsh hot-reloads settings.yaml, so
// changes take effect without a restart.

import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const SETTINGS = join(DSH_HOME, 'settings.yaml')
const CREDS = join(DSH_HOME, '.credentials.yaml')

mkdirSync(DSH_HOME, { recursive: true })

const PROVIDER_BLOCK = `llm-pi-ai:
  providers:
    agentrouter:
      displayName: AgentRouter
      apiKeyEnv: AGENTROUTER_API_KEY
      api: openai-completions
      baseURL: http://127.0.0.1:8788/v1
      compat:
        supportsDeveloperRole: false
        maxTokensField: max_tokens
      models:
        - id: claude-opus-5
        - id: claude-opus-4-8
        - id: deepseek-v4-flash
        - id: glm-5.3
        - id: gpt-5.6-sol
`

const DEFAULT_MODEL_BLOCK = `agent-default-model:
  provider: agentrouter
  model: deepseek-v4-flash
`

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

// --- settings.yaml ---
let settings = read(SETTINGS)
if (/^\s{4}agentrouter:/m.test(settings)) {
  console.log('settings.yaml: agentrouter provider already present — leaving it unchanged.')
} else if (/^llm-pi-ai:/m.test(settings)) {
  console.log('settings.yaml already has an `llm-pi-ai:` block. To avoid corrupting it,')
  console.log('add this provider under llm-pi-ai > providers manually:\n')
  console.log(PROVIDER_BLOCK.split('\n').slice(1).join('\n'))
} else {
  if (settings.length && !settings.endsWith('\n')) settings += '\n'
  settings += PROVIDER_BLOCK
  writeFileSync(SETTINGS, settings, 'utf8')
  console.log('settings.yaml: added AgentRouter provider with 5 models.')
}

// Optional: set a default model if none is configured (cheapest model, to be safe).
settings = read(SETTINGS)
if (!/^agent-default-model:/m.test(settings)) {
  if (settings.length && !settings.endsWith('\n')) settings += '\n'
  settings += DEFAULT_MODEL_BLOCK
  writeFileSync(SETTINGS, settings, 'utf8')
  console.log('settings.yaml: default model set to deepseek-v4-flash (cheapest; billed per token). Change it in-app anytime.')
}

// --- .credentials.yaml (placeholder only; proxy injects the real key) ---
let creds = read(CREDS)
if (/AGENTROUTER_API_KEY:/.test(creds)) {
  console.log('.credentials.yaml: AGENTROUTER_API_KEY already present — leaving it unchanged.')
} else if (!creds.trim()) {
  writeFileSync(CREDS, 'version: 1\nrefs:\n  AGENTROUTER_API_KEY: managed-by-proxy\n', 'utf8')
  console.log('.credentials.yaml: created with placeholder credential.')
} else if (/^refs:/m.test(creds)) {
  creds = creds.replace(/^refs:\s*$/m, 'refs:\n  AGENTROUTER_API_KEY: managed-by-proxy')
  writeFileSync(CREDS, creds, 'utf8')
  console.log('.credentials.yaml: added placeholder credential under refs.')
} else {
  if (!creds.endsWith('\n')) creds += '\n'
  creds += 'refs:\n  AGENTROUTER_API_KEY: managed-by-proxy\n'
  writeFileSync(CREDS, creds, 'utf8')
  console.log('.credentials.yaml: appended refs with placeholder credential.')
}

console.log('\nDeepSeek Harness is configured. Your real key stays in proxy/.key only.')
