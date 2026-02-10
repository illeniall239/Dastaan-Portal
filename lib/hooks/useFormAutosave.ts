"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/** Check if form data has any meaningful user-entered content */
function hasContent(data: Record<string, unknown>): boolean {
  // Fields that always have default values and don't count as user input
  const ignoredKeys = new Set(["status", "overallRating"]);

  for (const [key, value] of Object.entries(data)) {
    if (ignoredKeys.has(key)) continue;
    if (typeof value === "string" && value.trim().length > 0) return true;
    if (Array.isArray(value) && value.length > 0) return true;
  }
  return false;
}

interface UseFormAutosaveOptions {
  /** Identifier for the form type, e.g. 'call_report', 'schedule_meeting' */
  formType: string;
  /** Identifier for the entity being edited, e.g. callReportId. Defaults to '_new' for creation forms */
  entityId?: string;
  /** Whether autosave is enabled. Defaults to true */
  enabled?: boolean;
  /** Debounce interval in ms before saving. Defaults to 3000 */
  debounceMs?: number;
}

interface UseFormAutosaveReturn {
  /** Whether a saved draft exists for this form */
  hasDraft: boolean;
  /** Whether the initial draft check has completed */
  draftLoaded: boolean;
  /** Timestamp of the last successful autosave */
  lastSaved: Date | null;
  /** The updated_at from the draft (for displaying "draft from X ago") */
  draftUpdatedAt: string | null;
  /** Whether a save is in progress */
  isSaving: boolean;
  /** Save form data (debounced). Call this whenever form state changes */
  saveDraft: (data: Record<string, unknown>) => void;
  /** Load and return draft data, or null if none exists */
  loadDraft: () => Promise<Record<string, unknown> | null>;
  /** Delete the draft. Call this after successful form submission */
  clearDraft: () => Promise<void>;
}

export function useFormAutosave({
  formType,
  entityId = "_new",
  enabled = true,
  debounceMs = 3000,
}: UseFormAutosaveOptions): UseFormAutosaveReturn {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingData = useRef<Record<string, unknown> | null>(null);
  const isInitialMount = useRef(true);

  const buildUrl = useCallback(
    (params?: Record<string, string>) => {
      const url = new URL("/api/form-drafts", window.location.origin);
      url.searchParams.set("form_type", formType);
      url.searchParams.set("entity_id", entityId);
      if (params) {
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      }
      return url.toString();
    },
    [formType, entityId]
  );

  // Check for existing draft on mount
  useEffect(() => {
    if (!enabled) {
      setDraftLoaded(true);
      return;
    }

    let cancelled = false;

    const checkDraft = async () => {
      try {
        const res = await fetch(buildUrl(), { cache: "no-store" });
        if (!res.ok) {
          setDraftLoaded(true);
          return;
        }
        const { draft } = await res.json();
        if (!cancelled) {
          setHasDraft(!!draft);
          setDraftUpdatedAt(draft?.updated_at || null);
          setDraftLoaded(true);
        }
      } catch {
        if (!cancelled) setDraftLoaded(true);
      }
    };

    checkDraft();
    return () => {
      cancelled = true;
    };
  }, [enabled, buildUrl]);

  // Perform the actual save
  const doSave = useCallback(
    async (data: Record<string, unknown>) => {
      setIsSaving(true);
      try {
        const res = await fetch("/api/form-drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            form_type: formType,
            entity_id: entityId,
            draft_data: data,
          }),
        });
        if (res.ok) {
          const now = new Date();
          setLastSaved(now);
          setHasDraft(true);
          setDraftUpdatedAt(now.toISOString());
        }
      } catch {
        // Silent fail — autosave should never block the user
      } finally {
        setIsSaving(false);
      }
    },
    [formType, entityId]
  );

  // Debounced save — call this on every form state change
  const saveDraft = useCallback(
    (data: Record<string, unknown>) => {
      if (!enabled) return;

      // Skip saving on initial mount to avoid overwriting drafts with empty data
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }

      // Don't save drafts for empty/default forms — only save when user has entered real data
      if (!hasContent(data)) return;

      pendingData.current = data;

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        if (pendingData.current) {
          doSave(pendingData.current);
          pendingData.current = null;
        }
      }, debounceMs);
    },
    [enabled, debounceMs, doSave]
  );

  // Load draft data for restoration
  const loadDraft = useCallback(async (): Promise<Record<string, unknown> | null> => {
    try {
      const res = await fetch(buildUrl(), { cache: "no-store" });
      if (!res.ok) return null;
      const { draft } = await res.json();
      return draft?.draft_data || null;
    } catch {
      return null;
    }
  }, [buildUrl]);

  // Delete draft (call after successful form submission)
  const clearDraft = useCallback(async () => {
    // Cancel any pending saves
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    pendingData.current = null;

    try {
      await fetch(buildUrl(), { method: "DELETE" });
      setHasDraft(false);
      setLastSaved(null);
      setDraftUpdatedAt(null);
    } catch {
      // Silent fail
    }
  }, [buildUrl]);

  // Cleanup debounce timer on unmount — flush any pending save
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        // Flush pending save on unmount (only if form has real content)
        if (pendingData.current && hasContent(pendingData.current)) {
          const data = pendingData.current;
          // Fire-and-forget save
          fetch("/api/form-drafts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              form_type: formType,
              entity_id: entityId,
              draft_data: data,
            }),
            keepalive: true,
          }).catch(() => {});
        }
      }
    };
  }, [formType, entityId]);

  return {
    hasDraft,
    draftLoaded,
    lastSaved,
    draftUpdatedAt,
    isSaving,
    saveDraft,
    loadDraft,
    clearDraft,
  };
}
