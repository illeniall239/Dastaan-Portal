// Rich text (bold / italic / underline / lists) is stored as HTML produced by the editor in
// components/ui/rich-text-editor.tsx. Older values are plain text.

const HTML_TAG = /<\/?(p|br|ul|ol|li|strong|b|em|i|u|s|h[1-6]|blockquote)\b[^>]*>/i;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Pasted from desktop Outlook / Word: their bullets and numbering are not real lists but paragraphs
 * styled "mso-list:l0 level1" with a fake "·" or "1." marker. Turn those into <ul>/<ol> (nested by
 * level) so they paste as real lists. Anything else is returned untouched. Browser only (DOMParser).
 */
export function normalizeOfficeLists(html: string): string {
  if (!/mso-list/i.test(html) || typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const LIST_ITEM = /mso-list:\s*(l\d+)\s+level(\d+)/i;
  const items = [...doc.body.querySelectorAll("p")].filter((p) => LIST_ITEM.test(p.getAttribute("style") || ""));
  if (items.length === 0) return html;

  let stack: { level: number; el: HTMLElement }[] = [];
  for (const p of items) {
    const [, , lvl] = (p.getAttribute("style") || "").match(LIST_ITEM)!;
    const level = Number(lvl);
    const marker = [...p.querySelectorAll("span")].find((s) => /mso-list:\s*ignore/i.test(s.getAttribute("style") || ""));
    const ordered = /^(\d+|[a-z]|[ivxlcdm]+)[.)]$/i.test((marker?.textContent || "").replace(/ /g, " ").trim().split(/\s+/)[0] || "");
    marker?.remove();
    // Outlook's <![if !supportLists]> wrappers parse as comments
    [...p.childNodes].filter((n) => n.nodeType === 8).forEach((n) => n.remove());
    const tag = ordered ? "OL" : "UL";

    // A new list starts when this item doesn't directly follow the current one
    if (!stack.length || p.previousElementSibling !== stack[0].el) stack = [];
    while (stack.length && stack[stack.length - 1].level > level) stack.pop();
    if (stack.length && stack[stack.length - 1].level === level && stack[stack.length - 1].el.tagName !== tag) {
      stack.pop();
      if (!stack.length) {
        // switching between bullets and numbers at the top level: a new list right after the old one
        const list = doc.createElement(tag);
        p.before(list);
        stack = [{ level, el: list }];
      }
    }
    const top = stack[stack.length - 1];
    if (!top || top.level < level) {
      const list = doc.createElement(tag);
      if (!top) p.before(list);
      else (top.el.lastElementChild ?? top.el.appendChild(doc.createElement("li"))).appendChild(list);
      stack.push({ level, el: list });
    }
    const li = doc.createElement("li");
    while (p.firstChild) li.appendChild(p.firstChild);
    stack[stack.length - 1].el.appendChild(li);
    p.remove();
  }
  return doc.body.innerHTML;
}

/** Editor input: HTML as is; plain text becomes one paragraph per line so line breaks survive */
export function toEditorHtml(value: string | null | undefined): string {
  if (!value) return "";
  if (HTML_TAG.test(value)) return value;
  return value.split(/\r?\n/).map((line) => `<p>${escapeHtml(line)}</p>`).join("");
}
