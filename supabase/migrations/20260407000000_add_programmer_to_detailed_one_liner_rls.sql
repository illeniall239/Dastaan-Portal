-- Add programmer role access to detailed one-liner tables
-- Safe to run multiple times: DROP IF EXISTS before each CREATE

-- ============================================================
-- detailed_one_liners
-- ============================================================

-- Drop old policy names (from migration 20251109000000)
DROP POLICY IF EXISTS detailed_one_liners_evaluator_select ON detailed_one_liners;
DROP POLICY IF EXISTS detailed_one_liners_insert ON detailed_one_liners;
DROP POLICY IF EXISTS detailed_one_liners_update ON detailed_one_liners;
DROP POLICY IF EXISTS detailed_one_liners_delete ON detailed_one_liners;

-- Drop new policy names (from migration 20251109000002)
DROP POLICY IF EXISTS "Authorized users can view detailed one-liners" ON detailed_one_liners;
DROP POLICY IF EXISTS "Evaluators and content managers can create detailed one-liners" ON detailed_one_liners;
DROP POLICY IF EXISTS "Users can update own detailed one-liners" ON detailed_one_liners;
DROP POLICY IF EXISTS "Users can delete own detailed one-liners" ON detailed_one_liners;

-- Recreate with programmer included
CREATE POLICY detailed_one_liners_select ON detailed_one_liners
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('evaluator', 'content_manager', 'programmer', 'management', 'admin')
  );

CREATE POLICY detailed_one_liners_insert ON detailed_one_liners
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('evaluator', 'content_manager', 'programmer', 'admin')
  );

CREATE POLICY detailed_one_liners_update ON detailed_one_liners
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR get_user_role() IN ('content_manager', 'programmer', 'admin')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR get_user_role() IN ('content_manager', 'programmer', 'admin')
  );

CREATE POLICY detailed_one_liners_delete ON detailed_one_liners
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR get_user_role() IN ('content_manager', 'admin')
  );

-- ============================================================
-- narrative_breakdown_items
-- ============================================================

DROP POLICY IF EXISTS narrative_breakdown_evaluator_select ON narrative_breakdown_items;
DROP POLICY IF EXISTS narrative_breakdown_insert ON narrative_breakdown_items;
DROP POLICY IF EXISTS narrative_breakdown_update ON narrative_breakdown_items;
DROP POLICY IF EXISTS narrative_breakdown_delete ON narrative_breakdown_items;
DROP POLICY IF EXISTS "Authorized users can view narrative breakdown items" ON narrative_breakdown_items;
DROP POLICY IF EXISTS "Evaluators and content managers can create narrative items" ON narrative_breakdown_items;
DROP POLICY IF EXISTS "Users can update own narrative items" ON narrative_breakdown_items;
DROP POLICY IF EXISTS "Users can delete own narrative items" ON narrative_breakdown_items;

CREATE POLICY narrative_breakdown_select ON narrative_breakdown_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = narrative_breakdown_items.detailed_one_liner_id
        AND get_user_role() IN ('evaluator', 'content_manager', 'programmer', 'management', 'admin')
    )
  );

CREATE POLICY narrative_breakdown_insert ON narrative_breakdown_items
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('evaluator', 'content_manager', 'programmer', 'admin')
  );

CREATE POLICY narrative_breakdown_update ON narrative_breakdown_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = narrative_breakdown_items.detailed_one_liner_id
        AND (dol.created_by = auth.uid() OR get_user_role() IN ('content_manager', 'programmer', 'admin'))
    )
  );

CREATE POLICY narrative_breakdown_delete ON narrative_breakdown_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = narrative_breakdown_items.detailed_one_liner_id
        AND (dol.created_by = auth.uid() OR get_user_role() IN ('content_manager', 'admin'))
    )
  );

-- ============================================================
-- event_planning_items
-- ============================================================

DROP POLICY IF EXISTS event_planning_items_evaluator_select ON event_planning_items;
DROP POLICY IF EXISTS event_planning_items_insert ON event_planning_items;
DROP POLICY IF EXISTS event_planning_items_update ON event_planning_items;
DROP POLICY IF EXISTS event_planning_items_delete ON event_planning_items;

CREATE POLICY event_planning_items_select ON event_planning_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = event_planning_items.detailed_one_liner_id
        AND get_user_role() IN ('evaluator', 'content_manager', 'programmer', 'management', 'admin')
    )
  );

CREATE POLICY event_planning_items_insert ON event_planning_items
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('evaluator', 'content_manager', 'programmer', 'admin')
  );

CREATE POLICY event_planning_items_update ON event_planning_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = event_planning_items.detailed_one_liner_id
        AND (dol.created_by = auth.uid() OR get_user_role() IN ('content_manager', 'programmer', 'admin'))
    )
  );

CREATE POLICY event_planning_items_delete ON event_planning_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = event_planning_items.detailed_one_liner_id
        AND (dol.created_by = auth.uid() OR get_user_role() IN ('content_manager', 'admin'))
    )
  );

-- ============================================================
-- potential_weaknesses_risks_items
-- ============================================================

DROP POLICY IF EXISTS weaknesses_risks_evaluator_select ON potential_weaknesses_risks_items;
DROP POLICY IF EXISTS weaknesses_risks_insert ON potential_weaknesses_risks_items;
DROP POLICY IF EXISTS weaknesses_risks_update ON potential_weaknesses_risks_items;
DROP POLICY IF EXISTS weaknesses_risks_delete ON potential_weaknesses_risks_items;

CREATE POLICY weaknesses_risks_select ON potential_weaknesses_risks_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = potential_weaknesses_risks_items.detailed_one_liner_id
        AND get_user_role() IN ('evaluator', 'content_manager', 'programmer', 'management', 'admin')
    )
  );

CREATE POLICY weaknesses_risks_insert ON potential_weaknesses_risks_items
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('evaluator', 'content_manager', 'programmer', 'admin')
  );

CREATE POLICY weaknesses_risks_update ON potential_weaknesses_risks_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = potential_weaknesses_risks_items.detailed_one_liner_id
        AND (dol.created_by = auth.uid() OR get_user_role() IN ('content_manager', 'programmer', 'admin'))
    )
  );

CREATE POLICY weaknesses_risks_delete ON potential_weaknesses_risks_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = potential_weaknesses_risks_items.detailed_one_liner_id
        AND (dol.created_by = auth.uid() OR get_user_role() IN ('content_manager', 'admin'))
    )
  );

-- ============================================================
-- character_relationships
-- ============================================================

DROP POLICY IF EXISTS character_relationships_select ON character_relationships;
DROP POLICY IF EXISTS character_relationships_insert ON character_relationships;
DROP POLICY IF EXISTS character_relationships_update ON character_relationships;
DROP POLICY IF EXISTS character_relationships_delete ON character_relationships;

CREATE POLICY character_relationships_select ON character_relationships
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = character_relationships.detailed_one_liner_id
        AND get_user_role() IN ('evaluator', 'content_manager', 'programmer', 'management', 'admin')
    )
  );

CREATE POLICY character_relationships_insert ON character_relationships
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('evaluator', 'content_manager', 'programmer', 'admin')
  );

CREATE POLICY character_relationships_update ON character_relationships
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = character_relationships.detailed_one_liner_id
        AND (dol.created_by = auth.uid() OR get_user_role() IN ('content_manager', 'programmer', 'admin'))
    )
  );

CREATE POLICY character_relationships_delete ON character_relationships
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = character_relationships.detailed_one_liner_id
        AND (dol.created_by = auth.uid() OR get_user_role() IN ('content_manager', 'admin'))
    )
  );
