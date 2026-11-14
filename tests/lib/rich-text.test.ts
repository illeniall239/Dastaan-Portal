import { describe, it, expect } from "vitest";
import { toEditorHtml, normalizeOfficeLists } from "@/lib/rich-text";

// How classic desktop Outlook / Word puts lists on the clipboard
const bullet = (text: string, list = "l0", level = 1, mark = "·") =>
  `<p class=MsoListParagraph style='text-indent:-.25in;mso-list:${list} level${level} lfo1'><![if !supportLists]><span style='font-family:Symbol'><span style='mso-list:Ignore'>${mark}<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><![endif]>${text}<o:p></o:p></p>`;

const listsOf = (html: string) => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const walk = (el: Element): unknown =>
    [...el.children].filter((c) => c.tagName === "LI").map((li) => {
      const nested = li.querySelector(":scope > ul, :scope > ol");
      const text = [...li.childNodes].filter((n) => !(n instanceof Element && /^(UL|OL)$/.test(n.tagName))).map((n) => n.textContent).join("").trim();
      return nested ? { [text]: { [nested.tagName]: walk(nested) } } : text;
    });
  return [...doc.body.children].filter((c) => /^(UL|OL)$/.test(c.tagName)).map((l) => ({ [l.tagName]: walk(l) }));
};

describe("normalizeOfficeLists (pasting from desktop Outlook / Word)", () => {
  it("turns fake bullets into a real bullet list, keeping the formatting around it", () => {
    const html = `<p class=MsoNormal><b>Approved</b> with <i>small</i> changes<o:p></o:p></p>${bullet("Tighten act two")}${bullet("Cut the <b>flashback</b>")}<p class=MsoNormal>Regards</p>`;
    const out = normalizeOfficeLists(html);
    expect(listsOf(out)).toEqual([{ UL: ["Tighten act two", "Cut the flashback"] }]);
    expect(out).not.toContain("·");
    expect(out).toContain("<b>Approved</b>");
    expect(out).toContain("<b>flashback</b>");
    expect(out.indexOf("Approved")).toBeLessThan(out.indexOf("<ul>"));
    expect(out.indexOf("</ul>")).toBeLessThan(out.indexOf("Regards"));
  });

  it("turns fake numbering into a numbered list, separate from a bullet list before it", () => {
    const html = bullet("Point") + bullet("Send draft 2", "l1", 1, "1.") + bullet("Book the meeting", "l1", 1, "2.");
    expect(listsOf(normalizeOfficeLists(html))).toEqual([{ UL: ["Point"] }, { OL: ["Send draft 2", "Book the meeting"] }]);
  });

  it("nests indented sub-points", () => {
    const html = bullet("Act one") + bullet("Shorter opening", "l0", 2, "o") + bullet("Act two");
    expect(listsOf(normalizeOfficeLists(html))).toEqual([{ UL: [{ "Act one": { UL: ["Shorter opening"] } }, "Act two"] }]);
  });

  it("starts a new list when ordinary text separates two lists", () => {
    const html = bullet("First") + "<p class=MsoNormal>Also:</p>" + bullet("Second");
    expect(listsOf(normalizeOfficeLists(html))).toEqual([{ UL: ["First"] }, { UL: ["Second"] }]);
  });

  it("leaves HTML from other sources alone", () => {
    const html = "<p><b>Bold</b></p><ul><li>Real list</li></ul>";
    expect(normalizeOfficeLists(html)).toBe(html);
  });
});

describe("toEditorHtml", () => {
  it("keeps editor HTML as it is", () => {
    const html = "<p><strong>Approved</strong></p><ul><li><p>tighten act two</p></li></ul>";
    expect(toEditorHtml(html)).toBe(html);
  });

  it("turns older plain text into one paragraph per line", () => {
    expect(toEditorHtml("Dear team,\nPlease revise.\n\nThanks")).toBe("<p>Dear team,</p><p>Please revise.</p><p></p><p>Thanks</p>");
  });

  it("escapes plain text that merely looks like markup", () => {
    expect(toEditorHtml('Budget < 5m & "final" <script>x</script>')).toBe(
      "<p>Budget &lt; 5m &amp; &quot;final&quot; &lt;script&gt;x&lt;/script&gt;</p>"
    );
  });

  it("treats empty values as empty", () => {
    expect(toEditorHtml("")).toBe("");
    expect(toEditorHtml(null)).toBe("");
  });
});
