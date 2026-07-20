# tmux Terminal Inspector

Inspect the user's tmux environment to understand what's running across all terminal panes. Use this for debugging, reading server logs, monitoring processes, and understanding the full workspace.

## Step 1: Discover all panes

Run this to get a full map of every tmux pane:

```bash
tmux list-panes -a -F '#{session_name}:#{window_index}.#{pane_index} | cmd=#{pane_current_command} | pid=#{pane_pid} | path=#{pane_current_path} | title=#{pane_title} | active=#{pane_active} | #{pane_width}x#{pane_height}'
```

Key fields:
- `pane_current_command`: the foreground process (node, zsh, python, etc.)
- `pane_title`: often contains the full command line (e.g., "pnpm nest start", "pnpm dev")
- `pane_current_path`: working directory of the pane
- `pane_pid`: PID of the pane's shell process (use to find child processes)

## Step 2: Identify project-related panes

Compare each pane's `pane_current_path` with the current working directory (`$PWD` or the project root). A pane is project-related if:
- Its path matches or is a subdirectory of the current project
- Its path shares the same repo root (e.g., both under `/Users/mario/REPOS/backend`)

Classify each pane:
- **Server**: `pane_current_command` is `node`, `python`, `ruby`, `java`, `go`, `cargo`, `uvicorn`, `gunicorn`, `next-server`, etc.
- **Claude agent**: `pane_current_command` matches a version pattern like `2.1.68` or contains `claude`
- **Shell**: `pane_current_command` is `zsh`, `bash`, `fish`, `sh`
- **Tool**: anything else (vim, htop, lazygit, etc.)

## Step 3: Read pane output

To read a pane's visible output (last N lines):
```bash
tmux capture-pane -t <session:window.pane> -p -S -<lines>
```

Examples:
```bash
# Last 100 lines from a specific pane
tmux capture-pane -t main:1.1 -p -S -100

# Full scrollback history (can be very large)
tmux capture-pane -t main:1.1 -p -S -

# Just the visible screen
tmux capture-pane -t main:1.1 -p
```

Always start with `-S -200` for good context. If the user needs more, use `-S -`.

## Step 4: Get process tree for a pane

To see exactly what's running inside a pane (useful for servers):
```bash
ps -o pid,ppid,command -g <pane_pid> 2>/dev/null
```

This reveals child processes like the actual server, watchers, compilers, etc.

## Step 5: Search pane output

To find specific errors, patterns, or log entries:
```bash
tmux capture-pane -t <target> -p -S - | grep -i "<pattern>"
```

For context around matches:
```bash
tmux capture-pane -t <target> -p -S - | grep -i -B5 -A5 "<pattern>"
```

## Step 6: Send commands to a pane

To interact with a pane (restart server, run a command):
```bash
# Send Ctrl+C to stop a process
tmux send-keys -t <target> C-c

# Wait briefly, then send a new command
tmux send-keys -t <target> "<command>" Enter
```

Common pattern to restart a server:
```bash
tmux send-keys -t <target> C-c && sleep 1 && tmux send-keys -t <target> "<start command>" Enter
```

## Step 7: Present findings

Organize by relevance to the user's current work:

1. **Project panes** (matching current directory): servers, shells, agents
2. **Server panes** across all sessions
3. **Other active panes**

For each pane show: location, what's running, path, and status.

If any server panes have errors in their output, proactively flag them.

## Step 8: Create panes, windows, and sessions

Open new panes and run commands in them. Always use `-c <path>` to set the working directory.

### Split current window (new pane)
```bash
# Horizontal split (side by side)
tmux split-window -h -t <target> -c <path>

# Vertical split (top/bottom)
tmux split-window -v -t <target> -c <path>

# Split and immediately run a command
tmux split-window -h -t <target> -c <path> "<command>"
```

### New window in an existing session
```bash
# New window
tmux new-window -t <session> -c <path>

# New window with a name and a command
tmux new-window -t <session> -n <window-name> -c <path> "<command>"
```

### New session
```bash
# New detached session
tmux new-session -d -s <session-name> -c <path>

# New session with a command running
tmux new-session -d -s <session-name> -c <path> "<command>"
```

### Common patterns
```bash
# Open a pane next to the current server and run tests
tmux split-window -h -t main:1.1 -c /Users/mario/REPOS/backend "pnpm test"

# Create a dedicated window for logs
tmux new-window -t main -n logs -c /Users/mario/REPOS/backend "tail -f logs/app.log"

# Open a new pane in the same directory as an existing pane
# First get the path: tmux display-message -t <target> -p '#{pane_current_path}'
tmux split-window -v -t <target> -c "$(tmux display-message -t <target> -p '#{pane_current_path}')"
```

### After creating a pane
- The new pane becomes the active pane in that window
- If a command was passed, it runs immediately; when it exits, the pane closes
- For persistent panes (shell + command), create without a command, then use `send-keys`:
  ```bash
  tmux split-window -h -t <target> -c <path>
  tmux send-keys -t <target-of-new-pane> "<command>" Enter
  ```
- To find the new pane's target, re-run Step 1 after creating it

## Step 9: Run a command and capture its output (blocking run-and-wait)

Run a command in a visible pane the way the Bash tool runs one — stream it live
so the user watches it, but block until it finishes and get its full output and
exit code back.

### The easy way: the `tmux-run` helper

A `tmux-run` shell function (defined in `~/.zshrc`) does the whole thing in one
blocking call — it returns only when the command has finished, prints the
command's full output, and its own exit status is the command's exit code:

```bash
tmux-run <session:window.pane> <command...>
```

It is event-driven (via `tmux wait-for`), so there is no polling loop to manage
and no manual Monitor-polling needed.

**Invoking it as the agent:** the Bash tool's shell does NOT load `~/.zshrc`, so
`tmux-run` is undefined there. Call it through a zsh that sources the function,
and pass the whole command as a single quoted argument:

```bash
zsh -c 'source ~/.zshrc >/dev/null 2>&1; tmux-run <session:window.pane> "<command>"'
```

Run that in the **foreground** for short commands. For long-running ones, use the
Bash tool's **background** mode and read the output when the completion
notification fires — either way you get the full output and the command's exit
code back when it returns.

### How it works (the underlying mechanism)

The command is sent with `tee` (output shows live in the pane AND is saved to a
file), its exit code is written to a `.rc` file, and the pane signals a unique
`tmux wait-for` channel when done; the caller blocks on that channel:

```bash
id=...   # unique per run, e.g. $$-$RANDOM
tmux send-keys -t <target> \
  "( <command> ) 2>&1 | tee /tmp/run.$id.log ; echo \${pipestatus[1]} > /tmp/run.$id.rc ; tmux wait-for -S tr-$id" Enter
tmux wait-for tr-$id                       # blocks until the pane signals — no polling
cat /tmp/run.$id.log ; cat /tmp/run.$id.rc # output, then exit code
```

Key points:
- **`tee`, not `>`** — a plain `> file` redirect hides output from the pane. `tee`
  gives both: live in the pane (user-friendly) and a clean file copy. The pane
  wraps long lines and has limited scrollback, so consume the file, not the pane.
- **Wrap compound commands** — `( cmd1; cmd2 )` so the whole sequence is captured,
  not just the last segment. (Piping to `tee` runs it in a subshell, so `cd`/env
  changes won't persist in the pane.)
- **Exit code through a pipe** — after `| tee`, plain `$?` is tee's status; use
  `${pipestatus[1]}` (zsh) / `${PIPESTATUS[0]}` (bash) for the real command's code.
- **Unique id per run** — so a stale channel or file can't cross-talk between runs.

If `tmux wait-for` is ever unavailable, fall back to polling `capture-pane` for a
sentinel line containing a digit (e.g. `__DONE_[0-9]`) — matching a digit so the
echoed command line doesn't false-trigger the poll.

## Debugging patterns

| User says | What to do |
|---|---|
| "check the logs" / "check the server" | Find server panes for current project → read their output |
| "there's an error" / "something crashed" | Read all project server panes → search for error/exception/stack trace |
| "restart the server" | Find the server pane → send C-c → send the start command |
| "what's running" | List all panes with classification |
| "read pane X" | Capture output from the specified pane |
| "run X in the server pane" | Find the right pane → send keys |
| "open a pane for X" | Determine best session/window → split or new window → run command |
| "run tests in a new pane" | Split next to the relevant server pane → run test command |
| "run X and wait" / "run X so I can watch it" | Run-and-wait with a completion sentinel (Step 9) → read exit code + output |
| "set up the dev environment" | Create session/windows/panes as needed → start servers |

## Now: auto-inspect

Run Step 1 now. Identify panes related to the current working directory. If there are server panes for this project, read their last 50 lines. Present a concise summary of the terminal environment relevant to the current task.
