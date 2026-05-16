#!/bin/bash
# Enforce: Don't start dev servers directly (assume already running).
# Exception: "timeout 10 bun run dev" for type generation is allowed.
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

# Allow the timeout-wrapped version for type generation
if echo "$COMMAND" | grep -qE 'timeout\s+[0-9]+\s+bun\s+run\s+dev'; then
  exit 0
fi

# Block bare dev server starts
if echo "$COMMAND" | grep -qE '(bun|bunx)\s+run\s+dev(\s|$)'; then
  echo "Blocked: don't start the dev server — it's already running elsewhere. Use 'curl' to test against it. If you need to generate types, use 'timeout 10 bun run dev'." >&2
  exit 2
fi

# Block bun dev / next dev / vite dev etc.
if echo "$COMMAND" | grep -qE '(bun|bunx)\s+(dev|start)(\s|$)'; then
  echo "Blocked: don't start the dev server — it's already running elsewhere. Use 'curl' to test against it." >&2
  exit 2
fi

exit 0
