---
name: frontend-review
description: Review HomeSpace tenant-facing frontend changes for correctness, API compatibility, accessibility, state handling and regressions. Use when frontend review is explicitly requested.
---

# frontend-review (Claude Code adapter for hs-web-app)

This is an adapter. It does not contain the workflow itself. The source workflow is the Codex skill at:

```text
../../../.agents/skills/frontend-review/SKILL.md
```

(relative to this directory; it resolves to `.agents/skills/frontend-review/SKILL.md` in the `hs-web-app` repository root).

Claude Code does not import that file automatically. When this skill is triggered:

1. Read the source file above with the Read tool.
2. Follow its workflow exactly, together with the `AGENTS.md` rules of this repository.
3. The source skill has no `references/` or `scripts/` directories. If they are added later, read them from the source skill directory when the workflow requires them.
