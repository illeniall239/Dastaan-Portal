-- One-off: change "I love you two" (CR-2025-7784, Sarah Majeed Bhatti) from Ramadan Serial to Serial.
-- Only touches this one project, and only while it is still Ramadan Serial. Run on production.

update public.call_reports
set content_type = 'Serial',
    updated_at   = now()
where call_report_id = 'CR-2025-7784'
  and content_type = 'Ramadan Serial'
returning call_report_id, working_title, writer_name, content_type;
