---
name: frontend-review
description: Review HomeSpace tenant-facing frontend changes for correctness, API compatibility, accessibility, state handling and regressions. Use when frontend review is explicitly requested.
---

# Frontend Review

## Mode

Review-only.

## Checklist

- Component correctness
- State consistency
- API integration
- Loading and error states
- Server/client boundaries
- Authentication-sensitive behavior
- Accessibility
- Responsive layout
- Meaningful performance regressions

## Efficiency

Inspect changed components first.

Do not automatically run production builds.

Use targeted lint, typechecking or tests only when they provide meaningful verification.

Avoid unrelated UI refactoring.

## Output

Report actionable findings with file locations, concrete failure scenarios and severity.
