-- Rollback: 002_credit_system_schema
-- Reverses all changes from the credit system migration

BEGIN;

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_initialize_user_credits ON users;
DROP TRIGGER IF EXISTS update_credit_balances_updated_at ON credit_balances;
DROP TRIGGER IF EXISTS update_marketplace_templates_updated_at ON marketplace_templates;

-- Drop functions
DROP FUNCTION IF EXISTS initialize_user_credits();
DROP FUNCTION IF EXISTS deduct_credits(UUID, INTEGER, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS confirm_credit_transaction(UUID);
DROP FUNCTION IF EXISTS refund_credit_transaction(UUID);
DROP FUNCTION IF EXISTS get_plan_credits(user_plan);
DROP FUNCTION IF EXISTS cleanup_rate_limit_entries();

-- Drop tables (order matters for foreign keys)
DROP TABLE IF EXISTS rate_limit_entries CASCADE;
DROP TABLE IF EXISTS cms_connections CASCADE;
DROP TABLE IF EXISTS marketplace_templates CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS credit_balances CASCADE;

-- Remove columns from users
ALTER TABLE users DROP COLUMN IF EXISTS plan;
ALTER TABLE users DROP COLUMN IF EXISTS plan_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE users DROP COLUMN IF EXISTS stripe_status;
ALTER TABLE users DROP COLUMN IF EXISTS flagged_at;

-- Drop custom types
DROP TYPE IF EXISTS cms_platform;
DROP TYPE IF EXISTS template_status;
DROP TYPE IF EXISTS template_source;
DROP TYPE IF EXISTS credit_transaction_status;
DROP TYPE IF EXISTS credit_transaction_type;
DROP TYPE IF EXISTS user_plan;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = '002_credit_system_schema';

COMMIT;
