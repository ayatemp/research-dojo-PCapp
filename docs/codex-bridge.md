# Codex Bridge

Codex Bridge is the implementation-mode backend for Research Dojo.

The Research Dojo app owns learning, review, revision, and experiment design. Codex owns repository understanding, code edits, tests, README updates, and diff creation after the research hypothesis is stable.

## MVP Transport

Use stdio:

```text
Research Dojo Backend
  -> spawn("codex", ["app-server"])
  -> JSON-RPC over stdin/stdout
  -> streamed events to UI
```

## Task States

- queued
- running
- needs_user_approval
- completed
- failed
- cancelled

## Safety Rules

- Only registered repo paths are allowed
- Secret reads are blocked
- Destructive commands require approval
- `git commit` and `git push` are disabled in the product MVP
- Diffs are shown before approval

## Dangerous Operations

- `rm`
- `git reset`
- `git clean`
- `git push`
- package installs
- external network access
- `.env` reads
