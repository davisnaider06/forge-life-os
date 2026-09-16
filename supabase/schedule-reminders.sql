-- Optional AFTER deployment and VAPID setup. Requires Supabase Cron + pg_net + Vault.
-- Store app_url (HTTPS production origin) and forge_cron_secret in Vault first.
-- Do not paste secrets into tracked files.
select cron.schedule('forge-reminders', '*/15 * * * *', $$
 select net.http_get(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'forge_app_url') || '/api/cron/reminders',
  headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'forge_cron_secret'))
 );
$$);
