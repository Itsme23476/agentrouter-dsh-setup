# Claude setup prompt

Paste this to Claude Code (or any coding agent) from inside this repo folder,
**after** you have DeepSeek Harness installed and built somewhere on your machine.

---

I have DeepSeek Harness installed and I want to use my AgentRouter account's
models inside it. This repo contains a local proxy that bridges dsh to
AgentRouter. Please set it up for me:

1. Run `sh scripts/setup.sh` and let me paste my AgentRouter API key when it
   asks. (The key must only go into `proxy/.key`, which is git-ignored — never
   commit it or print it back to me.)
2. That writes the AgentRouter provider into my `~/.dsh/settings.yaml` via
   `scripts/configure-dsh.mjs`. Confirm the provider and its 5 models are there.
3. Start the proxy, then start DeepSeek Harness (`corepack pnpm dsh web` from my
   dsh folder). Give me the `http://127.0.0.1:3080/?token=...` URL.
4. Tell me to choose a workspace and pick a model (deepseek-v4-flash is free;
   claude-opus-5 and claude-opus-4-8 use credits).

Before doing any of this, read `README.md` in this repo so you understand what
the proxy does and the caveat about AgentRouter's client check.
