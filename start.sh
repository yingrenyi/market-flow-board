#!/usr/bin/env sh
set -eu

if command -v node >/dev/null 2>&1; then
  NODE_BIN="node"
elif [ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]; then
  NODE_BIN="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
else
  echo "Node.js was not found. Install Node.js 18+ or run inside Codex Desktop." >&2
  exit 1
fi

exec "$NODE_BIN" server.js
