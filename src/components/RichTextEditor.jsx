import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  List,
  ListOrdered,
  Link2,
  RemoveFormatting,
} from "lucide-react";
import { useLang } from "../context/LanguageContext";

/* ----------------------------------------------------------------------------
   RichTextEditor — a dependency-free contentEditable editor.

   A small "Midnight-Tachometer" toolbar (Bold / Italic / Underline / H2 /
   bullet list / numbered list / link / clear-format) drives document.execCommand
   on the editable surface. onChange(html) fires on every input. The editor's
   innerHTML is hydrated from `value` on mount and whenever `value` changes while
   the field is NOT focused (so typing is never clobbered by a parent re-render).

   dir-aware (RTL/LTR) via the `dir` prop (falls back to the active language).
   focus-visible, reduced-motion safe. Used by AdminSettings for policy pages.

   Props:
     value       — current HTML string.
     onChange    — (html) => void, called on input.
     dir         — "rtl" | "ltr"; defaults to the active language direction.
     ariaLabel   — accessible label for the editing region.
     placeholder — shown (via CSS) when the editor is empty.

   NOTE: document.execCommand is deprecated but remains universally supported and
   is the pragmatic, dependency-free choice for a lightweight CMS editor.
---------------------------------------------------------------------------- */

const STRINGS = {
  en: {
    bold: "Bold",
    italic: "Italic",
    underline: "Underline",
    heading: "Heading",
    bullet: "Bulleted list",
    numbered: "Numbered list",
    link: "Insert link",
    clear: "Clear formatting",
    linkPrompt: "Enter URL",
    editor: "Rich text editor",
    placeholder: "Write content…",
  },
  ar: {
    bold: "غامق",
    italic: "مائل",
    underline: "تسطير",
    heading: "عنوان",
    bullet: "قائمة نقطية",
    numbered: "قائمة مرقمة",
    link: "إدراج رابط",
    clear: "مسح التنسيق",
    linkPrompt: "أدخل الرابط",
    editor: "محرر النص المنسق",
    placeholder: "اكتب المحتوى…",
  },
};

function exec(command, arg) {
  try {
    document.execCommand(command, false, arg);
  } catch {
    /* ignore unsupported command */
  }
}

export default function RichTextEditor({
  value = "",
  onChange,
  dir,
  ariaLabel,
  placeholder,
}) {
  const { lang, dir: langDir } = useLang();
  const tx = STRINGS[lang] || STRINGS.en;
  const resolvedDir = dir || langDir || "ltr";

  const editorRef = useRef(null);
  const focusedRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(!value);

  // Hydrate innerHTML from `value` on mount and when `value` changes while the
  // editor is not focused — avoids cursor jumps / clobbering active typing.
  useEffect(() => {
    const el = editorRef.current;
    if (!el || focusedRef.current) return;
    if (el.innerHTML !== (value || "")) {
      el.innerHTML = value || "";
    }
    setIsEmpty(!el.textContent.trim());
  }, [value]);

  const emit = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    setIsEmpty(!el.textContent.trim());
    onChange?.(el.innerHTML);
  }, [onChange]);

  const run = useCallback(
    (command, arg) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      exec(command, arg);
      emit();
    },
    [emit]
  );

  const onHeading = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    // Toggle: if already inside an H2, drop back to a paragraph.
    const block = document.queryCommandValue
      ? document.queryCommandValue("formatBlock")
      : "";
    exec("formatBlock", /h2/i.test(block) ? "P" : "H2");
    emit();
  }, [emit]);

  const onLink = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    // eslint-disable-next-line no-alert
    const url = window.prompt(tx.linkPrompt, "https://");
    if (url) exec("createLink", url);
    emit();
  }, [emit, tx.linkPrompt]);

  const toolbar = [
    { key: "bold", icon: Bold, label: tx.bold, onClick: () => run("bold") },
    {
      key: "italic",
      icon: Italic,
      label: tx.italic,
      onClick: () => run("italic"),
    },
    {
      key: "underline",
      icon: Underline,
      label: tx.underline,
      onClick: () => run("underline"),
    },
    { key: "h2", icon: Heading2, label: tx.heading, onClick: onHeading },
    {
      key: "ul",
      icon: List,
      label: tx.bullet,
      onClick: () => run("insertUnorderedList"),
    },
    {
      key: "ol",
      icon: ListOrdered,
      label: tx.numbered,
      onClick: () => run("insertOrderedList"),
    },
    { key: "link", icon: Link2, label: tx.link, onClick: onLink },
    {
      key: "clear",
      icon: RemoveFormatting,
      label: tx.clear,
      onClick: () => run("removeFormat"),
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-surfaceElevated px-2 py-1.5">
        {toolbar.map(({ key, icon: Icon, label, onClick }) => (
          <button
            key={key}
            type="button"
            // onMouseDown + preventDefault keeps the editor selection intact.
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            aria-label={label}
            title={label}
            className="grid h-8 w-8 place-items-center rounded-md text-textSecondary transition-colors hover:bg-surface hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        ))}
      </div>

      {/* Editable surface */}
      <div className="relative">
        {isEmpty && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 px-3.5 py-3 text-base text-textMuted md:text-sm"
            aria-hidden="true"
          >
            {placeholder || tx.placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel || tx.editor}
          contentEditable
          suppressContentEditableWarning
          dir={resolvedDir}
          onInput={emit}
          onFocus={() => {
            focusedRef.current = true;
          }}
          onBlur={() => {
            focusedRef.current = false;
            emit();
          }}
          className="prose-reset min-h-[9rem] w-full px-3.5 py-3 text-base leading-relaxed text-textPrimary outline-none focus-visible:outline-none md:text-sm [&_a]:text-primary [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:ps-6 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:ps-6"
        />
      </div>
    </div>
  );
}
