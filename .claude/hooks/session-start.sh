#!/usr/bin/env bash
# SessionStart hook: rebuilds the tools a fresh cloud container lacks (graphify, its git hooks,
# the code graph) and prints one status line. Idempotent and fast when all is in place. A failed
# step logs and the rest go on: this hook never fails the session.
# Registered in .claude/settings.json. Remove both to uninstall (see docs/process/RUNNING.md).

GRAPHIFY_SPEC='graphifyy[sql]==0.9.108' # pinned: two weeks old or more (ADR 0030)
GRAPHIFY_VERSION='0.9.108'
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG="$ROOT/graphify-out/session-start.log"
cd "$ROOT" || exit 0
mkdir -p graphify-out
: >"$LOG"
step() { echo "[$(date +%T)] $*" >>"$LOG"; }
fail() { echo "session-start: $*" >&2; step "FAILED: $*"; }

export PATH="$HOME/.local/bin:$PATH"
if [ -n "$CLAUDE_ENV_FILE" ] && ! grep -qs 'HOME/.local/bin' "$CLAUDE_ENV_FILE"; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >>"$CLAUDE_ENV_FILE"
fi

# a. uv. Its standalone installer downloads from GitHub releases, which the cloud proxy may
# refuse; PyPI is allowed, so pip is the fallback.
if ! command -v uv >/dev/null 2>&1; then
  step "installing uv"
  { curl -LsSf https://astral.sh/uv/install.sh | sh >>"$LOG" 2>&1 && command -v uv >/dev/null; } ||
    python3 -m pip install --user --quiet uv >>"$LOG" 2>&1 ||
    fail "uv could not be installed (see $LOG)"
fi

# b. graphify, at the pinned version.
have=$(graphify --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
if [ "$have" != "$GRAPHIFY_VERSION" ] && command -v uv >/dev/null 2>&1; then
  step "installing $GRAPHIFY_SPEC (had: ${have:-none})"
  uv tool install --force "$GRAPHIFY_SPEC" >>"$LOG" 2>&1 || fail "graphify install failed (see $LOG)"
fi

if command -v graphify >/dev/null 2>&1; then
  # c. Git hooks live in .git/hooks, which a fresh clone lacks.
  graphify hook status 2>/dev/null | grep -qi 'not installed' && {
    step "installing graphify git hooks"
    graphify hook install >>"$LOG" 2>&1 || fail "graphify hook install failed"
  }
  # graphify's PreToolUse hooks in settings.json call bare `graphify`, found on PATH, so a
  # new install location needs no refresh. Re-register them only if they've gone missing.
  grep -q 'hook-guard' .claude/settings.json || {
    step "re-registering graphify's project hooks"
    graphify install --project --platform claude >>"$LOG" 2>&1 || fail "graphify install --project failed"
  }

  # d. The graph: a quick update if one exists, else a code-only build (about 10 s here).
  # In the background if it runs past 60 s, so the session never waits long.
  if [ -f graphify-out/graph.json ]; then build=(graphify update .); else build=(graphify extract . --code-only); fi
  step "${build[*]}"
  # setsid: a build still running when this hook exits keeps going in its own session.
  setsid bash -c '"$@" && graphify cluster-only . --no-viz --no-label && date -u +%FT%TZ >graphify-out/.built_at' \
    _ "${build[@]}" >>"$LOG" 2>&1 </dev/null &
  pid=$!
  for _ in $(seq 60); do kill -0 "$pid" 2>/dev/null || break; sleep 1; done
  if kill -0 "$pid" 2>/dev/null; then graph_note="still building in the background"
  elif ! wait "$pid"; then fail "${build[*]} failed (see $LOG)"; graph_note="build FAILED"; fi
else
  fail "graphify is not on PATH"
fi

# e. Ponytail comes from Adam's claude.ai account (synced); a repo can't load a plugin mid-session.
if ls "$HOME"/.claude/plugins/synced/*/ponytail >/dev/null 2>&1 ||
  grep -qs '"ponytail@' "$HOME/.claude/plugins/installed_plugins.json"; then
  ponytail=on
elif [ -f .claude/skills/ponytail/SKILL.md ]; then
  # No plugin (e.g. a session started by another session): the repo's copy of its skills
  # loads anyway, and its rules go into this session's context, as the plugin's own hook does.
  ponytail="on (from the repo; the plugin isn't loaded)"
  echo "PONYTAIL MODE ACTIVE — level: full (from .claude/skills/ponytail)"
  sed '1,/^---$/{/^---$/!d};1,/^---$/d' .claude/skills/ponytail/SKILL.md
else
  ponytail="OFF (add it at claude.ai/customize/plugins, then start a new session)"
fi

# f. One status line.
gv=$(graphify --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
if [ -n "$graph_note" ]; then fresh="$graph_note"
elif [ -f graphify-out/.built_at ]; then fresh="updated $(cat graphify-out/.built_at)"
else fresh="missing"; fi
acw=$(grep -oE '"autoCompactWindow": *[0-9]+' .claude/settings.json | grep -oE '[0-9]+$')
echo "Session setup: graphify ${gv:-missing} · graph ${fresh} · ponytail ${ponytail} · autoCompactWindow ${acw:-unset}${CLAUDE_CODE_AUTO_COMPACT_WINDOW:+ (env override ${CLAUDE_CODE_AUTO_COMPACT_WINDOW}!)}"
exit 0
