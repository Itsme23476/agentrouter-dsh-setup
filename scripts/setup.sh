#!/bin/sh
# Interactive setup: ask for the AgentRouter API key, store it locally
# (git-ignored), then configure DeepSeek Harness to use it via the proxy.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY_FILE="$ROOT/proxy/.key"

echo "== AgentRouter + DeepSeek Harness setup =="
echo

# 1) Collect the API key (hidden input) unless already present.
if [ -f "$KEY_FILE" ] && [ -s "$KEY_FILE" ]; then
  echo "A key is already stored at proxy/.key — keeping it."
  echo "Delete that file and re-run if you want to replace it."
else
  printf "Paste your AgentRouter API key (starts with sk-...): "
  stty -echo 2>/dev/null || true
  read AR_KEY
  stty echo 2>/dev/null || true
  echo
  case "$AR_KEY" in
    sk-*) : ;;
    *) echo "That does not look like an AgentRouter key (should start with sk-). Aborting."; exit 1 ;;
  esac
  umask 077
  printf '%s' "$AR_KEY" > "$KEY_FILE"
  chmod 600 "$KEY_FILE"
  echo "Saved key to proxy/.key (git-ignored, permissions 600)."
fi

# 2) Write the DeepSeek Harness provider config.
if command -v node >/dev/null 2>&1; then
  echo
  echo "Configuring DeepSeek Harness (~/.dsh/settings.yaml)..."
  node "$ROOT/scripts/configure-dsh.mjs" || {
    echo "Automatic dsh config did not complete — see dsh/settings.provider.yaml to add it manually."
  }
else
  echo "node not found; skipping dsh config. Install Node 22+, then re-run."
fi

echo
echo "Setup done. Next:"
echo "  1) Start everything:   sh scripts/start.sh"
echo "  2) Open the dsh URL it prints, choose a workspace, pick a model, chat."
echo "  3) Stop everything:    sh scripts/stop.sh"
