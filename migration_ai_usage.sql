-- AI budget & usage tracking
-- Safe to run twice — every statement is idempotent.

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  bucket TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  local_date TEXT NOT NULL,
  local_month TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_usage_log_user_date_idx ON public.ai_usage_log (user_id, bucket, local_date);
CREATE INDEX IF NOT EXISTS ai_usage_log_month_idx ON public.ai_usage_log (local_month);
CREATE INDEX IF NOT EXISTS ai_usage_log_created_at_idx ON public.ai_usage_log (created_at);

CREATE TABLE IF NOT EXISTS public.ai_daily_usage (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  bucket TEXT NOT NULL,
  local_date TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_daily_usage_user_bucket_date_idx
  ON public.ai_daily_usage (user_id, bucket, local_date);
