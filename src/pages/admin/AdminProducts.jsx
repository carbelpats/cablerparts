// -----------------------------------------------------------------------------
// AL-MEYAR — AdminProducts (role-protected catalog CRUD)
//
// A grid of useProducts().products with Add / Edit / Delete. The editor is a
// modal form covering: title (name + nameAr), brand, price (priceUSD) +
// compareAtUSD, description (descriptionEn/Ar), category (CATEGORY_LABELS keys),
// compatibility / fitment (multi-select of CARS makes via getMakes()), stock,
// image URL (optional) + icon (PART_ICONS keys) + accent, badges.
//
// Mutations call useProducts() create/update/delete (optimistic in the context);
// success/error are surfaced via an inline toast. Delete is confirm-gated.
// Required fields are validated with aria-invalid / role=alert messaging.
//
// Bilingual: own local STRINGS={en,ar} via useLang().lang. RTL via logical
// utilities; prices kept dir="ltr" mono tabular-nums. a11y dialog semantics.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  AlertTriangle,
  CheckCircle2,
  Package,
  Tag,
  Image as ImageIcon,
  Link2,
  Upload,
} from "lucide-react";
import { useProducts } from "../../context/ProductsContext";
import { useLang } from "../../context/LanguageContext";
import { useGeo } from "../../context/GeoContext";
import { CATEGORY_LABELS } from "../../lib/i18n";
import { getMakes } from "../../lib/data";
import { PART_ICONS, PartIcon, ACCENT_GRADIENT } from "../../lib/partIcons";
import { uploadImage } from "../../services/storageService";

const STRINGS = {
  en: {
    title: "Products",
    subtitle: "Create, edit and remove catalog parts.",
    add: "Add product",
    search: "Search products",
    searchPlaceholder: "Search by name, brand or id…",
    empty: "No products yet",
    emptyDesc: "Add your first part to populate the catalog.",
    noResults: "No products match your search.",
    edit: "Edit",
    delete: "Delete",
    stock: "Stock",
    inStock: (n) => `${n} in stock`,
    outOfStock: "Out of stock",
    // editor
    newProduct: "New product",
    editProduct: "Edit product",
    nameEn: "Title (English)",
    nameAr: "Title (Arabic)",
    brand: "Brand",
    category: "Category",
    priceUSD: "Price (USD)",
    weightKg: "Weight (kg)",
    compareAtUSD: "Compare-at price (USD)",
    descriptionEn: "Description (English)",
    descriptionAr: "Description (Arabic)",
    fitment: "Compatibility (makes)",
    fitmentHint: "Select every make this part fits.",
    stockField: "Stock",
    imageUrl: "Image URL (optional)",
    imageHint: "Paste an image URL or upload a file. Leave blank to use the part icon.",
    upload: "Upload",
    uploading: "Uploading…",
    clearImage: "Clear",
    preview: "Preview",
    noImage: "No image",
    notAnImage: "Please choose an image file.",
    fileTooLarge: "Image is too large (max 2 MB).",
    icon: "Icon",
    accent: "Accent",
    badges: "Badges",
    badgesHint: "Comma-separated, e.g. OEM-Grade, 2-Yr Warranty",
    optional: "optional",
    save: "Save product",
    saving: "Saving…",
    cancel: "Cancel",
    // validation
    required: "This field is required.",
    invalidNumber: "Enter a valid number.",
    fixErrors: "Please fix the highlighted fields.",
    // toasts
    created: "Product created.",
    updated: "Product updated.",
    deleted: "Product deleted.",
    errorGeneric: "Something went wrong. Please try again.",
    // delete confirm
    confirmTitle: "Delete this product?",
    confirmBody: (name) => `“${name}” will be removed from the catalog. This can't be undone.`,
    confirmDelete: "Delete product",
    accentPrimary: "Primary",
    accentAccent: "Teal",
    accentSuccess: "Green",
  },
  ar: {
    title: "المنتجات",
    subtitle: "أنشئ القطع وعدّلها واحذفها من الكتالوج.",
    add: "إضافة منتج",
    search: "بحث في المنتجات",
    searchPlaceholder: "ابحث بالاسم أو العلامة أو المعرّف…",
    empty: "لا توجد منتجات بعد",
    emptyDesc: "أضف أول قطعة لملء الكتالوج.",
    noResults: "لا توجد منتجات تطابق بحثك.",
    edit: "تعديل",
    delete: "حذف",
    stock: "المخزون",
    inStock: (n) => `${n} في المخزون`,
    outOfStock: "غير متوفر",
    // editor
    newProduct: "منتج جديد",
    editProduct: "تعديل المنتج",
    nameEn: "العنوان (إنجليزي)",
    nameAr: "العنوان (عربي)",
    brand: "العلامة التجارية",
    category: "الفئة",
    priceUSD: "السعر (دولار)",
    weightKg: "الوزن (كجم)",
    compareAtUSD: "السعر قبل الخصم (دولار)",
    descriptionEn: "الوصف (إنجليزي)",
    descriptionAr: "الوصف (عربي)",
    fitment: "التوافق (الماركات)",
    fitmentHint: "اختر كل ماركة تناسبها هذه القطعة.",
    stockField: "المخزون",
    imageUrl: "رابط الصورة (اختياري)",
    imageHint: "ألصق رابط صورة أو ارفع ملفاً. اتركه فارغاً لاستخدام أيقونة القطعة.",
    upload: "رفع",
    uploading: "جارٍ الرفع…",
    clearImage: "مسح",
    preview: "معاينة",
    noImage: "لا صورة",
    notAnImage: "يرجى اختيار ملف صورة.",
    fileTooLarge: "الصورة كبيرة جداً (الحد الأقصى 2 ميغابايت).",
    icon: "الأيقونة",
    accent: "اللون المميّز",
    badges: "الشارات",
    badgesHint: "مفصولة بفواصل، مثل: OEM-Grade، 2-Yr Warranty",
    optional: "اختياري",
    save: "حفظ المنتج",
    saving: "جارٍ الحفظ…",
    cancel: "إلغاء",
    // validation
    required: "هذا الحقل مطلوب.",
    invalidNumber: "أدخل رقماً صحيحاً.",
    fixErrors: "يرجى تصحيح الحقول المظلّلة.",
    // toasts
    created: "تم إنشاء المنتج.",
    updated: "تم تحديث المنتج.",
    deleted: "تم حذف المنتج.",
    errorGeneric: "حدث خطأ ما. حاول مرة أخرى.",
    // delete confirm
    confirmTitle: "حذف هذا المنتج؟",
    confirmBody: (name) => `سيُزال «${name}» من الكتالوج. لا يمكن التراجع عن ذلك.`,
    confirmDelete: "حذف المنتج",
    accentPrimary: "برتقالي",
    accentAccent: "تركوازي",
    accentSuccess: "أخضر",
  },
};

const ACCENTS = ["primary", "accent", "success"];
const ICON_KEYS = Object.keys(PART_ICONS);
// canonical categories (exclude the "All" sentinel)
const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS).filter((k) => k !== "All");
const MAKES = getMakes();

function emptyForm() {
  return {
    name: "",
    nameAr: "",
    brand: "",
    category: CATEGORY_KEYS[0] || "",
    priceUSD: "",
    compareAtUSD: "",
    weightKg: "",
    descriptionEn: "",
    descriptionAr: "",
    fitment: [],
    stock: "",
    image: "",
    icon: ICON_KEYS[0] || "brake",
    accent: "primary",
    badges: "",
  };
}

function productToForm(p) {
  return {
    name: p.name ?? "",
    nameAr: p.nameAr ?? "",
    brand: p.brand ?? "",
    category: p.category ?? CATEGORY_KEYS[0] ?? "",
    priceUSD:
      p.priceUSD === null || p.priceUSD === undefined
        ? ""
        : String(p.priceUSD),
    compareAtUSD:
      p.compareAtUSD === null || p.compareAtUSD === undefined
        ? ""
        : String(p.compareAtUSD),
    descriptionEn: p.descriptionEn ?? "",
    descriptionAr: p.descriptionAr ?? "",
    fitment: Array.isArray(p.fitment) ? [...p.fitment] : [],
    stock: p.stock === null || p.stock === undefined ? "" : String(p.stock),
    weightKg:
      p.weightKg === null || p.weightKg === undefined ? "" : String(p.weightKg),
    image: p.image ?? "",
    icon: p.icon ?? ICON_KEYS[0] ?? "brake",
    accent: p.accent ?? "primary",
    badges: Array.isArray(p.badges) ? p.badges.join(", ") : "",
  };
}

// -------------------------------------------------------------------- toast ---
function Toast({ tone, message, onClose }) {
  useEffect(() => {
    if (!message) return undefined;
    const id = setTimeout(onClose, 3200);
    return () => clearTimeout(id);
  }, [message, onClose]);

  if (!message) return null;
  const ok = tone === "success";
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 end-5 z-[60] flex max-w-sm items-center gap-2.5 rounded-xl border border-border bg-surfaceElevated px-4 py-3 shadow-elevated"
    >
      {ok ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
      ) : (
        <AlertTriangle className="h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
      )}
      <span className="text-sm font-medium text-textPrimary">{message}</span>
    </div>
  );
}

// ----------------------------------------------------------- product card -----
function ProductCard({ product, onEdit, onDelete }) {
  const { lang } = useLang();
  const { format } = useGeo();
  const t = STRINGS[lang] || STRINGS.en;
  const name = lang === "ar" && product.nameAr ? product.nameAr : product.name;
  const stock = Number(product.stock) || 0;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-primary/40">
      <div className="flex items-start gap-3">
        <span
          className={[
            "grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br ring-1 ring-border",
            ACCENT_GRADIENT[product.accent] || ACCENT_GRADIENT.primary,
          ].join(" ")}
          aria-hidden="true"
        >
          {product.image ? (
            <img
              src={product.image}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <PartIcon icon={product.icon} className="h-8 w-8" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold text-textPrimary text-start">
            {name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-textSecondary text-start">
            {product.brand}
          </p>
          <p
            dir="ltr"
            className="mt-0.5 truncate font-mono text-[11px] text-textMuted text-start"
          >
            {product.id}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-surfaceElevated px-2.5 py-0.5 text-[11px] font-medium text-textSecondary ring-1 ring-border">
          <Tag className="h-3 w-3" aria-hidden="true" />
          {(CATEGORY_LABELS[product.category] || {})[lang] || product.category}
        </span>
        <span className="font-semibold text-textPrimary">
          <span dir="ltr" className="tabular-nums">
            {format(product.priceUSD || 0)}
          </span>
        </span>
      </div>

      <div className="mt-2">
        <span
          className={[
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            stock > 0
              ? "bg-success/15 text-success"
              : "bg-danger/15 text-danger",
          ].join(" ")}
        >
          {stock > 0 ? t.inStock(stock) : t.outOfStock}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => onEdit(product)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-textSecondary transition-colors hover:border-primary/40 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          {t.edit}
        </button>
        <button
          type="button"
          onClick={() => onDelete(product)}
          aria-label={`${t.delete} ${name}`}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-textSecondary transition-colors hover:border-danger/50 hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------- field primitives ----
function Field({ label, hint, error, htmlFor, optional, children }) {
  const { lang } = useLang();
  const t = STRINGS[lang] || STRINGS.en;
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1 flex items-center gap-1.5 text-sm font-medium text-textPrimary text-start"
      >
        <span>{label}</span>
        {optional && (
          <span className="text-[11px] font-normal text-textMuted">
            ({t.optional})
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-[11px] text-textMuted text-start">{hint}</p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-1 flex items-center gap-1 text-[11px] font-medium text-danger text-start"
        >
          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

const inputBase =
  "w-full rounded-lg border bg-surface px-3 py-2 text-base md:text-sm text-textPrimary placeholder:text-textMuted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60";

function inputCls(invalid) {
  return [
    inputBase,
    invalid ? "border-danger focus-visible:ring-danger/40" : "border-border",
  ].join(" ");
}

// Map storageService error codes -> localized messages (falls back to generic).
function uploadErrorMessage(code, t) {
  if (code === "not_an_image") return t.notAnImage;
  if (code === "file_too_large") return t.fileTooLarge;
  return t.errorGeneric;
}

// ----------------------------------------------------------- image field ------
// Product image: paste a URL OR upload a file (-> Supabase "media" bucket public
// URL when configured, else a base64 data URL) + live preview + clear.
// Calls onChange(stringOrEmpty); empty string means "use the part icon".
function ProductImageField({ value, onChange, idBase, lang }) {
  const t = STRINGS[lang] || STRINGS.en;
  const fileRef = useRef(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    setError("");
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadImage(file, { folder: "products" });
      if (res.ok) {
        onChange(res.url);
      } else {
        setError(uploadErrorMessage(res.error, t));
      }
    } catch {
      setError(t.errorGeneric);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const urlId = `${idBase}-url`;

  return (
    <div className="flex flex-wrap items-start gap-3">
      {/* preview chip */}
      <span
        className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surfaceElevated"
        aria-label={value ? t.preview : undefined}
        aria-hidden={value ? undefined : "true"}
      >
        {value ? (
          <img
            src={value}
            alt={t.preview}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex flex-col items-center gap-1 text-textMuted">
            <ImageIcon className="h-5 w-5" aria-hidden="true" />
            <span className="text-[10px]">{t.noImage}</span>
          </span>
        )}
      </span>

      {/* controls */}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="relative">
          <Link2
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted"
            aria-hidden="true"
          />
          <input
            id={urlId}
            type="url"
            dir="ltr"
            inputMode="url"
            placeholder="https://…"
            value={value && !value.startsWith("data:") ? value : ""}
            onChange={(e) => {
              setError("");
              onChange(e.target.value.trim());
            }}
            aria-label={t.imageUrl}
            className={`${inputCls(false)} ps-9`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-textSecondary transition-colors hover:border-primary/40 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            {uploading ? t.uploading : t.upload}
          </button>
          {value && !uploading && (
            <button
              type="button"
              onClick={() => {
                setError("");
                onChange("");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-textSecondary transition-colors hover:border-danger/50 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              {t.clearImage}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>
        {error && (
          <p
            role="alert"
            className="flex items-center gap-1 text-[11px] font-medium text-danger text-start"
          >
            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------------- editor -------
function ProductEditor({ initial, onClose, onSubmit }) {
  const { lang } = useLang();
  const t = STRINGS[lang] || STRINGS.en;
  const isEdit = Boolean(initial);

  const [form, setForm] = useState(() =>
    initial ? productToForm(initial) : emptyForm()
  );
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const dialogRef = useRef(null);
  const firstFieldRef = useRef(null);

  // focus first field + Escape to close + body scroll lock
  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const set = (key) => (e) => {
    const val = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const toggleFitment = (make) => {
    setForm((f) => {
      const has = f.fitment.includes(make);
      return {
        ...f,
        fitment: has
          ? f.fitment.filter((m) => m !== make)
          : [...f.fitment, make],
      };
    });
  };

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = t.required;
    if (!form.nameAr.trim()) next.nameAr = t.required;
    if (!form.brand.trim()) next.brand = t.required;
    if (!form.category) next.category = t.required;

    if (form.priceUSD === "" || form.priceUSD === null) {
      next.priceUSD = t.required;
    } else if (Number.isNaN(Number(form.priceUSD)) || Number(form.priceUSD) < 0) {
      next.priceUSD = t.invalidNumber;
    }

    if (form.compareAtUSD !== "" && form.compareAtUSD !== null) {
      if (
        Number.isNaN(Number(form.compareAtUSD)) ||
        Number(form.compareAtUSD) < 0
      ) {
        next.compareAtUSD = t.invalidNumber;
      }
    }

    if (form.stock === "" || form.stock === null) {
      next.stock = t.required;
    } else if (Number.isNaN(Number(form.stock)) || Number(form.stock) < 0) {
      next.stock = t.invalidNumber;
    }

    return next;
  }

  function buildPayload() {
    const badges = form.badges
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);
    return {
      name: form.name.trim(),
      nameAr: form.nameAr.trim(),
      brand: form.brand.trim(),
      category: form.category,
      priceUSD: Number(form.priceUSD),
      compareAtUSD:
        form.compareAtUSD === "" ? null : Number(form.compareAtUSD),
      descriptionEn: form.descriptionEn.trim(),
      descriptionAr: form.descriptionAr.trim(),
      fitment: form.fitment,
      stock: Number(form.stock),
      weightKg: form.weightKg === "" ? null : Number(form.weightKg),
      image: form.image.trim(),
      icon: form.icon,
      accent: form.accent,
      badges,
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    const next = validate();
    if (Object.keys(next).length) {
      setErrors(next);
      setFormError(t.fixErrors);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(buildPayload(), isEdit);
      // parent closes the editor + toasts on success
    } catch {
      setFormError(t.errorGeneric);
      setSubmitting(false);
    }
  }

  const titleId = "admin-product-editor-title";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-border bg-surfaceElevated shadow-elevated sm:rounded-2xl"
      >
        {/* header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2
            id={titleId}
            className="flex items-center gap-2 font-display text-lg font-bold text-textPrimary text-start"
          >
            <Package className="h-5 w-5 text-primary" aria-hidden="true" />
            {isEdit ? t.editProduct : t.newProduct}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.cancel}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-textSecondary transition-colors hover:border-primary/40 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* body */}
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2">
            {/* Title EN */}
            <Field
              label={t.nameEn}
              htmlFor="pf-name"
              error={errors.name}
            >
              <input
                id="pf-name"
                ref={firstFieldRef}
                type="text"
                dir="ltr"
                value={form.name}
                onChange={set("name")}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "pf-name-err" : undefined}
                className={inputCls(errors.name)}
              />
            </Field>

            {/* Title AR */}
            <Field label={t.nameAr} htmlFor="pf-nameAr" error={errors.nameAr}>
              <input
                id="pf-nameAr"
                type="text"
                dir="rtl"
                value={form.nameAr}
                onChange={set("nameAr")}
                aria-invalid={Boolean(errors.nameAr)}
                className={inputCls(errors.nameAr)}
              />
            </Field>

            {/* Brand */}
            <Field label={t.brand} htmlFor="pf-brand" error={errors.brand}>
              <input
                id="pf-brand"
                type="text"
                value={form.brand}
                onChange={set("brand")}
                aria-invalid={Boolean(errors.brand)}
                className={inputCls(errors.brand)}
              />
            </Field>

            {/* Category */}
            <Field label={t.category} htmlFor="pf-category" error={errors.category}>
              <select
                id="pf-category"
                value={form.category}
                onChange={set("category")}
                aria-invalid={Boolean(errors.category)}
                className={inputCls(errors.category)}
              >
                {CATEGORY_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {(CATEGORY_LABELS[key] || {})[lang] || key}
                  </option>
                ))}
              </select>
            </Field>

            {/* Price */}
            <Field label={t.priceUSD} htmlFor="pf-price" error={errors.priceUSD}>
              <input
                id="pf-price"
                type="number"
                min="0"
                step="0.01"
                dir="ltr"
                inputMode="decimal"
                value={form.priceUSD}
                onChange={set("priceUSD")}
                aria-invalid={Boolean(errors.priceUSD)}
                className={`${inputCls(errors.priceUSD)} font-mono tabular-nums`}
              />
            </Field>

            {/* Compare-at */}
            <Field
              label={t.compareAtUSD}
              htmlFor="pf-compare"
              error={errors.compareAtUSD}
              optional
            >
              <input
                id="pf-compare"
                type="number"
                min="0"
                step="0.01"
                dir="ltr"
                inputMode="decimal"
                value={form.compareAtUSD}
                onChange={set("compareAtUSD")}
                aria-invalid={Boolean(errors.compareAtUSD)}
                className={`${inputCls(errors.compareAtUSD)} font-mono tabular-nums`}
              />
            </Field>

            {/* Stock */}
            <Field label={t.stockField} htmlFor="pf-stock" error={errors.stock}>
              <input
                id="pf-stock"
                type="number"
                min="0"
                step="1"
                dir="ltr"
                inputMode="numeric"
                value={form.stock}
                onChange={set("stock")}
                aria-invalid={Boolean(errors.stock)}
                className={`${inputCls(errors.stock)} font-mono tabular-nums`}
              />
            </Field>

            {/* Weight — drives the SMSA (by-weight) shipping fee at checkout */}
            <Field label={t.weightKg} htmlFor="pf-weight" optional>
              <input
                id="pf-weight"
                type="number"
                min="0"
                step="0.1"
                dir="ltr"
                inputMode="decimal"
                value={form.weightKg}
                onChange={set("weightKg")}
                className={`${inputCls(undefined)} font-mono tabular-nums`}
              />
            </Field>

            {/* Image (URL or upload) */}
            <div className="sm:col-span-2">
              <Field
                label={t.imageUrl}
                hint={t.imageHint}
                optional
              >
                <ProductImageField
                  value={form.image}
                  onChange={set("image")}
                  idBase="pf-image"
                  lang={lang}
                />
              </Field>
            </div>

            {/* Description EN */}
            <div className="sm:col-span-2">
              <Field label={t.descriptionEn} htmlFor="pf-descEn">
                <textarea
                  id="pf-descEn"
                  rows={3}
                  dir="ltr"
                  value={form.descriptionEn}
                  onChange={set("descriptionEn")}
                  className={`${inputCls(false)} resize-y`}
                />
              </Field>
            </div>

            {/* Description AR */}
            <div className="sm:col-span-2">
              <Field label={t.descriptionAr} htmlFor="pf-descAr">
                <textarea
                  id="pf-descAr"
                  rows={3}
                  dir="rtl"
                  value={form.descriptionAr}
                  onChange={set("descriptionAr")}
                  className={`${inputCls(false)} resize-y`}
                />
              </Field>
            </div>

            {/* Fitment (multi-select makes) */}
            <div className="sm:col-span-2">
              <Field label={t.fitment} hint={t.fitmentHint}>
                <div
                  role="group"
                  aria-label={t.fitment}
                  className="flex flex-wrap gap-2"
                >
                  {MAKES.map((make) => {
                    const active = form.fitment.includes(make);
                    return (
                      <button
                        key={make}
                        type="button"
                        onClick={() => toggleFitment(make)}
                        aria-pressed={active}
                        className={[
                          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                          active
                            ? "bg-primary/15 text-primary ring-1 ring-primary/40"
                            : "bg-surface text-textSecondary ring-1 ring-border hover:text-textPrimary",
                        ].join(" ")}
                      >
                        {make}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>

            {/* Icon */}
            <div className="sm:col-span-2">
              <Field label={t.icon}>
                <div
                  role="radiogroup"
                  aria-label={t.icon}
                  className="flex flex-wrap gap-2"
                >
                  {ICON_KEYS.map((key) => {
                    const active = form.icon === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={key}
                        onClick={() => set("icon")(key)}
                        className={[
                          "grid h-11 w-11 place-items-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                          active
                            ? "bg-primary/15 text-primary ring-2 ring-primary/50"
                            : "bg-surface text-textSecondary ring-1 ring-border hover:text-textPrimary",
                        ].join(" ")}
                      >
                        <PartIcon icon={key} className="h-6 w-6" />
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>

            {/* Accent */}
            <Field label={t.accent}>
              <div role="radiogroup" aria-label={t.accent} className="flex gap-2">
                {ACCENTS.map((a) => {
                  const active = form.accent === a;
                  const label =
                    a === "primary"
                      ? t.accentPrimary
                      : a === "accent"
                      ? t.accentAccent
                      : t.accentSuccess;
                  return (
                    <button
                      key={a}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => set("accent")(a)}
                      className={[
                        "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                        active
                          ? "ring-2 ring-primary/50"
                          : "ring-1 ring-border hover:ring-primary/40",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "h-3.5 w-3.5 rounded-full",
                          a === "primary"
                            ? "bg-primary"
                            : a === "accent"
                            ? "bg-accent"
                            : "bg-success",
                        ].join(" ")}
                        aria-hidden="true"
                      />
                      {label}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Badges */}
            <Field label={t.badges} htmlFor="pf-badges" hint={t.badgesHint} optional>
              <input
                id="pf-badges"
                type="text"
                value={form.badges}
                onChange={set("badges")}
                className={inputCls(false)}
              />
            </Field>
          </div>

          {/* footer */}
          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
            {formError ? (
              <p
                role="alert"
                className="flex items-center gap-1.5 text-sm font-medium text-danger text-start"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {formError}
              </p>
            ) : (
              <span />
            )}
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-textSecondary transition-colors hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? t.saving : t.save}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// --------------------------------------------------- delete confirm dialog ----
function ConfirmDelete({ product, onCancel, onConfirm }) {
  const { lang } = useLang();
  const t = STRINGS[lang] || STRINGS.en;
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const name = lang === "ar" && product.nameAr ? product.nameAr : product.name;

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } catch {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-bg/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-del-title"
        aria-describedby="confirm-del-body"
        className="w-full max-w-md rounded-2xl border border-border bg-surfaceElevated p-6 shadow-elevated"
      >
        <div className="flex items-start gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-danger/15 text-danger"
            aria-hidden="true"
          >
            <AlertTriangle className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2
              id="confirm-del-title"
              className="font-display text-lg font-bold text-textPrimary text-start"
            >
              {t.confirmTitle}
            </h2>
            <p
              id="confirm-del-body"
              className="mt-1 text-sm text-textSecondary text-start"
            >
              {t.confirmBody(name)}
            </p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-textSecondary transition-colors hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="rounded-lg bg-danger px-5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex items-center gap-1.5">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t.confirmDelete}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ page -------
export default function AdminProducts() {
  const { products, loading, createProduct, updateProduct, deleteProduct } =
    useProducts();
  const { lang } = useLang();
  const t = STRINGS[lang] || STRINGS.en;

  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null); // product | null (null = create)
  const [deleting, setDeleting] = useState(null); // product to confirm-delete
  const [toast, setToast] = useState({ tone: "success", message: "" });

  const showToast = (tone, message) => setToast({ tone, message });
  const closeToast = () => setToast((tp) => ({ ...tp, message: "" }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.nameAr, p.brand, p.id, p.category]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [products, query]);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (product) => {
    setEditing(product);
    setEditorOpen(true);
  };
  const closeEditor = () => {
    setEditorOpen(false);
    setEditing(null);
  };

  async function handleSubmit(payload, isEdit) {
    if (isEdit && editing) {
      await updateProduct(editing.id, payload);
      closeEditor();
      showToast("success", t.updated);
    } else {
      await createProduct(payload);
      closeEditor();
      showToast("success", t.created);
    }
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    try {
      await deleteProduct(deleting.id);
      setDeleting(null);
      showToast("success", t.deleted);
    } catch (err) {
      setDeleting(null);
      showToast("error", t.errorGeneric);
      throw err;
    }
  }

  return (
    <section>
      {/* header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-textPrimary text-start">
            {t.title}
          </h1>
          <p className="mt-1 text-sm text-textSecondary text-start">
            {t.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t.add}
        </button>
      </div>

      {/* search */}
      <div className="relative mb-5">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t.search}
          placeholder={t.searchPlaceholder}
          className="w-full rounded-xl border border-border bg-surface ps-9 pe-3 py-2.5 text-base md:text-sm text-textPrimary placeholder:text-textMuted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        />
      </div>

      {/* list */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl border border-border bg-surface"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center shadow-sm">
          <span
            className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-surfaceElevated text-textMuted ring-1 ring-border"
            aria-hidden="true"
          >
            <Package className="h-6 w-6" />
          </span>
          <h2 className="font-display text-lg font-bold text-textPrimary">
            {t.empty}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-textSecondary">
            {t.emptyDesc}
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t.add}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-textSecondary shadow-sm">
          {t.noResults}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      {editorOpen && (
        <ProductEditor
          initial={editing}
          onClose={closeEditor}
          onSubmit={handleSubmit}
        />
      )}

      {deleting && (
        <ConfirmDelete
          product={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      <Toast tone={toast.tone} message={toast.message} onClose={closeToast} />
    </section>
  );
}
