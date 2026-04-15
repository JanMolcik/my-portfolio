# Security Audit Report — 2026-04-14

**Branch:** `codex/staging` (pre-merge to `main`)
**Scope:** Targeted gap analysis of 12 risk areas
**Approach:** Test-driven verification with consensus planning (ralplan)

## Findings Summary

| ID | Severity | Finding | Status | Test Reference |
|----|----------|---------|--------|----------------|
| T1 | CRITICAL | Rich text XSS vectors | TESTED | security-richtext-xss-001 |
| T2 | CRITICAL | getSafeHref scheme injection | TESTED | security-richtext-xss-001 |
| T3 | CRITICAL | JSON-LD script breakout | TESTED | security-jsonld-001 |
| T4 | CRITICAL | Preview token in public bundle | TESTED | harness-secrets-001 |
| T4b | CRITICAL | Secret tokens in env block | TESTED | harness-secrets-001 |
| T4c | CRITICAL | Token fallback chain safety | TESTED | security-token-flow-001 |
| T5 | HIGH | Turnstile test key production guard | TESTED | security-contact-001 |
| T6 | HIGH | CSP frame-ancestors injection | TESTED | security-headers-001 |
| T7 | HIGH | Webhook multi-source secret validation | TESTED | security-webhook-001 |
| T8 | MEDIUM | Email subject CRLF injection | DOCUMENTED | security-contact-001 |
| T9 | MEDIUM | Preview redirect edge cases | TESTED | security-preview-mode-001 |
| T10 | MEDIUM | Supply chain vulnerabilities | TESTED | harness-supply-chain-001 |

## Fixes Applied

| ID | Fix | Impact |
|----|-----|--------|
| F1 | Added worker-src and manifest-src CSP directives | Closes potential worker/manifest loading gaps |
| F2 | ~~X-Frame-Options: SAMEORIGIN~~ REVERTED after Codex review: conflicts with CSP `frame-ancestors https://app.storyblok.com` and would break Storyblok visual editor preview. Framing control relies on `frame-ancestors` alone. | n/a |
| F3 | Sanitized data-language attribute to alphanumeric + hyphens | Defense-in-depth (React already escapes attribute values) |

## Risk Acceptances

| ID | Risk | Rationale | Principle Tradeoff |
|----|------|-----------|--------------------|
| R1 | In-memory rate limiting resets on cold start | Portfolio scale; Upstash is primary, memory is fallback. Serverless instances have isolated memory. | Defense in Depth ↔ Proportionality |
| R2 | Webhook dedup resets on cold start | Revalidation is idempotent; worst case is redundant cache invalidation. | Defense in Depth ↔ Proportionality |
| R3 | script-src unsafe-inline in CSP | Required by Next.js App Router RSC bootstrap; guarded by inline script sink test. | Defense in Depth ↔ Framework Compatibility |
| R4 | No CSRF protection on API endpoints | All endpoints are stateless; no session cookies to protect. | Defense in Depth ↔ Proportionality |
| R5 | replyTo set to user-submitted email | Resend SDK sanitizes headers; worst case is bounce, not injection. CRLF in name also relies on Resend SDK sanitization (T8 finding). | Trust No External Input ↔ Proportionality |
| R6 | No Dependabot/Renovate | Recommendation to add; not blocking. Manual pnpm audit sufficient pre-merge. | Measurable Coverage ↔ Proportionality |
| R7 | No rate limiting on preview/webhook | Secret-gated; high-entropy secrets defend against brute-force; timing-safe comparison prevents side-channel. | Defense in Depth ↔ Proportionality |
| R8 | Storyblok delivery token in client bundle | By design for visual editor. Read-only published content scope. Blast radius: content scraping of public data. | Least Privilege ↔ Functionality |

## Recommendations

1. Add Dependabot or Renovate for automated dependency updates
2. Consider `pnpm audit` as a CI gate step (currently manual)
3. Re-audit if authentication or database features are added
4. Track Next.js CSP nonce support to replace `unsafe-inline` when available
5. Implement server-side rich-text sanitization if CMS content includes user-generated HTML
