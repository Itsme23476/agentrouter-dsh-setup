// AgentRouter User-Agent bridge for DeepSeek Harness.
//
// Why this exists:
//   AgentRouter accepts requests only when the User-Agent is EXACTLY
//   "claude-cli/1.0.0 (external, cli)" (Claude Code's native UA). DeepSeek
//   Harness hard-codes its own "deepseek-harness/..." User-Agent and provides
//   no way to override it, so AgentRouter answers every dsh request with
//   401 "unauthorized client detected". This local proxy sits in front of
//   AgentRouter, rewrites the outbound User-Agent, and injects your API key,
//   so dsh can reach AgentRouter's models.
//
//   NOTE: this rewrites the User-Agent to satisfy AgentRouter's client check.
//   It is intended for personal use with your own account and credits. See
//   README.md before relying on it.
//
// It forwards every path unchanged (/v1/chat/completions, /v1/messages,
// /v1/models, ...) and streams responses through untouched (SSE-safe).
//
// Config (env):
//   AR_KEY       required  AgentRouter token (sk-...). Injected as both
//                          `Authorization: Bearer` and `x-api-key`.
//   PORT         default 8788
//   AR_UPSTREAM  default https://agentrouter.org
//   AR_UA        default "claude-cli/1.0.0 (external, cli)"
//
// No external dependencies — Node >=18 built-ins only.

import http from 'node:http'
import https from 'node:https'
import { URL } from 'node:url'

const KEY = process.env.AR_KEY
const PORT = Number(process.env.PORT || 8788)
const UPSTREAM = new URL(process.env.AR_UPSTREAM || 'https://agentrouter.org')
const UA = process.env.AR_UA || 'claude-cli/1.0.0 (external, cli)'

if (!KEY) {
  console.error('[ar-proxy] AR_KEY is not set. Run scripts/setup.sh first, or export AR_KEY.')
  process.exit(1)
}

// Hop-by-hop headers must not be forwarded (RFC 7230 6.1).
const HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade', 'host',
])

const server = http.createServer((clientReq, clientRes) => {
  const headers = {}
  for (const [name, value] of Object.entries(clientReq.headers)) {
    if (!HOP.has(name.toLowerCase())) headers[name] = value
  }
  // The rewrites that make AgentRouter accept the request.
  headers['host'] = UPSTREAM.host
  headers['user-agent'] = UA
  headers['authorization'] = `Bearer ${KEY}`
  headers['x-api-key'] = KEY // used by the Anthropic /v1/messages route

  const options = {
    protocol: UPSTREAM.protocol,
    hostname: UPSTREAM.hostname,
    port: UPSTREAM.port || (UPSTREAM.protocol === 'https:' ? 443 : 80),
    method: clientReq.method,
    path: clientReq.url,
    headers,
  }

  const agent = UPSTREAM.protocol === 'https:' ? https : http
  const upstreamReq = agent.request(options, (upstreamRes) => {
    clientRes.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers)
    upstreamRes.pipe(clientRes)
  })

  upstreamReq.on('error', (err) => {
    console.error('[ar-proxy] upstream error:', err.message)
    if (!clientRes.headersSent) clientRes.writeHead(502, { 'content-type': 'application/json' })
    clientRes.end(JSON.stringify({ error: { message: `proxy upstream error: ${err.message}` } }))
  })

  clientReq.pipe(upstreamReq)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[ar-proxy] listening on http://127.0.0.1:${PORT} -> ${UPSTREAM.origin}`)
  console.log(`[ar-proxy] rewriting User-Agent to: ${UA}`)
  console.log(`[ar-proxy] point DeepSeek Harness base URL at: http://127.0.0.1:${PORT}/v1`)
})
