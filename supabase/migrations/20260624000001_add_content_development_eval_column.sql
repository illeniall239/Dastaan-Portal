-- Add Content Development team evaluation scores to consolidated_cms_view
-- Separates management-type team evaluations from actual management evaluations

DROP VIEW IF EXISTS consolidated_cms_view;

CREATE VIEW consolidated_cms_view AS
WITH evaluation_summary AS (
    SELECT
        ef.call_report_id,
        CASE
            WHEN et.team_type = 'management' THEN 'content_development'
            WHEN u.role = 'programmer' THEN 'programming'
            WHEN u.role IN ('admin', 'management', 'executive') THEN 'management'
            ELSE 'content'
        END AS team_type,
        AVG(ef.premise_conflict_score) AS avg_conflict,
        AVG(ef.characters_score) AS avg_characters,
        AVG(ef.episodic_progression_score) AS avg_progression,
        AVG(ef.freezes_score) AS avg_freezes,
        AVG(ef.whats_next_score) AS avg_whats_next,
        AVG(ef.average_score) AS avg_overall,
        COUNT(*) AS eval_count
    FROM evaluator_forms ef
    JOIN users u ON ef.evaluator_id = u.id
    LEFT JOIN teams et ON u.team_id = et.id
    WHERE ef.submitted_at IS NOT NULL
    GROUP BY ef.call_report_id,
        CASE
            WHEN et.team_type = 'management' THEN 'content_development'
            WHEN u.role = 'programmer' THEN 'programming'
            WHEN u.role IN ('admin', 'management', 'executive') THEN 'management'
            ELSE 'content'
        END
),
team_evals AS (
    SELECT
        call_report_id,
        -- Content Team (internal evaluators)
        MAX(CASE WHEN team_type = 'content' THEN avg_conflict END) AS content_conflict,
        MAX(CASE WHEN team_type = 'content' THEN avg_characters END) AS content_characters,
        MAX(CASE WHEN team_type = 'content' THEN avg_progression END) AS content_progression,
        MAX(CASE WHEN team_type = 'content' THEN avg_freezes END) AS content_freezes,
        MAX(CASE WHEN team_type = 'content' THEN avg_whats_next END) AS content_whats_next,
        MAX(CASE WHEN team_type = 'content' THEN avg_overall END) AS content_overall,
        -- Programming Team
        MAX(CASE WHEN team_type = 'programming' THEN avg_conflict END) AS programming_conflict,
        MAX(CASE WHEN team_type = 'programming' THEN avg_characters END) AS programming_characters,
        MAX(CASE WHEN team_type = 'programming' THEN avg_progression END) AS programming_progression,
        MAX(CASE WHEN team_type = 'programming' THEN avg_freezes END) AS programming_freezes,
        MAX(CASE WHEN team_type = 'programming' THEN avg_whats_next END) AS programming_whats_next,
        MAX(CASE WHEN team_type = 'programming' THEN avg_overall END) AS programming_overall,
        -- Content Development Team (management-type teams e.g. Humera's team)
        MAX(CASE WHEN team_type = 'content_development' THEN avg_conflict END) AS content_dev_conflict,
        MAX(CASE WHEN team_type = 'content_development' THEN avg_characters END) AS content_dev_characters,
        MAX(CASE WHEN team_type = 'content_development' THEN avg_progression END) AS content_dev_progression,
        MAX(CASE WHEN team_type = 'content_development' THEN avg_freezes END) AS content_dev_freezes,
        MAX(CASE WHEN team_type = 'content_development' THEN avg_whats_next END) AS content_dev_whats_next,
        MAX(CASE WHEN team_type = 'content_development' THEN avg_overall END) AS content_dev_overall,
        -- Management Team (actual admin/executive evaluations)
        MAX(CASE WHEN team_type = 'management' THEN avg_conflict END) AS management_conflict,
        MAX(CASE WHEN team_type = 'management' THEN avg_characters END) AS management_characters,
        MAX(CASE WHEN team_type = 'management' THEN avg_progression END) AS management_progression,
        MAX(CASE WHEN team_type = 'management' THEN avg_freezes END) AS management_freezes,
        MAX(CASE WHEN team_type = 'management' THEN avg_whats_next END) AS management_whats_next,
        MAX(CASE WHEN team_type = 'management' THEN avg_overall END) AS management_overall,
        -- Evaluator counts per group
        MAX(CASE WHEN team_type = 'content' THEN eval_count END) AS content_eval_count,
        MAX(CASE WHEN team_type = 'programming' THEN eval_count END) AS programming_eval_count,
        MAX(CASE WHEN team_type = 'content_development' THEN eval_count END) AS content_dev_eval_count,
        MAX(CASE WHEN team_type = 'management' THEN eval_count END) AS management_eval_count
    FROM evaluation_summary
    GROUP BY call_report_id
),
-- Episode-level aggregation for script aging (version-aware)
episode_stats AS (
    SELECT
        e.call_report_id,
        COUNT(*) FILTER (WHERE e.is_current = true)::INT AS actual_received_episodes,
        MIN(e.created_at) AS first_episode_received_at,
        MAX(e.created_at) AS last_episode_received_at,
        COUNT(DISTINCT e.episode_number) FILTER (WHERE e.version > 1)::INT AS revised_episode_count,
        COUNT(*) FILTER (WHERE e.is_current = true AND e.approval_status = 'approved')::INT AS approved_episode_count,
        COUNT(*) FILTER (WHERE e.is_current = true AND e.approval_status = 'rejected')::INT AS rejected_episode_count,
        COUNT(*) FILTER (WHERE e.is_current = true AND e.approval_status = 'needs_revision')::INT AS needs_revision_episode_count
    FROM episodes e
    WHERE e.call_report_id IS NOT NULL
    GROUP BY e.call_report_id
),
episode_monthly AS (
    SELECT
        call_report_id,
        jsonb_object_agg(month_key, ep_count) AS monthly_episode_receipts
    FROM (
        SELECT call_report_id, to_char(created_at, 'YYYY-MM') AS month_key, COUNT(*)::INT AS ep_count
        FROM episodes
        WHERE call_report_id IS NOT NULL AND is_current = true
        GROUP BY call_report_id, to_char(created_at, 'YYYY-MM')
    ) sub
    GROUP BY call_report_id
)
SELECT
    cr.id,
    cr.working_title,
    COALESCE(
        (SELECT string_agg(w.name, ', ')
         FROM call_report_writers crw
         JOIN writers w ON crw.writer_id = w.id
         WHERE crw.call_report_id = cr.id),
        cr.writer_name
    ) AS writer_name,
    cr.director,
    cr.genre,
    cr.target_slot AS slot,
    cr.logline,
    cr.status,
    cr.total_episodes,
    cr.received_episodes,
    cr.completion_percentage,
    th.name AS person_in_charge,
    el.final_decision AS one_liner_approved,
    el.approval_count,
    el.rejection_count,
    el.needs_improvement_count,
    el.total_evaluators,
    cr.theme,
    cr.content_type,
    cr.evaluation_deadline,
    cr.created_at,
    cr.overall_rating,
    cr.average_initial_assessment,
    cr.assessment_count,
    cr.average_score,
    cr.meeting_date,
    cr.category,
    cr.management_member_name,
    cr.idea_by,
    cr.developed_by,
    cr.remarks,
    cr.team_id,
    -- Episode Aging
    es.actual_received_episodes,
    es.first_episode_received_at,
    es.last_episode_received_at,
    es.revised_episode_count,
    es.approved_episode_count,
    es.rejected_episode_count,
    es.needs_revision_episode_count,
    COALESCE(em.monthly_episode_receipts, '{}'::jsonb) AS monthly_episode_receipts,
    -- Evaluations (per-group scores)
    te.content_conflict,
    te.content_characters,
    te.content_progression,
    te.content_freezes,
    te.content_whats_next,
    te.content_overall,
    te.programming_conflict,
    te.programming_characters,
    te.programming_progression,
    te.programming_freezes,
    te.programming_whats_next,
    te.programming_overall,
    te.content_dev_conflict,
    te.content_dev_characters,
    te.content_dev_progression,
    te.content_dev_freezes,
    te.content_dev_whats_next,
    te.content_dev_overall,
    te.management_conflict,
    te.management_characters,
    te.management_progression,
    te.management_freezes,
    te.management_whats_next,
    te.management_overall,
    -- Evaluator counts per group
    COALESCE(te.content_eval_count, 0) AS content_eval_count,
    COALESCE(te.programming_eval_count, 0) AS programming_eval_count,
    COALESCE(te.content_dev_eval_count, 0) AS content_dev_eval_count,
    COALESCE(te.management_eval_count, 0) AS management_eval_count
FROM call_reports cr
LEFT JOIN teams t ON cr.team_id = t.id
LEFT JOIN users th ON t.team_head_id = th.id
LEFT JOIN evaluation_logs el ON cr.id = el.call_report_id
LEFT JOIN team_evals te ON cr.id = te.call_report_id
LEFT JOIN episode_stats es ON cr.id = es.call_report_id
LEFT JOIN episode_monthly em ON cr.id = em.call_report_id
WHERE cr.meeting_type = 'call_report' AND cr.archived_at IS NULL;

ALTER VIEW consolidated_cms_view SET (security_invoker = on);

COMMENT ON VIEW consolidated_cms_view IS 'Master view for the Consolidated CMS with per-group evaluation averages (content, programming, content development, management), counts, and unified initial assessments';
