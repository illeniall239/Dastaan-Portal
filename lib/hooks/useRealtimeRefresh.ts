"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TableConfig =
  | string
  | { table: string; filter?: string; event?: "INSERT" | "UPDATE" | "DELETE" | "*" };

/**
 * Subscribes to Supabase Realtime postgres_changes on the given tables.
 * Returns a version counter that increments on each change — add it to
 * a useEffect dependency array to trigger a refetch.
 *
 * Requires tables to be in the supabase_realtime publication
 * (see migration 20261008000001_enable_realtime_sync.sql).
 */
export function useRealtimeRefresh(tables: TableConfig[]): number {
  const [version, setVersion] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const configKey = JSON.stringify(
    tables.map((t) =>
      typeof t === "string"
        ? { table: t, event: "*", filter: "" }
        : { table: t.table, event: t.event || "*", filter: t.filter || "" }
    )
  );

  useEffect(() => {
    const supabase = createClient();
    const parsed: Array<{ table: string; event: string; filter: string }> =
      JSON.parse(configKey);
    const channelName = `rt-${parsed.map((p) => p.table).join("-")}-${Math.random().toString(36).slice(2, 7)}`;

    let channel = supabase.channel(channelName);

    for (const sub of parsed) {
      channel = channel.on(
        "postgres_changes" as any,
        {
          event: sub.event,
          schema: "public",
          table: sub.table,
          ...(sub.filter ? { filter: sub.filter } : {}),
        },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => setVersion((v) => v + 1), 300);
        }
      );
    }

    channel.subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [configKey]);

  return version;
}
