#!/bin/sh
# Stop the proxy (port 8788) and DeepSeek Harness (port 3080).
PORT="${PORT:-8788}"
DSH_PORT="${DSH_PORT:-3080}"
killed=0
for p in "$PORT" "$DSH_PORT"; do
  pids="$(lsof -ti tcp:"$p" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill 2>/dev/null || true
    echo "Stopped process(es) on port $p."
    killed=1
  fi
done
[ "$killed" -eq 0 ] && echo "Nothing was running on ports $PORT / $DSH_PORT."
exit 0
