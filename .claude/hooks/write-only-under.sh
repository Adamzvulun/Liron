#!/usr/bin/env bash
# PreToolUse guard for an agent's own frontmatter hooks: blocks Write/Edit/NotebookEdit outside
# one folder, and (with --bash-read-only) any Bash command that isn't a read-only allowlisted one.
# Usage: write-only-under.sh <dir relative to the project> [--bash-read-only]
# Exit 2 blocks the tool call; the reason on stderr goes back to the agent.
dir=${1:?usage: write-only-under.sh <dir> [--bash-read-only]}
root=${CLAUDE_PROJECT_DIR:-$(pwd)}
allowed=$(realpath -m "$root/$dir")
input=$(cat)
tool=$(jq -r '.tool_name // empty' <<<"$input" 2>/dev/null)
# Fail closed: a call it can't read (no jq, bad JSON) is blocked.
[ -n "$tool" ] || { echo "blocked: the write guard couldn't read this tool call" >&2; exit 2; }

case "$tool" in
Write | Edit | MultiEdit | NotebookEdit)
  path=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")
  [ -n "$path" ] || { echo "blocked: no file path" >&2; exit 2; }
  case "$path" in /*) ;; *) path="$root/$path" ;; esac
  real=$(realpath -m "$path")
  case "$real/" in "$allowed"/*) exit 0 ;; esac
  echo "blocked: this agent may write only under $dir/ (asked for $path)" >&2
  exit 2
  ;;
Bash)
  [ "$2" = --bash-read-only ] || exit 0
  cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
  [ -n "$cmd" ] || { echo "blocked: empty command" >&2; exit 2; }
  # One line, no redirects, chains, substitutions, variables or backgrounding.
  if [[ "$cmd" == *$'\n'* || "$cmd" == *$'\r'* ]] || grep -qE '[<>;&`$\\]' <<<"$cmd"; then
    echo "blocked: read-only Bash here (one line; no < > ; & \` \$ or backslashes)" >&2
    exit 2
  fi
  # git's flags that write a file or run a configured program.
  if grep -qE -- '--output|--ext-diff|--textconv|--exec|--upload-pack' <<<"$cmd"; then
    echo "blocked: that git flag can write or run programs" >&2
    exit 2
  fi
  IFS='|' read -ra parts <<<"$cmd"
  for p in "${parts[@]}"; do
    read -ra w <<<"$p"
    case "${w[0]}" in
    git) [[ "${w[1]}" =~ ^(log|show|diff|shortlog|blame|status)$ ]] || { echo "blocked: git ${w[1]} isn't read-only" >&2; exit 2; } ;;
    graphify) [[ "${w[1]}" =~ ^(query|affected|explain|path)$ ]] || { echo "blocked: graphify ${w[1]} isn't allowed" >&2; exit 2; } ;;
    wc | ls | cat | head | tail | grep) ;;
    *) echo "blocked: '${w[0]}' isn't on this agent's read-only list" >&2; exit 2 ;;
    esac
  done
  exit 0
  ;;
esac
exit 0
