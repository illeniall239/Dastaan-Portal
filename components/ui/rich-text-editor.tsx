"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, Undo2, Redo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toEditorHtml, normalizeOfficeLists } from "@/lib/rich-text";

// Only formatting; no links, code or raw HTML. Rendering through this schema also drops anything
// else that might be in a stored value, so saved text is always shown safely.
const extensions = (placeholder?: string) => [
  StarterKit.configure({ link: false, code: false, codeBlock: false, horizontalRule: false }),
  ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
];

const CONTENT_CLASSES =
  "text-sm text-gray-700 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 " +
  "[&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold " +
  "[&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-gray-500 " +
  "[&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:text-gray-400 " +
  "[&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:pointer-events-none";

function ToolbarButton({ onClick, active, disabled, label, children }: {
  onClick: () => void; active?: boolean; disabled?: boolean; label: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "h-8 w-8 inline-flex items-center justify-center rounded text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-transparent",
        active && "bg-gray-200 text-gray-900"
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const c = () => editor.chain().focus();
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-gray-50 px-1.5 py-1">
      <ToolbarButton label="Bold (Ctrl+B)" active={editor.isActive("bold")} onClick={() => c().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Italic (Ctrl+I)" active={editor.isActive("italic")} onClick={() => c().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Underline (Ctrl+U)" active={editor.isActive("underline")} onClick={() => c().toggleUnderline().run()}><Underline className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Strikethrough" active={editor.isActive("strike")} onClick={() => c().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolbarButton>
      <span className="mx-1 h-5 w-px bg-gray-300" />
      <ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => c().toggleBulletList().run()}><List className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => c().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolbarButton>
      <span className="mx-1 h-5 w-px bg-gray-300" />
      <ToolbarButton label="Undo (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => c().undo().run()}><Undo2 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Redo (Ctrl+Y)" disabled={!editor.can().redo()} onClick={() => c().redo().run()}><Redo2 className="h-4 w-4" /></ToolbarButton>
    </div>
  );
}

interface RichTextEditorProps {
  value: string;
  /** Called with HTML, or "" when the box is empty */
  onChange: (html: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
}

/** A text box with Bold / Italic / Underline / Strikethrough / bullet and numbered lists */
export function RichTextEditor({ value, onChange, placeholder, id, disabled }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: extensions(placeholder),
    content: toEditorHtml(value),
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: { ...(id ? { id } : {}), class: "min-h-[110px] px-3 py-2 outline-none" },
      // Desktop Outlook / Word bullets and numbering paste as real lists
      transformPastedHTML: normalizeOfficeLists,
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  // Follow outside changes (a restored draft, a loaded evaluation) without fighting the typing
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (value !== current && toEditorHtml(value) !== current) editor.commands.setContent(toEditorHtml(value), { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);

  return (
    <div className={cn("rounded-md border border-input bg-white focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1", disabled && "opacity-60")}>
      {editor && !disabled && <Toolbar editor={editor} />}
      <EditorContent editor={editor} className={CONTENT_CLASSES} />
    </div>
  );
}

/** Shows saved rich text (or older plain text) read-only, with its formatting */
export function RichTextView({ value, className }: { value: string; className?: string }) {
  const editor = useEditor({
    extensions: extensions(),
    content: toEditorHtml(value),
    editable: false,
    immediatelyRender: false,
  }, [value]);
  return <EditorContent editor={editor} className={cn(CONTENT_CLASSES, className)} />;
}
