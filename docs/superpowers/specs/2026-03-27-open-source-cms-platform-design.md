# Marketifyall: Open-Source CMS Design Editor Platform

**Date:** 2026-03-27
**Status:** Approved
**Author:** Aadil Hassan

---

## 1. Vision

Marketifyall is a free, open-source design editor that embeds natively into CMS platforms (Webflow, Shopify, WordPress, and any website). The editor, all elements, templates, and CMS plugins are completely free. Revenue comes exclusively from AI credit consumption -- users pay for AI-powered features (design generation, background removal, image generation, copywriting, etc.) via subscription tiers and top-up packs.

**Positioning:** "The open-source, AI-powered design editor that lives inside your CMS."

**Business model:** Open-core hosted service. Everything is open-source including the AI metering server. Marketifyall hosts the managed version at marketifyall.com. Self-hosters can run everything themselves with their own API keys. The moat is convenience, managed infrastructure, community, and the template ecosystem.

---

## 2. Architecture Overview

### 2.1 System Diagram

```
CMS PLATFORMS (Clients)

  Webflow        Shopify        WordPress       Any CMS
  Extension       App            Plugin          (SDK)
      |              |              |              |
      +------+-------+------+------+------+-------+
             |              |             |
     @marketifyall/cms-sdk (auth, credits, asset push-back)
             |                       |
   @marketifyall/quick-actions   @marketifyall/editor-core
   (inline widget, ~50KB)       (full editor, iframe modal, ~800KB)
             |                       |
             +----------+------------+
                        |
              MARKETIFYALL BACKEND
              (Supabase + Edge Functions)

   Auth       Credits      AI Proxy      Templates
   Service    Service      Service       Service

              Supabase PostgreSQL
   users | credits | transactions | templates | api_keys

              Supabase Storage
   exports/ | templates/ | uploads/ | community-templates/
```

### 2.2 Three NPM Packages

| Package | Purpose | Size | Where it runs |
|---------|---------|------|---------------|
| `@marketifyall/cms-sdk` | Auth, credit management, asset push-back to CMS, event bus | ~15KB | Inside CMS plugin |
| `@marketifyall/quick-actions` | Inline widget: AI generate, pick template, bg removal, resize | ~50KB | Inside CMS dashboard (inline) |
| `@marketifyall/editor-core` | Full design editor (current app) | ~800KB | Iframe modal from marketifyall.com |

### 2.3 Package Interaction Flow

1. CMS plugin loads `cms-sdk` to authenticate user and check credit balance.
2. Inline: `quick-actions` renders a compact UI inside the CMS dashboard for fast AI tasks.
3. Full edit: `cms-sdk` opens an iframe modal pointing to `marketifyall.com/editor?embed=true&token=...`.
4. Both `quick-actions` and `editor-core` call the backend API for AI features, which checks credits before proxying to AI providers.
5. When user finishes, `cms-sdk` receives the exported asset and pushes it to the CMS via that platform's API (Webflow Assets API, Shopify Files API, WordPress Media Library REST API).

---

## 3. Database Schema

### 3.1 Core Tables (Supabase PostgreSQL)

```sql
-- Users (extends Supabase Auth)
users
  id              uuid PK (from Supabase Auth)
  email           text
  name            text
  avatar_url      text
  plan            enum (free, creator, pro, team)
  plan_expires_at timestamptz
  created_at      timestamptz
  updated_at      timestamptz

-- Credit balance (one row per user)
credit_balances
  user_id              uuid PK FK->users
  subscription_credits int (resets monthly)
  topup_credits        int (never expires)
  credits_reset_at     timestamptz (next monthly reset date)
  updated_at           timestamptz

-- Every credit spend/purchase is logged
credit_transactions
  id                uuid PK
  user_id           uuid FK->users
  type              enum (subscription_grant, topup_purchase, ai_spend, refund)
  amount            int (positive=credit, negative=debit)
  balance_after     int (snapshot for audit)
  ai_action         text nullable
  ai_provider       text nullable
  ai_model          text nullable
  status            enum (pending, confirmed, refunded)
  metadata          jsonb
  created_at        timestamptz
  stripe_payment_id text nullable

-- API keys for SDK/embed usage
api_keys
  id          uuid PK
  user_id     uuid FK->users
  key_hash    text (SHA-256)
  key_prefix  text (first 8 chars for display)
  name        text
  scopes      text[]
  last_used_at timestamptz
  expires_at  timestamptz nullable
  created_at  timestamptz
  revoked_at  timestamptz nullable

-- Templates (AI-generated + community)
templates
  id            uuid PK
  author_id     uuid FK->users nullable (null for AI-generated)
  name          text
  description   text
  thumbnail_url text
  canvas_data   jsonb (full editor state)
  frame         jsonb ({width, height})
  category      text
  subcategory   text
  cms_context   text[]
  tags          text[]
  source        enum (ai_generated, community, official)
  status        enum (published, pending_review, rejected, draft)
  schema_version int DEFAULT 1
  use_count     int
  created_at    timestamptz
  updated_at    timestamptz

-- CMS platform connections
cms_connections
  id               uuid PK
  user_id          uuid FK->users
  platform         enum (webflow, shopify, wordpress, custom)
  site_id          text
  site_name        text
  access_token     text (encrypted)
  refresh_token    text (encrypted, nullable)
  token_expires_at timestamptz nullable
  created_at       timestamptz
  revoked_at       timestamptz nullable
```

---

## 4. AI Credit System

### 4.1 Subscription Tiers

| Tier | Price | Monthly Credits | Target User |
|------|-------|----------------|-------------|
| Free | $0 | 50 | Try everything, get hooked |
| Creator | $9/mo | 500 | Bloggers, solo merchants |
| Pro | $29/mo | 2,000 | Agencies, power users |
| Team | $49/mo | 5,000 + 3 seats | Small teams |

### 4.2 Top-Up Packs

| Pack | Price | Credits | Expiry |
|------|-------|---------|--------|
| Starter | $5 | 100 | Never |
| Growth | $15 | 500 | Never |
| Power | $40 | 2,000 | Never |

### 4.3 Credit Costs Per Action

| AI Action | Credits | Rationale |
|-----------|---------|-----------|
| ai_text_generation | 1 | Cheap, drives engagement |
| ai_design_suggestions | 2 | Low compute |
| ai_background_removal | 3 | Medium compute |
| ai_image_enhance | 5 | GPU-intensive |
| ai_image_generation | 8 | Most expensive provider cost |
| ai_full_design | 10 | Combines multiple AI calls |
| ai_video_scene | 15 | Highest compute |

### 4.4 Credit Deduction Flow

```
User triggers AI action
  -> Backend authenticates (JWT or API key)
  -> Calculate credit cost from action_type
  -> Check: subscription_credits + topup_credits >= cost?
     NO  -> Return 402 { error, balance, cost, upgrade_url }
     YES -> Deduct subscription_credits first, then topup_credits
         -> Proxy request to AI provider (OpenRouter / Replicate / Fal.ai)
         -> Log credit_transaction
         -> Return AI result
```

Key rules:
- Subscription credits deducted first (they expire monthly anyway).
- Top-up credits deducted second (they never expire, more valuable).
- Balance check + deduct in a single Postgres transaction (atomic, no race conditions).
- 402 response includes upgrade_url so UI can show inline upgrade prompt.

### 4.5 Monthly Credit Reset

Supabase CRON job runs daily at midnight UTC. Resets subscription_credits for users whose credits_reset_at has passed. Resets to the amount matching their current plan tier.

---

## 5. Package Specifications

### 5.1 @marketifyall/cms-sdk (~15KB)

Universal glue between any CMS and Marketifyall.

```typescript
const mfa = new MarketifyallSDK({
  apiKey: 'mfa_abc123...',
  platform: 'webflow',
  onAssetReady: (asset) => { /* push to CMS */ }
})

// Auth
mfa.auth.getUser()
mfa.auth.loginWithRedirect()
mfa.auth.loginWithApiKey(key)

// Credits
mfa.credits.getBalance()          // { subscription, topup, total }
mfa.credits.canAfford(action)     // boolean
mfa.credits.onLow(callback)

// Editor
mfa.editor.openModal(options?)
mfa.editor.closeModal()
mfa.editor.onExport(callback)

// Quick Actions
mfa.quickActions.generate(prompt)
mfa.quickActions.removeBackground(imageUrl)
mfa.quickActions.resize(imageUrl, { w, h })
mfa.quickActions.enhance(imageUrl)

// Templates
mfa.templates.browse(filters?)
mfa.templates.search(query)

// Events
mfa.events.on('credits:low', cb)
mfa.events.on('credits:exhausted', cb)
mfa.events.on('export:complete', cb)
```

Design decisions:
- All API calls go to api.marketifyall.com (self-hosters configure their own endpoint).
- Auth supports JWT (hosted users) and API key (SDK/embed).
- The onAssetReady callback is how CMS plugins push finished designs back.
- Event bus uses simple pub/sub, no external dependency.

### 5.2 @marketifyall/quick-actions (~50KB)

Lightweight inline widget for CMS dashboards.

```typescript
QuickActions.mount('#mfa-widget', {
  sdk: mfa,
  mode: 'compact',
  features: ['generate', 'templates', 'bg-remove', 'resize'],
  templateFilters: { cms_context: 'shopify', category: 'ecommerce' },
  theme: { primary: '#5A3FFF', radius: 8 },
  onResult: (asset) => { /* finished asset */ }
})
```

UI layout (compact mode):
- AI prompt input with "Generate" button and credit cost display
- Template grid filtered by CMS context
- Quick action buttons: Remove BG, Resize, Enhance, Open Full Editor
- Credit balance display with "Get more credits" link

Technical decisions:
- Renders with vanilla DOM manipulation (no React dependency) to minimize bundle.
- Styles scoped via CSS-in-JS with unique prefix to avoid CMS style conflicts.
- Communicates with backend exclusively via cms-sdk.
- Credit balance updates in real-time after each AI action.

### 5.3 @marketifyall/editor-core (~800KB)

The current Marketifyall editor, refactored to work as both standalone app and embeddable iframe.

Changes from current codebase:
- AI calls routed through backend API (credit-metered) instead of direct OpenRouter.
- Auth accepts embed tokens from cms-sdk via postMessage.
- Export posts asset back to parent window via postMessage (in embed mode).
- Credit balance displayed in editor UI with upgrade prompts.
- New /embed route with streamlined chrome (no navbar/landing navigation).

Embed communication protocol (postMessage):

```
CMS plugin -> Editor iframe:
  { type: 'mfa:init', token, platform, theme }
  { type: 'mfa:load-template', templateId }
  { type: 'mfa:load-image', imageUrl }
  { type: 'mfa:close' }

Editor iframe -> CMS plugin:
  { type: 'mfa:ready' }
  { type: 'mfa:export', asset: { url, blob, width, height, format, name } }
  { type: 'mfa:credits-low', balance }
  { type: 'mfa:closed' }
  { type: 'mfa:error', message }
```

---

## 6. CMS Plugin Architecture

### 6.1 Webflow Extension (Phase 1)

Webflow Designer Extensions run as iframes inside the Webflow Designer sidebar. They use the Webflow Designer API to create elements, upload assets, and manipulate the page.

Structure:
```
packages/cms-webflow/
  src/
    index.tsx           # Extension entry point
    App.tsx             # Mounts quick-actions widget
    webflow-bridge.ts   # Webflow Designer API integration
    asset-pusher.ts     # Upload to Webflow Assets API
  public/
    manifest.json       # Webflow extension manifest
```

User flows:
- **Quick AI generation:** User types prompt -> quick-actions generates image -> user clicks "Add to page" -> webflow-bridge uploads via Assets API -> inserts img element on canvas.
- **Template customization:** User picks template -> editor-core opens in modal -> user customizes and exports -> asset pushed to Webflow and inserted.
- **Edit existing image:** User selects image on canvas -> extension reads image URL -> editor-core opens with image pre-loaded -> user edits -> replaces original.

### 6.2 Shopify App (Phase 2)

Shopify Admin apps run as embedded iframes using Shopify App Bridge + Admin API. 0% commission on first $1M developer revenue.

Structure:
```
packages/cms-shopify/
  web/
    src/
      App.tsx             # Mounts quick-actions + editor modal
      shopify-bridge.ts   # Shopify App Bridge integration
      asset-pusher.ts     # Upload to Shopify Files/Product Images API
  server/
    index.ts              # OAuth + webhooks handler
    auth.ts               # Shopify OAuth flow
    webhooks.ts           # App install/uninstall hooks
  shopify.app.toml        # Shopify app config
```

Where it appears:
- Admin sidebar: "Marketifyall" section with quick-actions
- Product page: "Create product image" button
- Theme editor: "Generate banner" for hero sections
- Marketing section: "Create campaign graphic"

### 6.3 WordPress Plugin (Phase 3)

PHP plugin with React frontend. Published through WordPress.org Plugin Directory.

Structure:
```
packages/cms-wordpress/
  marketifyall.php          # Plugin entry (PHP)
  includes/
    admin-page.php          # Admin menu registration
    gutenberg-block.php     # Registers Gutenberg block
    rest-api.php            # REST endpoints for asset upload
    media-library.php       # WP Media Library integration
  src/
    admin/
      App.tsx               # Admin panel with quick-actions
      wp-bridge.ts          # WordPress REST API integration
    gutenberg/
      block.tsx             # Gutenberg block: inline design creator
      sidebar-panel.tsx     # Sidebar panel in block editor
    asset-pusher.ts         # Upload to WP Media Library
```

Where it appears:
- Gutenberg block: "Marketifyall Design" block inline in post editor
- Admin sidebar: "Marketifyall" menu item for templates and editor
- Media Library: "Create with AI" button alongside upload button
- Featured Image: "Generate featured image" link

### 6.4 Universal Embed (Any Platform)

For platforms without native plugins:

```html
<div id="marketifyall"></div>
<script src="https://cdn.marketifyall.com/sdk/v1/embed.js"></script>
<script>
  Marketifyall.init({
    container: '#marketifyall',
    apiKey: 'mfa_...',
    mode: 'quick-actions',
    onExport: function(asset) { console.log(asset.url) }
  })
</script>
```

This is cms-sdk + quick-actions bundled into a single UMD script for non-npm environments. Works with Wix, Squarespace, Ghost, Framer, or any website.

---

## 7. Template Marketplace

### 7.1 AI-Generated Seed Library

At launch, a Node.js script generates templates programmatically:
1. Prompts Claude/OpenRouter to generate canvas_data JSON for each CMS context x category x style combination.
2. Renders thumbnail via headless FabricJS.
3. Uploads thumbnail to Supabase Storage.
4. Inserts into templates table (source: ai_generated, status: published).

Coverage matrix:

| CMS Context | Categories | Per Category | Total |
|------------|-----------|-------------|-------|
| Webflow | Landing hero, Section BG, CTA, Blog header, Testimonial | ~10 | ~50 |
| Shopify | Hero banner, Sale banner, Product card, Announcement, Social | ~10 | ~50 |
| WordPress | Blog featured, Post header, Sidebar, Newsletter header | ~10 | ~40 |
| Social Media | Instagram post/story, Facebook cover, Twitter, LinkedIn | ~10 | ~50 |
| General | Business card, Flyer, Poster, Presentation, YouTube thumb | ~8 | ~40 |

Each template generated in 3-5 style variants (minimalist, bold, elegant, playful, dark), yielding ~800+ effective templates at launch.

### 7.2 Community Submissions

Flow:
1. User creates design in editor.
2. Clicks "Submit as Template" -- fills name, description, category, subcategory, cms_context[], tags[].
3. System auto-generates thumbnail.
4. Saved with source: community, status: pending_review.
5. Moderation: Phase 1 manual review, Phase 2 AI-assisted quality scoring.
6. Approved templates become visible to all users.

Community incentives (non-monetary to keep revenue model clean):
- Attribution: "By @username" on template card
- Use counter: public count of template usage
- Creator badge: earned after 5+ approved templates
- Featured creator: top contributors featured on browse page
- Free credits: 50 bonus credits per approved template

### 7.3 Template API

```
GET  /api/templates?category=...&cms=...&page=...&limit=...
GET  /api/templates/search?q=...&cms=...
GET  /api/templates/:id
GET  /api/templates/trending
GET    /api/templates/new
POST   /api/templates           (authenticated, submit new)
PATCH  /api/templates/:id       (authenticated, update own template or moderate)
DELETE /api/templates/:id       (authenticated, delete own or admin)
```

Templates are serialized editor state (FabricJS JSON). No new format needed -- uses the exact JSON structure the editor already saves and loads.

---

## 8. Phased Rollout

### Phase 0: Foundation (Weeks 1-4)

Week 1-2: Backend
- Supabase schema (all tables from Section 3)
- Edge Functions: /api/ai/*, /api/credits/*, /api/templates/*
- Stripe integration for subscriptions and top-ups
- Monthly credit reset CRON

Week 3-4: Editor refactor
- Route all AI calls through backend API
- Credit balance UI in editor
- "Insufficient credits" modal with upgrade prompt
- "Submit as Template" in export menu
- Harden embed mode (postMessage protocol, token auth)
- /embed route with streamlined chrome

**Milestone:** Editor at marketifyall.com works with credit-metered AI. Sign up, get 50 free credits, use AI, buy more.

### Phase 1: Packages + Webflow (Weeks 5-10)

Week 5-6: Extract packages
- Monorepo structure
- Extract cms-sdk and quick-actions
- Publish to npm

Week 7-8: Webflow extension
- Scaffold extension, mount quick-actions
- Implement webflow-bridge.ts
- Test in Webflow Designer

Week 9-10: Polish + submit
- Edge case handling
- Marketplace listing and submission

**Milestone:** Webflow extension live in marketplace.

### Phase 2: Shopify + Templates (Weeks 11-18)

Week 11-12: Template seeding
- Build seed script
- Generate ~230 base templates (~800+ with variants)

Week 13-16: Shopify app
- Scaffold app, OAuth, App Bridge
- Product page + theme editor + marketing integrations
- Test with dev store

Week 17-18: Polish + submit
- App Store listing and submission
- Community template moderation dashboard

**Milestone:** Shopify app live. 800+ templates. Community submissions enabled.

### Phase 3: WordPress + Universal Embed (Weeks 19-26)

Week 19-22: WordPress plugin
- PHP plugin + React frontend
- Gutenberg block, Media Library, Featured Image integrations
- Submit to WordPress.org

Week 23-24: Universal embed SDK
- Bundle UMD script, host on CDN
- Developer documentation site
- Embed playground

Week 25-26: Dashboards
- User dashboard (credits, connections, templates, billing)
- Admin dashboard (moderation, analytics, costs, revenue)

**Milestone:** All three CMS plugins live. Universal embed available. Dashboards shipped.

### Phase 4: Growth + Moat (Weeks 27-36)

Week 27-30: Growth features
- AI brand onboarding ("describe your brand")
- Template recommendations from CMS content
- Batch generation, scheduled generation
- Team features (shared brand kit, seats)

Week 31-34: More CMS platforms
- Wix, HubSpot, Ghost, Framer integrations

Week 35-36: Open-source community
- Self-hosting docs, Docker Compose setup
- Contributing guide, CMS plugin development tutorial
- GitHub Discussions / Discord community

---

## 9. Revenue Projections (Conservative)

| Month | Phase | Users | Paid (5%) | Avg Revenue/Paid | MRR |
|-------|-------|-------|-----------|------------------|-----|
| 2 | Foundation | 500 | 25 | $9 | $225 |
| 4 | Webflow | 2,000 | 100 | $9 | $900 |
| 6 | Shopify | 8,000 | 400 | $9 | $3,600 |
| 8 | WordPress | 25,000 | 1,250 | $9 | $11,250 |
| 10 | Universal | 50,000 | 2,500 | $9 | $22,500 |
| 12 | Growth | 100,000 | 5,000 | $9 | $45,000 |

Assumptions: 5% free-to-paid conversion (industry standard for generous freemium), average $9/paid user (mostly Creator tier).

---

## 10. Competitive Advantages

1. **Open-source** -- No competitor offers this. Builds trust and community.
2. **CMS-native** -- First embeddable design editor with native Webflow, Shopify, and WordPress plugins. Blue ocean.
3. **AI credits only** -- Everything else is free. Simplest possible value proposition.
4. **Video + Image** -- Combined editor at non-enterprise pricing. Rare.
5. **Self-hostable** -- Data sovereignty for enterprise customers.
6. **Community templates** -- Network effect that grows with users.
7. **Universal embed** -- One-line integration for any platform.

---

## 11. Authentication and Authorization

### 11.1 Auth Flows

**Hosted users (marketifyall.com):** Supabase Auth with email/password and OAuth (Google, GitHub). JWT issued on login with claims: `{ sub: user_id, plan: 'creator', exp: +1h }`. Refresh token rotated automatically by Supabase client. Session persisted in localStorage.

**Embed token auth:** When cms-sdk opens the editor iframe, it generates a short-lived embed token via `POST /api/auth/embed-token` (authenticated with API key). The token is a JWT with claims `{ sub: user_id, scope: 'embed', platform: 'webflow', exp: +30m }`. Passed to the iframe via postMessage `mfa:init`. The editor validates this token on its backend before allowing operations.

**API key auth:** API keys are generated in the user dashboard. Keys are prefixed `mfa_` followed by 32 random bytes (base62 encoded). Stored as SHA-256 hash in `api_keys.key_hash` (not bcrypt -- API keys have high entropy and are validated on every request, so a fast deterministic hash is appropriate and enables direct DB lookups). Validated via `WHERE key_hash = sha256(provided_key) AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())`.

### 11.2 PostMessage Security

All postMessage handlers validate `event.origin` against a whitelist. The whitelist is derived from:
- The CMS connection's registered domain (stored in `cms_connections.site_id`)
- `marketifyall.com` and its subdomains
- Localhost (development mode only, gated by environment variable)

The `mfa:init` message includes a `nonce` (random 16-byte string). All subsequent messages from the editor include this nonce. The parent window rejects messages with a mismatched or missing nonce.

### 11.3 CORS Policy

The backend API at `api.marketifyall.com` sets CORS headers:
- `Access-Control-Allow-Origin`: Dynamic, validated against registered domains in cms_connections + `*.marketifyall.com`
- `Access-Control-Allow-Credentials`: true
- `Access-Control-Allow-Headers`: Authorization, Content-Type, X-API-Key

### 11.4 Rate Limiting

| Endpoint Group | Free Tier | Creator | Pro | Team |
|---------------|-----------|---------|-----|------|
| AI actions | 10/min | 30/min | 60/min | 100/min |
| Template browse/search | 60/min | 120/min | 120/min | 120/min |
| Auth endpoints | 5/min | 5/min | 5/min | 5/min |
| Template submit | 5/hour | 20/hour | 20/hour | 20/hour |
| Asset export | 20/min | 60/min | 120/min | 200/min |

Rate limits enforced via Supabase Edge Function using a sliding window counter in Redis (or Supabase Realtime for simpler deployments). Returns `429 Too Many Requests` with `Retry-After` header.

---

## 12. Credit Failure Handling

### 12.1 AI Provider Failure Recovery

Credits use a **hold-then-confirm** pattern:

```
1. HOLD: Deduct credits from balance, set transaction status = 'pending'
2. CALL: Proxy request to AI provider
3a. SUCCESS: Update transaction status = 'confirmed'
3b. FAILURE: Refund credits to balance, update transaction status = 'refunded'
```

This is implemented as:
- `credit_transactions.status` enum: `pending`, `confirmed`, `refunded`
- If AI provider returns 5xx, timeout, or malformed response: credits are refunded automatically
- Refund is logged as a separate `credit_transaction` with type `refund` and a reference to the original transaction
- User sees a toast: "AI generation failed. Your credits have been refunded."

### 12.2 Retry Policy

- AI provider calls timeout after 60 seconds
- No automatic retries on 5xx (user can manually retry)
- On provider outage (3+ consecutive failures), the system returns `503 Service Unavailable` and displays a status banner in quick-actions and editor

### 12.3 Stripe Webhook Handling

| Webhook Event | Action |
|--------------|--------|
| `checkout.session.completed` | Grant top-up credits or activate subscription |
| `invoice.paid` | Reset subscription credits for the new billing period |
| `invoice.payment_failed` | Mark subscription as `past_due`. Grace period: 7 days. After grace period: downgrade to free tier. Credits already granted are not clawed back. |
| `customer.subscription.deleted` | Downgrade to free tier immediately. Top-up credits preserved. Subscription credits set to free tier amount (50) at next reset. |
| `charge.dispute.created` | Flag account for review. Do not auto-suspend (disputes are often resolved). |

---

## 13. Team Plan Mechanics

Deferred to Phase 4. The Team tier ($49/mo, 5,000 credits, 3 seats) is listed in the pricing table as a planned tier but will not be available at launch. Phases 0-3 support only individual plans (Free, Creator, Pro). When implemented, the team system will include:

- `teams` table (id, name, owner_id, plan, created_at)
- `team_members` table (team_id, user_id, role: owner/admin/member, invited_at, joined_at)
- Pooled credit model: all team members draw from a shared credit balance
- 3 seats means 3 total users including the owner

Until Phase 4, the Team tier row in the pricing table should be shown as "Coming Soon" in any user-facing UI.

---

## 14. Operational Requirements

### 14.1 Versioning

- NPM packages follow semver. Major version bumps for breaking changes to the postMessage protocol or SDK API.
- Backend API is versioned via URL prefix: `/api/v1/`. New versions are additive; old versions supported for 6 months after deprecation notice.
- Template `canvas_data` includes a `schema_version` field (integer). Editor checks this on load and applies migrations if needed.

### 14.2 Observability

- Structured JSON logging on all Edge Functions (timestamp, request_id, user_id, action, duration_ms, status)
- Error tracking via Sentry (frontend + backend)
- Uptime monitoring on api.marketifyall.com and the editor
- Credit reconciliation audit: daily CRON compares `SUM(credit_transactions.amount)` against `credit_balances` to detect drift

### 14.3 Degraded Mode

When the backend is unreachable from a CMS plugin:
- Quick-actions shows a clear "Service unavailable" state with a retry button
- Cached credit balance (from last successful fetch, stored in localStorage) is displayed as stale with a warning
- Non-AI editor features (shapes, text, elements, manual design) work normally in the full editor since they are client-side
- AI features show "Offline -- check your connection" instead of failing silently

### 14.4 Template Schema Versioning

The `templates` table gains a `schema_version int DEFAULT 1` column. When the editor's internal canvas format changes:
1. Increment the schema version constant in editor-core
2. Write a migration function: `migrateCanvasData(data, fromVersion, toVersion)`
3. On template load, if `schema_version < currentVersion`, run migration and optionally update the stored template

### 14.5 CMS Token Encryption

CMS access tokens in `cms_connections` are encrypted with AES-256-GCM. The encryption key is stored as a Supabase secret (environment variable `CMS_TOKEN_ENCRYPTION_KEY`). Key rotation: new key encrypts new tokens; old tokens are re-encrypted on next access (lazy migration).

---

## 15. Key Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI provider costs exceed credit revenue | Negative margins | Track cost per AI action closely. Adjust credit pricing. Route to cheaper providers (Fal.ai, self-hosted models) as volume grows. |
| CMS marketplace rejection | Delays launch | Follow each platform's guidelines closely. Build dev-mode testing first. Have backup plan of self-distribution. |
| Self-hosters bypass AI credits entirely | Lost revenue | Expected and acceptable. Self-hosters bring community, PRs, and credibility. The 95% who want convenience will use hosted version. |
| Canva/Adobe build native CMS plugins | Competition | Move fast. First-mover in each marketplace. Open-source community is a moat they can't replicate. |
| Low free-to-paid conversion | Revenue miss | Tune free credit amount. Make AI features indispensable (the magic moment). Add gentle upgrade prompts at natural friction points. |
