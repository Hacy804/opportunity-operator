# Submission checklist

## 1. Create the public repository without bypassing Qodo

1. On GitHub, create a public repository with an initial README on `main`. That initial placeholder is not substantive project code.
2. Add the repository as this local repo's remote and push the existing project history to a feature branch such as `build/opportunity-operator` — not directly to `main`.
3. Install Qodo for that GitHub repository.
4. Open a pull request from `build/opportunity-operator` to `main`. If review does not start, comment `/agentic_review`.
5. Resolve every valid High-severity finding. Explain any dismissal in the Qodo thread.
6. Push fixes to the same branch and run a follow-up Qodo review.
7. Add the public PR URL and a concise finding/decision summary under `## Qodo Code Review Evidence` in the README, then obtain the final review.
8. Human-merge the PR only after the review trail is complete.

## 2. Record the demo

- Aim for about three minutes and follow `docs/DEMO_SCRIPT.md`.
- Show the live official feed provenance, MCP events, two subagent threads, sandbox output, the approval pause, local mock receipt, and session survival after restart.
- Do not show credentials, browser sessions, personal information, or private repository settings.

## 3. Final verification

```bash
npm ci
npm run verify
npm run demo:all
```

Confirm the public repo README works from a clean clone and all Qodo placeholders have been replaced.

## 4. Submit manually

Provide the public repository, approximately three-minute video, short write-up, Qodo-reviewed PR evidence, and optional blog URL through the official submission flow before the deadline. Account login and final submission remain human-only actions.
