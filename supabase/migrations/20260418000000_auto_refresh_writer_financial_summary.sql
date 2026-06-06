-- Auto-refresh writer_financial_summary every 5 minutes via pg_cron
-- pg_cron is already installed (see 20251027000008_evaluation_deadline_cron.sql)

SELECT cron.schedule(
  'refresh-writer-financial-summary',
  '*/5 * * * *',
  'SELECT refresh_writer_financial_summary()'
);
