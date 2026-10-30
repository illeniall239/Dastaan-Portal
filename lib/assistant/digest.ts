// The "data digest" is a hidden copy of an answer's tool results, kept in the reply as an HTML
// comment so a follow-up question can refer back to it. It is saved with the chat and re-sent as
// history, so it must stay small, and only the latest one is worth sending.
import { shrink } from "@/lib/assistant/management-reports";

export const DIGEST_MAX_CHARS = 4000;
const DIGEST_RE = /\n*<!-- data-digest[\s\S]*?-->/g;
// Instructions meant for the model on that turn only; useless in a later turn's history
const DROP_KEYS = new Set(["how_to_read", "focus_rule", "phase_rule", "tags_in_scope", "note"]);
const MAX_STRING = 160;

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).filter(([k]) => !DROP_KEYS.has(k)).map(([k, v]) => [k, strip(v)]));
  }
  if (typeof value === "string" && value.length > MAX_STRING) return `${value.slice(0, MAX_STRING)}…`;
  return value;
}

/** The digest text for this answer's tool results, at most maxChars long. */
export function buildDigest(results: { name: string; data: string }[], maxChars = DIGEST_MAX_CHARS): string {
  const parsed = results.map((r) => {
    try { return { name: r.name, value: strip(JSON.parse(r.data)) }; }
    catch { return { name: r.name, value: r.data.slice(0, 500) }; }
  });
  let text = "";
  for (const items of [10, 5, 3, 1]) {
    text = parsed.map((p) => `[${p.name}] ${JSON.stringify(shrink(p.value, items))}`).join("\n");
    if (text.length <= maxChars) break;
  }
  // "-->" inside the data would end the HTML comment early
  return text.slice(0, maxChars).replace(/-->/g, "--\\u003e");
}

/** The digest as it is appended to a reply. */
export function digestBlock(results: { name: string; data: string }[]): string {
  return results.length > 0 ? `\n\n<!-- data-digest\n${buildDigest(results)}\n-->` : "";
}

/** History with every assistant digest removed except the latest one. */
export function stripOldDigests<T extends { role: string; content: string }>(history: T[]): T[] {
  const lastAssistant = history.map((m) => m.role).lastIndexOf("assistant");
  return history.map((m, i) =>
    m.role === "assistant" && i !== lastAssistant ? { ...m, content: m.content.replace(DIGEST_RE, "") } : m
  );
}
