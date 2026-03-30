-- Migration: 002_credit_system_schema
-- Description: Add credit system, AI metering, API keys, marketplace templates, and CMS connections
-- Depends on: 001_create_design_editor_schema (users table must exist)

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 1. CUSTOM TYPES
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE user_plan AS ENUM ('free', 'creator', 'pro', 'team');
CREATE TYPE credit_transaction_type AS ENUM ('subscription_grant', 'topup_purchase', 'ai_spend', 'refund');
CREATE TYPE credit_transaction_status AS ENUM ('pending', 'confirmed', 'refunded');
CREATE TYPE template_source AS ENUM ('ai_generated', 'community', 'official');
CREATE TYPE template_status AS ENUM ('published', 'pending_review', 'rejected', 'draft');
CREATE TYPE cms_platform AS ENUM ('webflow', 'shopify', 'wordpress', 'custom');

-- ═══════════════════════════════════════════════════════════════
-- 2. ALTER EXISTING USERS TABLE
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE users ADD COLUMN IF NOT EXISTS plan user_plan NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_status TEXT;  -- 'active', 'past_due', etc.
ALTER TABLE users ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════
-- 3. CREDIT BALANCES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE credit_balances (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    subscription_credits INTEGER NOT NULL DEFAULT 50,
    topup_credits INTEGER NOT NULL DEFAULT 0,
    credits_reset_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT positive_subscription_credits CHECK (subscription_credits >= 0),
    CONSTRAINT positive_topup_credits CHECK (topup_credits >= 0)
);

CREATE TRIGGER update_credit_balances_updated_at
    BEFORE UPDATE ON credit_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 4. CREDIT TRANSACTIONS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type credit_transaction_type NOT NULL,
    amount INTEGER NOT NULL,  -- positive = credit, negative = debit
    balance_after INTEGER NOT NULL,
    ai_action TEXT,
    ai_provider TEXT,
    ai_model TEXT,
    status credit_transaction_status NOT NULL DEFAULT 'confirmed',
    metadata JSONB NOT NULL DEFAULT '{}',
    stripe_payment_id TEXT,
    reference_transaction_id UUID REFERENCES credit_transactions(id),  -- for refunds
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX idx_credit_transactions_status ON credit_transactions(status) WHERE status = 'pending';

-- ═══════════════════════════════════════════════════════════════
-- 5. API KEYS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL,  -- SHA-256 hash
    key_prefix TEXT NOT NULL,  -- first 8 chars for display (e.g. "mfa_abc1")
    name TEXT NOT NULL DEFAULT 'Default',
    scopes TEXT[] NOT NULL DEFAULT ARRAY['ai', 'templates', 'export'],
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);

-- ═══════════════════════════════════════════════════════════════
-- 6. MARKETPLACE TEMPLATES (separate from design_templates)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE marketplace_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    thumbnail_url TEXT NOT NULL DEFAULT '',
    canvas_data JSONB NOT NULL,
    frame JSONB NOT NULL DEFAULT '{"width": 1080, "height": 1080}',
    category TEXT NOT NULL,
    subcategory TEXT NOT NULL DEFAULT '',
    cms_context TEXT[] NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    source template_source NOT NULL DEFAULT 'community',
    status template_status NOT NULL DEFAULT 'draft',
    schema_version INTEGER NOT NULL DEFAULT 1,
    use_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_marketplace_templates_status ON marketplace_templates(status);
CREATE INDEX idx_marketplace_templates_category ON marketplace_templates(category);
CREATE INDEX idx_marketplace_templates_source ON marketplace_templates(source);
CREATE INDEX idx_marketplace_templates_use_count ON marketplace_templates(use_count DESC);
CREATE INDEX idx_marketplace_templates_created_at ON marketplace_templates(created_at DESC);
CREATE INDEX idx_marketplace_templates_author_id ON marketplace_templates(author_id);
CREATE INDEX idx_marketplace_templates_cms_context ON marketplace_templates USING GIN(cms_context);
CREATE INDEX idx_marketplace_templates_tags ON marketplace_templates USING GIN(tags);

-- Full-text search index
ALTER TABLE marketplace_templates ADD COLUMN IF NOT EXISTS fts_document TSVECTOR
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(category, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(subcategory, '')), 'C')
    ) STORED;

CREATE INDEX idx_marketplace_templates_fts ON marketplace_templates USING GIN(fts_document);

CREATE TRIGGER update_marketplace_templates_updated_at
    BEFORE UPDATE ON marketplace_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 7. CMS CONNECTIONS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE cms_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform cms_platform NOT NULL,
    site_id TEXT NOT NULL,
    site_name TEXT NOT NULL DEFAULT '',
    access_token TEXT NOT NULL,  -- encrypted at application layer (AES-256-GCM)
    refresh_token TEXT,          -- encrypted at application layer
    token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,

    CONSTRAINT unique_user_platform_site UNIQUE (user_id, platform, site_id)
);

CREATE INDEX idx_cms_connections_user_id ON cms_connections(user_id);

-- ═══════════════════════════════════════════════════════════════
-- 8. RATE LIMITING
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE rate_limit_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    endpoint_group TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT unique_rate_limit_window UNIQUE (user_id, endpoint_group, window_start)
);

CREATE INDEX idx_rate_limit_entries_lookup ON rate_limit_entries(user_id, endpoint_group, window_start);

-- Auto-cleanup old rate limit entries (older than 2 hours)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_entries()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limit_entries WHERE window_start < NOW() - INTERVAL '2 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 9. FUNCTIONS: Credit Management
-- ═══════════════════════════════════════════════════════════════

-- Initialize credits for new user (called by trigger)
CREATE OR REPLACE FUNCTION initialize_user_credits()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO credit_balances (user_id, subscription_credits, topup_credits, credits_reset_at)
    VALUES (NEW.id, 50, 0, NOW() + INTERVAL '30 days')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_initialize_user_credits
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION initialize_user_credits();

-- Atomic credit deduction with hold (returns transaction_id and new balance)
CREATE OR REPLACE FUNCTION deduct_credits(
    p_user_id UUID,
    p_cost INTEGER,
    p_action TEXT,
    p_provider TEXT DEFAULT NULL,
    p_model TEXT DEFAULT NULL
)
RETURNS TABLE(transaction_id UUID, remaining_credits INTEGER) AS $$
DECLARE
    v_sub_credits INTEGER;
    v_topup_credits INTEGER;
    v_total INTEGER;
    v_sub_deduct INTEGER;
    v_topup_deduct INTEGER;
    v_new_sub INTEGER;
    v_new_topup INTEGER;
    v_new_total INTEGER;
    v_txn_id UUID;
BEGIN
    -- Lock the row to prevent race conditions
    SELECT cb.subscription_credits, cb.topup_credits
    INTO v_sub_credits, v_topup_credits
    FROM credit_balances cb
    WHERE cb.user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User credit balance not found';
    END IF;

    v_total := v_sub_credits + v_topup_credits;

    -- Check sufficient balance
    IF v_total < p_cost THEN
        RAISE EXCEPTION 'insufficient_credits:% %', v_total, p_cost;
    END IF;

    -- Deduct subscription credits first, then topup
    v_sub_deduct := LEAST(p_cost, v_sub_credits);
    v_topup_deduct := p_cost - v_sub_deduct;

    v_new_sub := v_sub_credits - v_sub_deduct;
    v_new_topup := v_topup_credits - v_topup_deduct;
    v_new_total := v_new_sub + v_new_topup;

    -- Update balance
    UPDATE credit_balances
    SET subscription_credits = v_new_sub,
        topup_credits = v_new_topup,
        updated_at = NOW()
    WHERE credit_balances.user_id = p_user_id;

    -- Log transaction with 'pending' status (hold phase)
    INSERT INTO credit_transactions (user_id, type, amount, balance_after, ai_action, ai_provider, ai_model, status)
    VALUES (p_user_id, 'ai_spend', -p_cost, v_new_total, p_action, p_provider, p_model, 'pending')
    RETURNING id INTO v_txn_id;

    RETURN QUERY SELECT v_txn_id, v_new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Confirm a pending transaction (AI call succeeded)
CREATE OR REPLACE FUNCTION confirm_credit_transaction(p_transaction_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE credit_transactions
    SET status = 'confirmed'
    WHERE id = p_transaction_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found or not in pending status';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refund a pending transaction (AI call failed)
CREATE OR REPLACE FUNCTION refund_credit_transaction(p_transaction_id UUID)
RETURNS void AS $$
DECLARE
    v_user_id UUID;
    v_amount INTEGER;
    v_balance_after INTEGER;
BEGIN
    -- Get the original transaction
    SELECT user_id, amount
    INTO v_user_id, v_amount
    FROM credit_transactions
    WHERE id = p_transaction_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found or not in pending status';
    END IF;

    -- Mark original transaction as refunded
    UPDATE credit_transactions
    SET status = 'refunded'
    WHERE id = p_transaction_id;

    -- Refund credits back to subscription_credits (simplest approach)
    UPDATE credit_balances
    SET subscription_credits = subscription_credits + ABS(v_amount),
        updated_at = NOW()
    WHERE user_id = v_user_id
    RETURNING (subscription_credits + topup_credits) INTO v_balance_after;

    -- Log the refund transaction
    INSERT INTO credit_transactions (user_id, type, amount, balance_after, status, reference_transaction_id)
    VALUES (v_user_id, 'refund', ABS(v_amount), v_balance_after, 'confirmed', p_transaction_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get plan credit allocation
CREATE OR REPLACE FUNCTION get_plan_credits(p_plan user_plan)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE p_plan
        WHEN 'free' THEN 50
        WHEN 'creator' THEN 500
        WHEN 'pro' THEN 2000
        WHEN 'team' THEN 5000
        ELSE 50
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ═══════════════════════════════════════════════════════════════
-- 10. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- credit_balances: users can view their own
CREATE POLICY credit_balances_select ON credit_balances
    FOR SELECT USING (auth.uid() = user_id);

-- credit_balances: only service_role can INSERT/UPDATE (via functions)
CREATE POLICY credit_balances_service ON credit_balances
    FOR ALL USING (auth.role() = 'service_role');

-- credit_transactions: users can view their own
CREATE POLICY credit_transactions_select ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- credit_transactions: only service_role can INSERT/UPDATE
CREATE POLICY credit_transactions_service ON credit_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- api_keys: users manage their own
CREATE POLICY api_keys_select ON api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY api_keys_insert ON api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY api_keys_update ON api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY api_keys_delete ON api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- api_keys: service_role can read all (for auth validation in Edge Functions)
CREATE POLICY api_keys_service_select ON api_keys
    FOR SELECT USING (auth.role() = 'service_role');

-- marketplace_templates: anyone can view published
CREATE POLICY marketplace_templates_select_published ON marketplace_templates
    FOR SELECT USING (status = 'published');

-- marketplace_templates: authenticated users can view their own (any status)
CREATE POLICY marketplace_templates_select_own ON marketplace_templates
    FOR SELECT USING (auth.uid() = author_id);

-- marketplace_templates: authenticated users can insert
CREATE POLICY marketplace_templates_insert ON marketplace_templates
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- marketplace_templates: users can update their own drafts/rejected
CREATE POLICY marketplace_templates_update_own ON marketplace_templates
    FOR UPDATE USING (auth.uid() = author_id AND status IN ('draft', 'rejected', 'pending_review'));

-- marketplace_templates: users can delete their own
CREATE POLICY marketplace_templates_delete_own ON marketplace_templates
    FOR DELETE USING (auth.uid() = author_id);

-- marketplace_templates: service_role has full access (for AI generation, moderation)
CREATE POLICY marketplace_templates_service ON marketplace_templates
    FOR ALL USING (auth.role() = 'service_role');

-- cms_connections: users manage their own
CREATE POLICY cms_connections_select ON cms_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY cms_connections_insert ON cms_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY cms_connections_update ON cms_connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY cms_connections_delete ON cms_connections
    FOR DELETE USING (auth.uid() = user_id);

-- rate_limit_entries: service_role only
CREATE POLICY rate_limit_entries_service ON rate_limit_entries
    FOR ALL USING (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════
-- 11. RECORD MIGRATION
-- ═══════════════════════════════════════════════════════════════

INSERT INTO schema_migrations (version) VALUES ('002_credit_system_schema');

COMMIT;
