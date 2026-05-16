#!/bin/bash
# Enforce: Always use bun/bunx, never npm/npx/yarn
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

if echo "$COMMAND" | grep -qE '(^|\s|&&|\|\||;)(npm|npx|yarn)\s'; then
  echo "Blocked: use 'bun' or 'bunx' instead of npm/npx/yarn." >&2
  exit 2
fi

exit 0
