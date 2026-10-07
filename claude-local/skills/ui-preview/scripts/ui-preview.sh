#!/usr/bin/env bash
# ui-preview: render frontend components in isolation (Vite, no Next.js) and screenshot them.
#
#   ui-preview.sh start  [--repo PATH] [--app mercur]   install harness + start server (idempotent)
#   ui-preview.sh stop   [--repo PATH] [--app mercur]
#   ui-preview.sh status [--repo PATH] [--app mercur]
#   ui-preview.sh path   [--repo PATH] [--app mercur]   print harness dir (scenarios/ lives there)
#   ui-preview.sh context [--repo PATH] [--base origin/dev] [file...]   pre-digest the change for scenarios
#   ui-preview.sh shoot  [--repo PATH] [--app mercur] [--out DIR] [--viewport WxH] [--scale N] [target...]
#                        target = scenario id or scenario:state; default = every state of every scenario
#
# --repo defaults to the git toplevel of $PWD (works in worktrees). The harness is
# copied to <repo>/apps/<app>/.ui-preview/, which is added to .git/info/exclude so
# it never shows up in git status.
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cmd="${1:-}"; shift || true

repo=""; app="mercur"; rest=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) repo="$2"; shift 2 ;;
    --app) app="$2"; shift 2 ;;
    *) rest+=("$1"); shift ;;
  esac
done

repo="${repo:-$(git rev-parse --show-toplevel 2>/dev/null || true)}"
[[ -n "$repo" && -f "$repo/turbo.json" ]] || { echo "error: not inside the frontend monorepo (pass --repo)" >&2; exit 1; }
repo="$(cd "$repo" && pwd)"
app_dir="$repo/apps/$app"
[[ -d "$app_dir" ]] || { echo "error: no app at $app_dir" >&2; exit 1; }
[[ -f "$SKILL_DIR/harness/src/apps/$app.tsx" ]] || { echo "error: no provider tree for app '$app' (add harness/src/apps/$app.tsx)" >&2; exit 1; }
dest="$app_dir/.ui-preview"
state_file="$dest/server.json"

server_pid() { [[ -f "$state_file" ]] && sed -n 's/.*"pid": *\([0-9]*\).*/\1/p' "$state_file"; }
server_port() { [[ -f "$state_file" ]] && sed -n 's/.*"port": *\([0-9]*\).*/\1/p' "$state_file"; }
is_up() {
  local pid port; pid="$(server_pid)"; port="$(server_port)"
  [[ -n "$pid" && -n "$port" ]] && kill -0 "$pid" 2>/dev/null \
    && curl -fsS "http://127.0.0.1:$port/__ui-preview/health" >/dev/null 2>&1
}

install_harness() {
  mkdir -p "$dest/scenarios" "$dest/mocks"
  # Harness code is always refreshed; agent-owned files (scenarios, mocks, outputs) are kept.
  rsync -a --delete \
    --exclude scenarios/ --exclude mocks/ --exclude mocks.json --exclude out/ \
    --exclude .vite/ --exclude server.json --exclude vite.log \
    "$SKILL_DIR/harness/" "$dest/"
  local exclude_file
  exclude_file="$(git -C "$repo" rev-parse --path-format=absolute --git-common-dir)/info/exclude"
  mkdir -p "$(dirname "$exclude_file")"
  grep -qxF ".ui-preview/" "$exclude_file" 2>/dev/null || echo ".ui-preview/" >> "$exclude_file"
}

vite_js() {
  node -e '
    const path = require("path");
    const vitest = require.resolve("vitest/package.json", { paths: [process.argv[1]] });
    const vite = require.resolve("vite/package.json", { paths: [path.dirname(vitest)] });
    console.log(path.join(path.dirname(vite), "bin/vite.js"));
  ' "$app_dir"
}

free_port() {
  node -e '
    const net = require("net");
    const tryPort = (p) => {
      const s = net.createServer();
      s.once("error", () => tryPort(p + 1));
      s.listen(p, "127.0.0.1", () => s.close(() => console.log(p)));
    };
    tryPort(6100);
  '
}

case "$cmd" in
  start)
    fresh="refreshed"; [[ -d "$dest/src" ]] || fresh="installed fresh"
    install_harness
    echo "harness $fresh: $dest"
    if is_up; then
      echo "server REUSED (someone else started it, leave it running): http://127.0.0.1:$(server_port)/"
      exit 0
    fi
    [[ -d "$dest/.vite" ]] || echo "cold start: first shoot also pre-bundles deps (~30-60s)"
    [[ -d "$app_dir/node_modules" ]] || { echo "error: $app_dir/node_modules missing (run pnpm install in this checkout)" >&2; exit 1; }
    port="$(free_port)"
    vite="$(vite_js)"
    # exec chain keeps $! equal to the node pid, so `stop` kills the server itself.
    (cd "$app_dir" && exec nohup node "$vite" --config "$dest/vite.config.mjs" --port "$port" > "$dest/vite.log" 2>&1) &
    echo "{\"pid\": $!, \"port\": $port, \"repo\": \"$repo\", \"app\": \"$app\"}" > "$state_file"
    for _ in $(seq 1 120); do
      if is_up; then
        echo "server STARTED by you (run stop when done): http://127.0.0.1:$port/"
        exit 0
      fi
      kill -0 "$(server_pid)" 2>/dev/null || { echo "error: vite exited, log:" >&2; tail -30 "$dest/vite.log" >&2; exit 1; }
      sleep 0.5
    done
    echo "error: server did not become healthy in 60s, log:" >&2; tail -30 "$dest/vite.log" >&2; exit 1
    ;;
  stop)
    pid="$(server_pid || true)"; port="$(server_port || true)"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      pkill -TERM -P "$pid" 2>/dev/null || true
      kill "$pid"
      echo "stopped (pid $pid)"
    else
      echo "not running"
    fi
    # Belt and braces: nothing of ours may keep listening on the leased port.
    if [[ -n "$port" ]]; then
      for p in $(lsof -nP -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null); do
        ps -o command= -p "$p" | grep -q "vite" && kill "$p" 2>/dev/null || true
      done
    fi
    rm -f "$state_file"
    ;;
  status)
    if is_up; then echo "running: http://127.0.0.1:$(server_port)/  (harness: $dest)"; else echo "not running  (harness: $dest)"; fi
    ;;
  path)
    echo "$dest"
    ;;
  context)
    node "$SKILL_DIR/scripts/context.mjs" --repo "$repo" --harness "$dest" ${rest[@]+"${rest[@]}"}
    ;;
  shoot)
    is_up || { echo "error: server not running, run: $0 start --repo $repo --app $app" >&2; exit 1; }
    node "$SKILL_DIR/scripts/shoot.mjs" --repo "$repo" --base "http://127.0.0.1:$(server_port)" \
      --default-out "$dest/out" ${rest[@]+"${rest[@]}"}
    ;;
  *)
    sed -n '2,13p' "$0"; exit 1 ;;
esac
