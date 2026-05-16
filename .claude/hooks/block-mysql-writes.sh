#!/bin/bash
# Enforce: mysql client invocations may only run read-only statements.
# Blocks any DML/DDL keyword (INSERT/UPDATE/DELETE/DROP/CREATE/ALTER/...)
# in commands that look like mysql client invocations.
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

# Only inspect commands that actually run the mysql client.
# Match `mysql ` or `mysql\n` or `mysql<EOL>` and also `docker exec ... mysql `.
if ! echo "$COMMAND" | grep -qiE '(^|[^[:alnum:]_-])mysql([[:space:]]|$)'; then
  exit 0
fi

# Allow local-dev connections (127.0.0.1 / localhost). This DB is the user's
# local Remindly DB and writes are expected.
if echo "$COMMAND" | grep -qE -- '-h[[:space:]]*(127\.0\.0\.1|localhost)\b|--host=(127\.0\.0\.1|localhost)\b'; then
  exit 0
fi

# Allowlist: read-only statements only.
# Forbidden keywords (case-insensitive, word-boundary).
FORBIDDEN='\b(INSERT|UPDATE|DELETE|REPLACE|DROP|CREATE|ALTER|TRUNCATE|RENAME|GRANT|REVOKE|LOAD[[:space:]]+DATA|LOCK|UNLOCK|CALL|HANDLER|SET[[:space:]]+(GLOBAL|PERSIST|@@)|FLUSH|RESET|KILL|OPTIMIZE|REPAIR|ANALYZE|CHECK|INSTALL|UNINSTALL|START[[:space:]]+TRANSACTION|BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE|XA)\b'

if echo "$COMMAND" | grep -qiP "$FORBIDDEN"; then
  echo "Blocked: mysql client is restricted to read-only queries (SELECT / SHOW / DESCRIBE / EXPLAIN). Detected a write/DDL/transaction keyword in the command." >&2
  exit 2
fi

# Also block dangerous client flags that could execute scripts.
if echo "$COMMAND" | grep -qE '(^|[[:space:]])--init-command='; then
  echo "Blocked: --init-command on the mysql client is not allowed against prod." >&2
  exit 2
fi

exit 0
