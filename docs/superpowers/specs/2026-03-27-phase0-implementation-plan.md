# Phase 0: Foundation - Implementation Plan

**Date:** 2026-03-27
**Spec:** `docs/superpowers/specs/2026-03-27-open-source-cms-platform-design.md`
**Scope:** Weeks 1-4 -- Backend infrastructure + Editor refactor for credit-metered AI

---

## Overview

Transform the current editor from direct-to-OpenRouter AI calls into a credit-metered platform. Build the backend (Supabase Edge Functions + database), then refactor the editor to route through it.

**27 new files, 12 modified files, 20 implementation steps.**

---

## Step 1: Database Migration

**New:** `database/migrations/002_credit_system_schema.sql`
**New:** `database/migrations/002_rollback_credit_system_schema.sql`

Creates all tables from spec Section 3.1:
- ALTER `users` table: add `plan` enum (free/creator/pro/team, default free), `plan_expires_at`, `stripe_status`, `flagged_at`
- `credit_balances` (user_id PK, subscription_credits, topup_credits, credits_reset_at)
- `credit_transactions` (id, user_id, type enum, amount, balance_after, ai_action, ai_provider, ai_model, status enum pending/confirmed/refunded, metadata jsonb, stripe_payment_id)
- `api_keys` (id, user_id, key_hash SHA-256, key_prefix, name, scopes, expires_at, revoked_at)
- `templates` marketplace table (id, author_id, name, description, thumbnail_url, canvas_data jsonb, frame jsonb, category, subcategory, cms_context text[], tags text[], source enum, status enum, schema_version default 1, use_count)
- `cms_connections` (id, user_id, platform enum, site_id, site_name, access_token encrypted, refresh_token, token_expires_at)
- `rate_limit_entries` (id, user_id, endpoint_group, window_start, request_count)
- RLS policies on all tables
- DB functions: `initialize_user_credits()`, `deduct_credits()`, `confirm_credit_transaction()`, `refund_credit_transaction()`
- Trigger on `users` AFTER INSERT to auto-create credit_balances
- GIN indexes on templates.cms_context, templates.tags, full-text index on name+description
- pg_cron schedule for daily credit reset

**Depends on:** Nothing (foundation for everything)

---

## Step 2: Edge Functions Directory

**New directory:** `supabase/functions/` with subdirectories for each function.

```
supabase/
  config.toml
  functions/
    _shared/          (6 utility files)
    ai-proxy/
    credits-balance/
    credits-history/
    credits-topup/
    templates-browse/
    templates-search/
    templates-submit/
    templates-manage/
    stripe-webhooks/
    auth-embed-token/
    cron-credit-reset/
```

**Depends on:** Step 1

---

## Step 3: Shared Utilities

**New:** `supabase/functions/_shared/cors.ts` -- Dynamic CORS per Section 11.3
**New:** `supabase/functions/_shared/auth.ts` -- JWT + API key auth per Section 11.1
**New:** `supabase/functions/_shared/credits.ts` -- Credit cost lookup table per Section 4.3
**New:** `supabase/functions/_shared/rate-limiter.ts` -- Sliding window limiter per Section 11.4
**New:** `supabase/functions/_shared/stripe.ts` -- Stripe client init
**New:** `supabase/functions/_shared/crypto.ts` -- SHA-256 for API keys

**Depends on:** Steps 1, 2

---

## Step 4: AI Proxy Edge Function

**New:** `supabase/functions/ai-proxy/index.ts`

`POST /api/ai/proxy` -- The most critical function. Replaces direct OpenRouter calls.

Flow per Sections 4.4 and 12.1:
1. Authenticate (JWT or API key)
2. Rate limit check
3. Look up credit cost
4. Call `deduct_credits()` (hold phase, status=pending)
5. If insufficient: return 402 with balance, cost, upgrade_url
6. Proxy to OpenRouter (server-side API key, 60s timeout)
7. On success: `confirm_credit_transaction()`, return result + credits_remaining
8. On failure: `refund_credit_transaction()`, return 503 with refund message

**Depends on:** Steps 1, 3

---

## Step 5: Credits Edge Functions

**New:** `supabase/functions/credits-balance/index.ts` -- GET balance
**New:** `supabase/functions/credits-history/index.ts` -- GET paginated history
**New:** `supabase/functions/credits-topup/index.ts` -- POST create Stripe checkout (topup or subscription)

**Depends on:** Steps 1, 3

---

## Step 6: Templates Edge Functions

**New:** `supabase/functions/templates-browse/index.ts` -- GET with category/cms/sort/pagination filters
**New:** `supabase/functions/templates-search/index.ts` -- GET full-text search
**New:** `supabase/functions/templates-submit/index.ts` -- POST authenticated submission
**New:** `supabase/functions/templates-manage/index.ts` -- PATCH/DELETE own templates or admin

**Depends on:** Steps 1, 3

---

## Step 7: Stripe Webhooks

**New:** `supabase/functions/stripe-webhooks/index.ts`

Handles per Section 12.3:
- `checkout.session.completed` → grant credits or activate subscription
- `invoice.paid` → reset subscription credits
- `invoice.payment_failed` → mark past_due, 7-day grace
- `customer.subscription.deleted` → downgrade to free
- `charge.dispute.created` → flag account

**Depends on:** Steps 1, 3, 5

---

## Step 8: Credit Reset CRON

**New:** `supabase/functions/cron-credit-reset/index.ts`

Daily at midnight UTC. Resets subscription_credits for users whose credits_reset_at has passed. Logs subscription_grant transaction.

**Depends on:** Steps 1, 3

---

## Step 9: Embed Token Auth

**New:** `supabase/functions/auth-embed-token/index.ts`

`POST /api/auth/embed-token` -- API key authenticated. Returns 30-min JWT with `{ sub, scope: 'embed', platform, exp }` per Section 11.1.

**Depends on:** Steps 1, 3

---

## Step 10: Frontend API Client

**New:** `src/services/marketifyall-api.ts`

Single API client replacing direct OpenRouter calls. Configurable base URL via `REACT_APP_API_URL`. Attaches JWT from Supabase auth. Methods for AI proxy, credits, templates. Intercepts 402 (insufficient credits) and 429 (rate limited) responses with custom events.

**Depends on:** Steps 1-9 (backend deployed)

---

## Step 11: Credits Context

**New:** `src/contexts/CreditsContext.tsx`

React context exposing `{ balance, loading, refresh() }`. Fetches on mount, re-fetches after AI actions, caches with 5-min auto-refresh. Listens for `credits:insufficient` events to trigger upgrade modal.

**Modify:** `src/Providers.tsx` -- Add CreditsProvider after AppProvider

**Depends on:** Step 10

---

## Step 12: Redirect AI Calls Through Backend

**Modify:** `src/services/openrouter.ts`
- Remove `OPENROUTER_API_KEY` constant and `openRouterClient` axios instance
- `sendDesignRequest()` → calls `marketifyallApi.aiProxy('ai_full_design', ...)`
- `improvePrompt()` → calls `marketifyallApi.aiProxy('ai_text_generation', ...)`
- Keep interfaces and SYSTEM_PROMPT unchanged

**Modify:** `src/scenes/Editor/components/Panels/PanelItems/AiStudio.tsx`
- Route image generation through `marketifyallApi.aiProxy('ai_image_generation', ...)`
- Show credit cost on Generate button

**Modify:** `src/scenes/Editor/components/Panels/PanelItems/AIDesigner.tsx`
- Add credit check before AI calls
- Show credit cost next to send button
- Call `credits.refresh()` after successful response

**Depends on:** Steps 10, 11

---

## Step 13: Remove Client-Side API Key

**Modify:** `.env.example` -- Remove `REACT_APP_OPENROUTER_API_KEY`, add `REACT_APP_API_URL`

**Depends on:** Step 12

---

## Step 14: Credit Balance in Navbar

**Modify:** `src/scenes/Editor/components/Navbar/Navbar.tsx`

Add credit balance pill in RightSection (before Export button). Shows total credits, click for dropdown with breakdown and "Get More" link.

**Depends on:** Step 11

---

## Step 15: Insufficient Credits Modal

**New:** `src/components/InsufficientCreditsModal/InsufficientCreditsModal.tsx`
**New:** `src/components/InsufficientCreditsModal/index.ts`

Modal showing: you need X credits, you have Y. Pricing tiers and top-up packs with Stripe checkout links.

**Modify:** `src/scenes/Editor/Editor.tsx` -- Mount modal, wire to CreditsContext

**Depends on:** Steps 11, 12

---

## Step 16: Submit as Template

**Modify:** `src/scenes/Editor/components/Navbar/components/ExportModal.tsx`

Add "Share with Community" section at bottom. Form: name, description, category, subcategory, cms_context[], tags[]. Auto-generates thumbnail via canvas export. Calls `marketifyallApi.submitTemplate()`.

**Depends on:** Steps 10, 12

---

## Step 17: Harden Embed Mode

**Modify:** `src/contexts/EmbedContext.tsx`

Per Sections 5.3 and 11.2:
- Add `event.origin` validation against whitelist
- Implement nonce protocol (from `mfa:init`, echoed in all subsequent messages)
- Change message prefix from `marketifyall:` to `mfa:`
- Add embed token JWT validation on `mfa:init`
- Add new message types: `mfa:load-template`, `mfa:load-image`, `mfa:close`, `mfa:credits-low`
- Never use `'*'` for targetOrigin in production

**Depends on:** Steps 9, 11

---

## Step 18: /embed Route with Streamlined Chrome

**New:** `src/scenes/EmbedEditor/EmbedEditor.tsx` -- Minimal editor without standard Navbar/Footer
**New:** `src/scenes/EmbedEditor/EmbedNavbar.tsx` -- Embed-only navbar (resize, undo/redo, credits, Done/Cancel)
**New:** `src/scenes/EmbedEditor/index.ts`

**Modify:** `src/Routes.tsx` -- Point `/embed` to EmbedEditor instead of Editor

**Depends on:** Steps 11, 14, 17

---

## Step 19: Redux Credits Slice

**New:** `src/store/slices/credits/reducer.ts`
**New:** `src/store/slices/credits/actions.ts`
**New:** `src/store/slices/credits/selectors.ts`

**Modify:** `src/store/rootReducer.ts` -- Add credits reducer

**Depends on:** Step 10

---

## Step 20: Environment Config

**New:** `supabase/config.toml`
**Modify:** `.env.example` -- Final state with all env vars documented

Supabase Edge Function secrets (set via `supabase secrets set`):
- OPENROUTER_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_CREATOR, STRIPE_PRICE_PRO, STRIPE_PRICE_STARTER, STRIPE_PRICE_GROWTH, STRIPE_PRICE_POWER
- CMS_TOKEN_ENCRYPTION_KEY

**Depends on:** All previous steps

---

## Dependency Graph

```
Week 1-2 (Backend):

  Step 1 ──→ Step 2 ──→ Step 3 ──┬──→ Step 4 (AI Proxy)
                                  ├──→ Step 5 (Credits)
                                  ├──→ Step 6 (Templates)
                                  ├──→ Step 7 (Stripe) [needs Step 5]
                                  ├──→ Step 8 (CRON)
                                  └──→ Step 9 (Embed Token)

Week 3-4 (Editor):

  Step 10 (API Client) ──┬──→ Step 11 (Credits Context) ──┬──→ Step 14 (Navbar Badge)
                         │                                 ├──→ Step 15 (Upgrade Modal)
                         │                                 └──→ Step 17 (Embed Harden)
                         ├──→ Step 12 (Redirect AI) ──┬──→ Step 13 (Remove Key)
                         │                            └──→ Step 16 (Submit Template)
                         └──→ Step 19 (Redux Slice)

  Steps 11+14+17 ──→ Step 18 (/embed Route)
  All ──→ Step 20 (Config)
```

Steps 4-9 are parallelizable (Week 1-2).
Steps 11, 12, 19 are parallelizable (Week 3).
Steps 14, 15, 16 are parallelizable (Week 3-4).

---

## File Manifest

### 27 New Files

| # | File | Step |
|---|------|------|
| 1 | `database/migrations/002_credit_system_schema.sql` | 1 |
| 2 | `database/migrations/002_rollback_credit_system_schema.sql` | 1 |
| 3 | `supabase/config.toml` | 20 |
| 4 | `supabase/functions/_shared/cors.ts` | 3 |
| 5 | `supabase/functions/_shared/auth.ts` | 3 |
| 6 | `supabase/functions/_shared/credits.ts` | 3 |
| 7 | `supabase/functions/_shared/rate-limiter.ts` | 3 |
| 8 | `supabase/functions/_shared/stripe.ts` | 3 |
| 9 | `supabase/functions/_shared/crypto.ts` | 3 |
| 10 | `supabase/functions/ai-proxy/index.ts` | 4 |
| 11 | `supabase/functions/credits-balance/index.ts` | 5 |
| 12 | `supabase/functions/credits-history/index.ts` | 5 |
| 13 | `supabase/functions/credits-topup/index.ts` | 5 |
| 14 | `supabase/functions/templates-browse/index.ts` | 6 |
| 15 | `supabase/functions/templates-search/index.ts` | 6 |
| 16 | `supabase/functions/templates-submit/index.ts` | 6 |
| 17 | `supabase/functions/templates-manage/index.ts` | 6 |
| 18 | `supabase/functions/stripe-webhooks/index.ts` | 7 |
| 19 | `supabase/functions/auth-embed-token/index.ts` | 9 |
| 20 | `supabase/functions/cron-credit-reset/index.ts` | 8 |
| 21 | `src/services/marketifyall-api.ts` | 10 |
| 22 | `src/contexts/CreditsContext.tsx` | 11 |
| 23 | `src/components/InsufficientCreditsModal/InsufficientCreditsModal.tsx` | 15 |
| 24 | `src/components/InsufficientCreditsModal/index.ts` | 15 |
| 25 | `src/scenes/EmbedEditor/EmbedEditor.tsx` | 18 |
| 26 | `src/scenes/EmbedEditor/EmbedNavbar.tsx` | 18 |
| 27 | `src/scenes/EmbedEditor/index.ts` | 18 |

### 12 Modified Files

| # | File | Step | Change |
|---|------|------|--------|
| 1 | `src/services/openrouter.ts` | 12 | Remove direct OpenRouter, proxy through backend |
| 2 | `src/scenes/Editor/components/Panels/PanelItems/AIDesigner.tsx` | 12 | Credit check + cost display |
| 3 | `src/scenes/Editor/components/Panels/PanelItems/AiStudio.tsx` | 12 | Route through backend + cost display |
| 4 | `src/scenes/Editor/components/Navbar/Navbar.tsx` | 14 | Credit balance pill |
| 5 | `src/scenes/Editor/components/Navbar/components/ExportModal.tsx` | 16 | Submit as Template |
| 6 | `src/scenes/Editor/Editor.tsx` | 15 | Mount InsufficientCreditsModal |
| 7 | `src/contexts/EmbedContext.tsx` | 17 | Origin validation, nonce, mfa: prefix |
| 8 | `src/contexts/AuthContext.tsx` | 20 | Defensive credit init |
| 9 | `src/Providers.tsx` | 11 | Add CreditsProvider |
| 10 | `src/Routes.tsx` | 18 | /embed → EmbedEditor |
| 11 | `src/store/rootReducer.ts` | 19 | Add credits reducer |
| 12 | `.env.example` | 13, 20 | Update env vars |

---

## Phase 0 Milestone

At the end of Week 4, the editor at marketifyall.com works with credit-metered AI:
- Users sign up via Supabase Auth and receive 50 free credits
- All AI features (AI Designer, AI Studio) route through the backend
- Credit balance is visible in the navbar
- Insufficient credits triggers an upgrade modal with Stripe checkout
- Templates can be browsed and submitted
- Embed mode is hardened with origin validation, nonce protocol, and token auth
- /embed route provides streamlined chrome for CMS integration
