#!/usr/bin/env bash
# Auto-format files edited by Claude Code.
# Reads the tool event JSON from stdin, extracts file_path,
# and runs eslint --fix + prettier --write in the appropriate sub-project.
# Silent on errors (formatters shouldn't block agent work).

set -u
FILE=$(jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
[ -z "${FILE:-}" ] && exit 0

case "$FILE" in
  */backend/*.ts)
    (cd backend && npx --no-install eslint --fix "$FILE" >/dev/null 2>&1; npx --no-install prettier --write "$FILE" >/dev/null 2>&1) || true
    ;;
  */frontend/*.ts|*/frontend/*.vue|*/frontend/*.mjs|*/frontend/*.js|*/frontend/*.cjs)
    (cd frontend && npx --no-install eslint --fix "$FILE" >/dev/null 2>&1; npx --no-install prettier --write "$FILE" >/dev/null 2>&1) || true
    ;;
esac

exit 0
