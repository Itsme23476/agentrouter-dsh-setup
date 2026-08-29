#!/bin/sh
# Start the AgentRouter proxy, then DeepSeek Harness.
#
# The proxy reads its key from proxy/.key (run scripts/setup.sh first).
# DeepSeek Harness must already be installed & built. Point this at it with:
#   DSH_DIR=/path/to/deepseek-harness sh scripts/start.sh
# If DSH_DIR is not set, the proxy still starts and the dsh command is printed.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY_FILE="$ROOT/proxy/.key"
PORT="${PORT:-8788}"

if [ ! -f "$KEY_FILE" ] || [ ! -s "$KEY_FILE" ]; then
  echo "No key found at proxy/.key. Run: sh scripts/setup.sh"
  exit 1
fi

# Start the proxy in the background if it is not already listening.
if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Proxy already listening on port $PORT."
else
  AR_KEY="$(cat "$KEY_FILE")" PORT="$PORT" nohup node "$ROOT/proxy/proxy.mjs" > "$ROOT/proxy.log" 2>&1 &
  echo "Started proxy on http://127.0.0.1:$PORT (logs: proxy.log)"
fi

# Start DeepSeek Harness if we know where it lives.
if [ -n "$DSH_DIR" ] && [ -d "$DSH_DIR" ]; then
  echo "Launching DeepSeek Harness from $DSH_DIR ..."
  cd "$DSH_DIR"
  # Use corepack's pinned pnpm; add the repo's own pnpm shim to PATH if present.
  [ -d "$DSH_DIR/.shim-bin" ] && PATH="$DSH_DIR/.shim-bin:$PATH"
  export PATH
  COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm dsh web
else
  echo
  echo "Proxy is up. Now start DeepSeek Harness from its own folder, e.g.:"
  echo "  cd /path/to/deepseek-harness && corepack pnpm dsh web"
  echo "Then open the http://127.0.0.1:3080/?token=... URL it prints."
fi
