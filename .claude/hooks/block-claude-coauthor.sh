#!/bin/bash
# Enforce: Don't add "Co-Authored-By: Claude ..." trailers to commit messages.
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

# Only inspect git commit invocations.
if ! echo "$COMMAND" | grep -qE '\bgit\s+commit\b'; then
  exit 0
fi

# Case-insensitive match on the Co-Authored-By: Claude trailer.
if echo "$COMMAND" | grep -qiE 'co-authored-by:\s*claude'; then
  echo "Blocked: do not add 'Co-Authored-By: Claude' trailers to commit messages. Remove the trailer and retry." >&2
  exit 2
fi

exit 0
