# Submission draft

## Title

Opportunity Operator — turn authorized bounty feeds into human-approved, verified action plans

## Short description

Opportunity Operator is a TrueForge-native agent that converts an authorized bounty feed into ranked opportunities using a transparent EV formula. It delegates candidate research to a subagent, runs deterministic validation in TrueForge's sandbox, asks a separate verifier subagent to challenge the result, and pauses at a TrueForge approval checkpoint before a local-only mock submission.

## Why TrueForge is central

TrueForge runs the full model/tool loop, connects the custom MCP server, provisions the isolated local sandbox, spawns and tracks dynamic subagent threads, persists session history in SQLite, emits the approval-required event, and resumes the paused session after a separate approval input. Removing TrueForge removes the execution model of the application.

## Safety and control

The demo has no payment, signing, login, publishing, or external submission capability. Its only write-like tool is a local mock with no network implementation. It is marked destructive and named in the harness approval policy. Unapproved runs remain paused.

## Reproducibility

The bundled deterministic OpenAI-compatible demo endpoint means judges need no paid model key. It proposes tool calls while TrueForge performs all execution. Tests cover normalization, scoring, verification, routing, and end-to-end harness evidence.

## AI coding disclosure

OpenAI Codex assisted with code, tests, documentation, and debugging. The participant directed the project and is responsible for review, verification, understanding, and presentation.

## Links to add manually

- Public repository: `[ADD AFTER HUMAN REVIEW]`
- Three-minute video: `[ADD AFTER RECORDING]`
- Required Qodo-reviewed public PR: `[ADD BEFORE SUBMISSION]`
- Optional blog: `[ADD IF ENTERING BLOG PRIZE]`
