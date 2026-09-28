---
status: approved
owner: novamart-demo-operator
source_version: novamart-demo-v1
approved_at: 2026-09-28T00:00:00Z
tenant_id: 99999999-9999-4999-8999-999999999999
synthetic: true
---

# NovaMart Approval and Role-Separation Governance

## Human Approval Gate (`AUTH-4`)

Any action classified at `AUTH-4`—specifically `skill.mkt.dispatch_campaign` for the 90-day reactivation workflow—must pause before external or outbox side effects and record an immutable pending approval entry (`status = 'awaiting_approval'`).

## Role-Separated Operator Permissions

NovaMart enforces strict role-based separation of duties across its authenticated demo operator principals:

1. **Tenant Creator (`DEMO_TENANT_CREATOR_API_TOKEN`):** Holds `campaign:create`, `campaign:read`, `conversation:read`, `conversation:reply`, `conversation:takeover`, `approval:read`, `customer:read`, and `run:read`. May initiate Marketing campaign drafts (`POST /api/v1/campaigns/drafts`) and handle Customer Care takeovers, but holds **no `approval:decide` permission** and cannot self-approve a campaign draft.
2. **Tenant Approver (`DEMO_TENANT_APPROVER_API_TOKEN`):** Holds `approval:read`, `approval:decide`, and `run:read`, with **no `campaign:create` permission**. Authorized to review and approve or reject pending `AUTH-4` campaign requests after verifying the payload digest, audience count (`<= 100`), brand audit pass receipt, and customer consent evidence.
3. **Platform Viewer (`DEMO_PLATFORM_VIEWER_API_TOKEN`):** Holds read-only platform telemetry and readiness permissions (`run:read`, `telemetry:read`); cannot initiate campaigns or decide tenant approvals.

## Digest Integrity and Pre-Resume Revalidation

- **Immutable Payload Digest:** Approving a parked `AUTH-4` request validates the cryptographic digest of the segment, draft text, channel (`EMAIL_HTML`), budget (`1,000,000 VND` synthetic), and approved source hashes. Any payload mismatch refuses execution.
- **Consent Re-Check on Resume:** Immediately before resuming a newly approved campaign toward the local outbox sink, the worker re-verifies customer consent (`email_marketing_consent = true`). If consent was revoked or the approval was rejected/expired, zero messages are dispatched.
- **Synthetic Policy Provenance:** Approval of `novamart-demo-v1` applies exclusively to local/CI `DEMO_MODE=true` execution on tenant `99999999-9999-4999-8999-999999999999` and never resolves production `unresolved_owner_inputs`.
