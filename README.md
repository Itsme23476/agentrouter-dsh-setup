# AgentRouter × DeepSeek Harness (personal setup)

A small kit that lets [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
(`dsh`) use models from an [AgentRouter](https://agentrouter.org) account —
Claude Opus 5 / 4.8, DeepSeek V4 Flash, GLM, GPT — with your own API key.

> **Private / personal use.** This is a backup of a working local setup. Read
> the caveat below before doing anything with it beyond your own machine.

---

## What this actually does (read this)

DeepSeek Harness is open source and provider-agnostic — it will talk to any
OpenAI-compatible endpoint. It does **not** block anything.

The catch is on **AgentRouter's** side: AgentRouter only accepts requests whose
`User-Agent` is exactly `claude-cli/1.0.0 (external, cli)` (Claude Code's native
UA). dsh sends its own `deepseek-harness/…` UA, which AgentRouter rejects with
`401 unauthorized client detected`. dsh gives no way to change that header.

So this kit runs a **local proxy** (`proxy/proxy.mjs`) that sits in front of
AgentRouter and rewrites the outbound `User-Agent` to the one AgentRouter
expects (and injects your key). dsh points at the proxy instead of at
AgentRouter directly.

**Caveat:** rewriting the User-Agent circumvents AgentRouter's client check.
That check is something AgentRouter put there on purpose. This is fine for
personal use of your own account and credits, but it may be against
AgentRouter's terms, and if they enforce it your account/credits could be
suspended. The clean long-term fix is for AgentRouter to allow dsh's client
directly (then the proxy becomes unnecessary and you can point dsh straight at
`https://agentrouter.org/v1`). Don't redistribute this expecting it to keep
working.

---

## Prerequisites

- **Node.js 22.19+ or 24+** (`node -v`)
- **DeepSeek Harness** installed *and built* somewhere on your machine:
  ```sh
  git clone https://github.com/deepseek-ai/deepseek-harness.git
  cd deepseek-harness && corepack pnpm install && corepack pnpm run build
  ```
- An **AgentRouter account + API token** (from https://agentrouter.org/console → API Token)

## Setup (asks for your API key)

```sh
sh scripts/setup.sh
```
It prompts for your AgentRouter token (hidden input), stores it in `proxy/.key`
(git-ignored, `chmod 600`), and writes the AgentRouter provider into
`~/.dsh/settings.yaml`. Your real key never leaves `proxy/.key`.

## Run it

Start the proxy (and dsh, if you tell it where dsh lives):
```sh
DSH_DIR=/path/to/deepseek-harness sh scripts/start.sh
```
Open the `http://127.0.0.1:3080/?token=…` URL it prints, click **Choose
workspace**, pick a folder, then pick a model in the composer and chat.

Both the proxy and dsh must be running. Stop everything with:
```sh
sh scripts/stop.sh
```

## Models

Your AgentRouter `default` group exposes these (via the proxy):

| Model ID | Notes |
|---|---|
| `deepseek-v4-flash` | DeepSeek, reasoning, **cheapest** of the five (per-token, base rate) |
| `claude-opus-5` | Anthropic, uses credits |
| `claude-opus-4-8` | Anthropic, uses credits |
| `glm-5.3` | Zhipu, uses credits |
| `gpt-5.6-sol` | OpenAI, uses credits |

**Nothing here is free.** Every model is billed per token and draws down your
AgentRouter balance; `deepseek-v4-flash` is simply the cheapest (base rate),
while `claude-opus-5` / `claude-opus-4-8` cost roughly 4× on input and ~6× on
output. See exact deductions in your AgentRouter console → **Usage log**.

Switch models per session from the composer's model picker — they're all there
at once, no restart needed. Run `configure-dsh.mjs` again after AgentRouter adds
models, or use **Settings → Models → AgentRouter → Fetch available models** in
the app.

## Files

| Path | Purpose |
|---|---|
| `proxy/proxy.mjs` | The User-Agent bridge (no dependencies) |
| `scripts/setup.sh` | Prompts for the key, stores it, configures dsh |
| `scripts/configure-dsh.mjs` | Writes the dsh provider into `~/.dsh/settings.yaml` |
| `scripts/start.sh` / `stop.sh` | Launch / stop proxy + dsh |
| `dsh/settings.provider.yaml` | Reference copy of the provider config |
| `PROMPT.md` | A prompt to hand this repo to Claude for setup |

## Troubleshooting

- **`401 unauthorized client detected`** — a request reached AgentRouter without
  the rewritten UA (proxy not running, or dsh base URL isn't the proxy). Confirm
  `sh scripts/start.sh` shows the proxy listening on 8788, and that
  `~/.dsh/settings.yaml` `baseURL` is `http://127.0.0.1:8788/v1`.
- **`address already in use`** — a proxy or dsh is already running on that port.
  `sh scripts/stop.sh` then start again.
- **`MISSING_CREDENTIAL`** — `~/.dsh/.credentials.yaml` has no
  `AGENTROUTER_API_KEY`. Re-run `sh scripts/setup.sh`.
- **A reasoning model errors** — the `compat` block (`supportsDeveloperRole:
  false`, `maxTokensField: max_tokens`) handles the common cases; it's already
  in the provider config.

## Security

- Your API key lives only in `proxy/.key` (git-ignored). It is **never** written
  to `~/.dsh/settings.yaml` or committed — dsh sends a placeholder and the proxy
  injects the real key.
- The proxy binds to `127.0.0.1` only. Nothing is exposed off your machine.
