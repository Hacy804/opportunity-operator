# Security boundaries

## Protected assets

The system protects account credentials, money, signing authority, private data, and external publishing/submission rights. None are required by the demo and none should be added to its fixture or repository.

## Trust boundaries

Feed data is untrusted even when access is authorized, so normalization validates required fields. Model output is untrusted and can only act through TrueForge tools. Sandbox code is isolated by TrueForge's standalone sandbox runtime. MCP annotations classify reads and the mock write. The final write-like tool is also named explicitly in `requireApprovalForTools` so a model cannot waive the checkpoint.

## Non-goals

This hackathon demo is not a production bounty crawler, financial adviser, wallet, signer, payment agent, or submission bot. The local TrueForge mode has no login and must remain bound to localhost.

## Fail-closed behavior

Missing required fields raise errors. Unauthorized sources fail verification. A missing approval leaves the session paused. The mock submit implementation contains no outbound network code and reports `externalSideEffects: false`.

## Reporting

Do not open a public issue containing a credential or private bounty payload. Revoke the credential first, then contact the repository owner privately.
