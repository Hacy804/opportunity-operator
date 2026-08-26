# Three-minute demo script

**0:00–0:25 — Problem.** Show the dashboard. “Opportunity feeds are noisy, but an autonomous agent that can submit things is dangerous. Opportunity Operator maximizes expected value while keeping irreversible authority with a human.”

**0:25–0:50 — Architecture.** Show the README Mermaid diagram. Point out that TrueForge owns the loop, MCP, sandbox, subagents, session store, and approval protocol. Mention that the deterministic local model makes the demo free and reproducible but executes nothing itself.

**0:50–1:35 — Run.** Start `npm run demo:all`. Watch the dashboard trace: authorized feed, normalization, EV score, research subagent, sandbox assertion, and independent verifier. Show the selected opportunity and EV.

**1:35–2:15 — Safety checkpoint.** Pause on `Approval required`. Explain that TrueForge ended the turn before `mock_irreversible_submit`. Show the disabled external-submit UI and the safety footer. Approve only the local mock; show `externalSideEffects: false` in `demo-artifacts/latest-run.json`.

**2:15–2:40 — Persistence.** Explain that the script restarts TrueForge and reloads the same session ID from SQLite. Point to the successful persistence check.

**2:40–3:00 — Close.** Show tests and the AI coding disclosure. “A production connector can replace the fixture later, but payment, signing, publishing, and account submission remain outside the agent’s authority.”
