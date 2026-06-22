// -----------------------------------------------------------------------------
// AL-MEYAR — AdminSettings (role-protected site CMS)
//
// A polished, bilingual, RTL-aware admin page (Midnight-Tachometer) that edits
// the site Settings exposed by useSettings(). Sections:
//
//   • CONTACT     — phone, email, address (en+ar), support hours (en+ar)
//   • BRAND/HERO  — logo (URL OR file upload -> base64) with live preview, a
//                   "use logo in hero" toggle, and tagline (en+ar)
//   • TEXT BLOCKS — footer tagline (en+ar) and promo (en+ar) textareas
//   • PAYMENTS    — editable provider list: name + logo (URL or file) in a
//                   consistent aspect-ratio chip; clear logo -> null (the
//                   storefront then renders its inline-SVG fallback)
//
// Save calls useSettings().updateSettings(form); Reset calls resetSettings().
// Optimistic feedback via useToast(). All inputs are text-base md:text-sm.
//
// Bilingual: own local STRINGS={en,ar} via useLang().lang. RTL through logical
// utilities (ps/pe, ms/me, start/end, text-start). a11y + focus-visible.
// Lives under /admin (AdminRoute); agent A2 adds the route + nav entry.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import {
  SlidersHorizontal,
  Phone,
  Image as ImageIcon,
  Type,
  CreditCard,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Link2,
  Upload,
  X,
  AlertTriangle,
  Share2,
  FileText,
} from "lucide-react";
import { useSettings } from "../../context/SettingsContext";
import { useLang } from "../../context/LanguageContext";
import { useToast } from "../../context/ToastContext";
import RichTextEditor from "../../components/RichTextEditor";
import { uploadImage } from "../../services/storageService";

const STRINGS = {
  en: {
    title: "Site settings",
    subtitle: "Edit storefront contact details, branding, copy and payments.",
    save: "Save changes",
    saving: "Saving…",
    reset: "Reset to defaults",
    resetting: "Resetting…",
    // sections
    contactTitle: "Contact",
    contactDesc: "Shown on the contact page and in the footer.",
    brandTitle: "Brand & hero",
    brandDesc: "Logo, hero placement and tagline.",
    textTitle: "Text blocks",
    textDesc: "Footer blurb and the promotional line.",
    paymentsTitle: "Payment providers",
    paymentsDesc:
      "Order and brand the payment row. Clear a logo to use the built-in badge.",
    socialTitle: "Social media",
    socialDesc:
      "Full profile URLs. Leave a field empty to hide that icon in the footer.",
    pagesTitle: "Policies & pages",
    pagesDesc:
      "Rich-text content for the info pages. Empty pages show a “coming soon” block.",
    // contact fields
    phone: "Phone",
    email: "Email",
    addressEn: "Address (English)",
    addressAr: "Address (Arabic)",
    hoursEn: "Support hours (English)",
    hoursAr: "Support hours (Arabic)",
    // brand fields
    logo: "Brand logo",
    logoHint: "Paste an image URL or upload a file (PNG/SVG/JPG).",
    useLogoInHero: "Use logo in hero",
    useLogoInHeroHint: "Show the logo in the hero instead of the brake-disc art.",
    taglineEn: "Tagline (English)",
    taglineAr: "Tagline (Arabic)",
    // text blocks
    footerEn: "Footer blurb (English)",
    footerAr: "Footer blurb (Arabic)",
    promoEn: "Promo line (English)",
    promoAr: "Promo line (Arabic)",
    // payments
    providerName: "Provider name",
    providerLogo: "Logo",
    addProvider: "Add provider",
    removeProvider: "Remove provider",
    noProviders: "No payment providers yet.",
    // social
    instagram: "Instagram",
    x: "X (Twitter)",
    youtube: "YouTube",
    tiktok: "TikTok",
    snapchat: "Snapchat",
    whatsapp: "WhatsApp",
    facebook: "Facebook",
    // pages
    pagePrivacy: "Privacy policy",
    pageTerms: "Terms & conditions",
    pageWarranty: "Warranty",
    pageShipping: "Shipping & returns",
    pageAbout: "About us",
    pageSupport: "Support",
    english: "English",
    arabic: "Arabic",
    // image field
    imageUrl: "Image URL",
    upload: "Upload",
    uploading: "Uploading…",
    clear: "Clear",
    preview: "Preview",
    noImage: "No image",
    fileTooLarge: "Image is too large (max 2 MB).",
    notAnImage: "Please choose an image file.",
    // toasts
    saved: "Settings saved.",
    wasReset: "Settings reset to defaults.",
    errorGeneric: "Something went wrong. Please try again.",
  },
  ar: {
    title: "إعدادات الموقع",
    subtitle: "عدّل بيانات التواصل والهوية والنصوص ووسائل الدفع للمتجر.",
    save: "حفظ التغييرات",
    saving: "جارٍ الحفظ…",
    reset: "استعادة الافتراضي",
    resetting: "جارٍ الاستعادة…",
    // sections
    contactTitle: "التواصل",
    contactDesc: "يظهر في صفحة التواصل وفي التذييل.",
    brandTitle: "الهوية والواجهة",
    brandDesc: "الشعار وموضعه في الواجهة والشعار النصي.",
    textTitle: "كتل النص",
    textDesc: "نبذة التذييل والسطر الترويجي.",
    paymentsTitle: "وسائل الدفع",
    paymentsDesc:
      "رتّب صف وسائل الدفع وخصّصه. امسح الشعار لاستخدام الشارة المدمجة.",
    socialTitle: "وسائل التواصل الاجتماعي",
    socialDesc:
      "روابط الحسابات الكاملة. اترك الحقل فارغاً لإخفاء أيقونته في التذييل.",
    pagesTitle: "السياسات والصفحات",
    pagesDesc:
      "محتوى نصّي منسّق لصفحات المعلومات. الصفحات الفارغة تعرض كتلة «قريباً».",
    // contact fields
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    addressEn: "العنوان (إنجليزي)",
    addressAr: "العنوان (عربي)",
    hoursEn: "ساعات الدعم (إنجليزي)",
    hoursAr: "ساعات الدعم (عربي)",
    // brand fields
    logo: "شعار العلامة",
    logoHint: "ألصق رابط صورة أو ارفع ملفاً (PNG/SVG/JPG).",
    useLogoInHero: "استخدم الشعار في الواجهة",
    useLogoInHeroHint: "أظهر الشعار في الواجهة بدلاً من رسمة قرص الفرامل.",
    taglineEn: "الشعار النصي (إنجليزي)",
    taglineAr: "الشعار النصي (عربي)",
    // text blocks
    footerEn: "نبذة التذييل (إنجليزي)",
    footerAr: "نبذة التذييل (عربي)",
    promoEn: "السطر الترويجي (إنجليزي)",
    promoAr: "السطر الترويجي (عربي)",
    // payments
    providerName: "اسم المزوّد",
    providerLogo: "الشعار",
    addProvider: "إضافة مزوّد",
    removeProvider: "إزالة المزوّد",
    noProviders: "لا توجد وسائل دفع بعد.",
    // social
    instagram: "إنستغرام",
    x: "إكس (تويتر)",
    youtube: "يوتيوب",
    tiktok: "تيك توك",
    snapchat: "سناب شات",
    whatsapp: "واتساب",
    facebook: "فيسبوك",
    // pages
    pagePrivacy: "سياسة الخصوصية",
    pageTerms: "الشروط والأحكام",
    pageWarranty: "الضمان",
    pageShipping: "الشحن والإرجاع",
    pageAbout: "من نحن",
    pageSupport: "الدعم",
    english: "الإنجليزية",
    arabic: "العربية",
    // image field
    imageUrl: "رابط الصورة",
    upload: "رفع",
    uploading: "جارٍ الرفع…",
    clear: "مسح",
    preview: "معاينة",
    noImage: "لا صورة",
    fileTooLarge: "الصورة كبيرة جداً (الحد الأقصى 2 ميغابايت).",
    notAnImage: "يرجى اختيار ملف صورة.",
    // toasts
    saved: "تم حفظ الإعدادات.",
    wasReset: "تمت استعادة الإعدادات الافتراضية.",
    errorGeneric: "حدث خطأ ما. حاول مرة أخرى.",
  },
};

// Social network keys (also the STRINGS keys for their labels) — controls the
// order of the inputs and which icons the footer can render.
const SOCIAL_KEYS = [
  "instagram",
  "x",
  "youtube",
  "tiktok",
  "snapchat",
  "whatsapp",
  "facebook",
];

// CMS page slugs (match settings.pages) -> their STRINGS label key.
const PAGE_KEYS = [
  "privacy",
  "terms",
  "warranty",
  "shipping",
  "about",
  "support",
];
const PAGE_LABELS = {
  privacy: "pagePrivacy",
  terms: "pageTerms",
  warranty: "pageWarranty",
  shipping: "pageShipping",
  about: "pageAbout",
  support: "pageSupport",
};

const inputBase =
  "w-full rounded-lg border bg-surface px-3 py-2 text-base md:text-sm text-textPrimary placeholder:text-textMuted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 border-border";

// ----------------------------------------------------------------- helpers ----
let _pidSeq = 0;
function newProviderId() {
  _pidSeq += 1;
  return `provider-${_pidSeq}-${_pidSeq * 7 + 3}`;
}

// Map storageService error codes -> localized messages (falls back to generic).
function uploadErrorMessage(code, t) {
  if (code === "not_an_image") return t.notAnImage;
  if (code === "file_too_large") return t.fileTooLarge;
  return t.errorGeneric;
}

// --------------------------------------------------------------- Field --------
function Field({ label, hint, htmlFor, children }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-sm font-medium text-textPrimary text-start"
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-textMuted text-start">{hint}</p>}
    </div>
  );
}

// ----------------------------------------------------------- Section card ----
function Section({ icon: Icon, title, desc, children }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-textPrimary text-start">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-textSecondary text-start">{desc}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

// ----------------------------------------------------------- ImageField -------
// Reusable: URL input + file upload (-> dataURL) + live preview in a fixed
// aspect-ratio box + clear (=> null). Calls onChange(stringOrNull).
function ImageField({
  label,
  hint,
  value,
  onChange,
  idBase,
  previewClassName = "h-20 w-32",
}) {
  const { lang } = useLang();
  const t = STRINGS[lang] || STRINGS.en;
  const fileRef = useRef(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  // On file pick, hand the file to the storage adapter: in Supabase mode it
  // uploads to the "media" bucket and returns a public URL; locally it returns
  // a base64 data URL. Either way we store the returned string via onChange.
  const handleFile = async (e) => {
    setError("");
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadImage(file, { folder: "settings" });
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
    <div>
      {label && (
        <span className="mb-1 block text-sm font-medium text-textPrimary text-start">
          {label}
        </span>
      )}
      <div className="flex flex-wrap items-start gap-3">
        {/* preview chip — consistent aspect ratio */}
        <span
          className={[
            "grid shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surfaceElevated",
            previewClassName,
          ].join(" ")}
          aria-hidden={value ? undefined : "true"}
          aria-label={value ? t.preview : undefined}
        >
          {value ? (
            <img
              src={value}
              alt={t.preview}
              className="h-full w-full object-contain"
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
                const v = e.target.value.trim();
                onChange(v ? v : null);
              }}
              aria-label={t.imageUrl}
              className={`${inputBase} ps-9`}
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
                  onChange(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-textSecondary transition-colors hover:border-danger/50 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                {t.clear}
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
          {hint && !error && (
            <p className="text-[11px] text-textMuted text-start">{hint}</p>
          )}
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
    </div>
  );
}

// ------------------------------------------------------------------ page -------
export default function AdminSettings() {
  const { settings, updateSettings, resetSettings, reloading } = useSettings();
  const { lang } = useLang();
  const { showToast } = useToast();
  const t = STRINGS[lang] || STRINGS.en;

  // Local editable copy of the settings; (re)seed whenever settings change.
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  // path-setter for nested values, e.g. setPath("contact", "phone")(value)
  const setNested = (section, key) => (eOrValue) => {
    const val = eOrValue?.target ? eOrValue.target.value : eOrValue;
    setForm((f) => ({ ...f, [section]: { ...f[section], [key]: val } }));
  };
  // bilingual nested, e.g. setBilingual("contact", "address", "en")(value)
  const setBilingual = (section, key, locale) => (eOrValue) => {
    const val = eOrValue?.target ? eOrValue.target.value : eOrValue;
    setForm((f) => ({
      ...f,
      [section]: {
        ...f[section],
        [key]: { ...f[section][key], [locale]: val },
      },
    }));
  };

  // brand.logoUrl is a top-level brand string (URL or dataURL or null)
  const setBrandLogo = (next) =>
    setForm((f) => ({ ...f, brand: { ...f.brand, logoUrl: next } }));
  const toggleHero = () =>
    setForm((f) => ({
      ...f,
      brand: { ...f.brand, useLogoInHero: !f.brand.useLogoInHero },
    }));

  // payments list editing
  const setProvider = (idx, patch) =>
    setForm((f) => ({
      ...f,
      payments: f.payments.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }));
  const addProvider = () =>
    setForm((f) => ({
      ...f,
      payments: [...f.payments, { id: newProviderId(), name: "", logoUrl: null }],
    }));
  const removeProvider = (idx) =>
    setForm((f) => ({
      ...f,
      payments: f.payments.filter((_, i) => i !== idx),
    }));

  async function handleSave() {
    setSaving(true);
    try {
      await updateSettings(form);
      showToast(t.saved, { tone: "success" });
    } catch {
      showToast(t.errorGeneric);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await resetSettings();
      showToast(t.wasReset, { tone: "success" });
    } catch {
      showToast(t.errorGeneric);
    } finally {
      setResetting(false);
    }
  }

  const busy = saving || resetting || reloading;

  return (
    <section>
      {/* header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20"
            aria-hidden="true"
          >
            <SlidersHorizontal className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-textPrimary text-start">
              {t.title}
            </h1>
            <p className="mt-1 text-sm text-textSecondary text-start">
              {t.subtitle}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-textSecondary transition-colors hover:border-primary/40 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {resetting ? t.resetting : t.reset}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* CONTACT */}
        <Section
          icon={Phone}
          title={t.contactTitle}
          desc={t.contactDesc}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.phone} htmlFor="set-phone">
              <input
                id="set-phone"
                type="tel"
                dir="ltr"
                value={form.contact.phone}
                onChange={setNested("contact", "phone")}
                className={inputBase}
              />
            </Field>
            <Field label={t.email} htmlFor="set-email">
              <input
                id="set-email"
                type="email"
                dir="ltr"
                value={form.contact.email}
                onChange={setNested("contact", "email")}
                className={inputBase}
              />
            </Field>
            <Field label={t.addressEn} htmlFor="set-addr-en">
              <input
                id="set-addr-en"
                type="text"
                dir="ltr"
                value={form.contact.address.en}
                onChange={setBilingual("contact", "address", "en")}
                className={inputBase}
              />
            </Field>
            <Field label={t.addressAr} htmlFor="set-addr-ar">
              <input
                id="set-addr-ar"
                type="text"
                dir="rtl"
                value={form.contact.address.ar}
                onChange={setBilingual("contact", "address", "ar")}
                className={inputBase}
              />
            </Field>
            <Field label={t.hoursEn} htmlFor="set-hours-en">
              <input
                id="set-hours-en"
                type="text"
                dir="ltr"
                value={form.contact.hours.en}
                onChange={setBilingual("contact", "hours", "en")}
                className={inputBase}
              />
            </Field>
            <Field label={t.hoursAr} htmlFor="set-hours-ar">
              <input
                id="set-hours-ar"
                type="text"
                dir="rtl"
                value={form.contact.hours.ar}
                onChange={setBilingual("contact", "hours", "ar")}
                className={inputBase}
              />
            </Field>
          </div>
        </Section>

        {/* BRAND / HERO */}
        <Section icon={ImageIcon} title={t.brandTitle} desc={t.brandDesc}>
          <div className="space-y-4">
            <ImageField
              label={t.logo}
              hint={t.logoHint}
              value={form.brand.logoUrl}
              onChange={setBrandLogo}
              idBase="set-logo"
              previewClassName="h-20 w-40"
            />

            {/* use logo in hero toggle */}
            <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surfaceElevated px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-textPrimary text-start">
                  {t.useLogoInHero}
                </p>
                <p className="mt-0.5 text-[11px] text-textMuted text-start">
                  {t.useLogoInHeroHint}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.brand.useLogoInHero}
                aria-label={t.useLogoInHero}
                onClick={toggleHero}
                className={[
                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  form.brand.useLogoInHero ? "bg-primary" : "bg-border",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className={[
                    "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                    form.brand.useLogoInHero
                      ? "translate-x-5 rtl:-translate-x-5"
                      : "translate-x-0.5 rtl:-translate-x-0.5",
                  ].join(" ")}
                />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.taglineEn} htmlFor="set-tag-en">
                <input
                  id="set-tag-en"
                  type="text"
                  dir="ltr"
                  value={form.brand.tagline.en}
                  onChange={setBilingual("brand", "tagline", "en")}
                  className={inputBase}
                />
              </Field>
              <Field label={t.taglineAr} htmlFor="set-tag-ar">
                <input
                  id="set-tag-ar"
                  type="text"
                  dir="rtl"
                  value={form.brand.tagline.ar}
                  onChange={setBilingual("brand", "tagline", "ar")}
                  className={inputBase}
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* TEXT BLOCKS */}
        <Section icon={Type} title={t.textTitle} desc={t.textDesc}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.footerEn} htmlFor="set-footer-en">
              <textarea
                id="set-footer-en"
                rows={4}
                dir="ltr"
                value={form.footer.tagline.en}
                onChange={setBilingual("footer", "tagline", "en")}
                className={`${inputBase} resize-y`}
              />
            </Field>
            <Field label={t.footerAr} htmlFor="set-footer-ar">
              <textarea
                id="set-footer-ar"
                rows={4}
                dir="rtl"
                value={form.footer.tagline.ar}
                onChange={setBilingual("footer", "tagline", "ar")}
                className={`${inputBase} resize-y`}
              />
            </Field>
            <Field label={t.promoEn} htmlFor="set-promo-en">
              <textarea
                id="set-promo-en"
                rows={3}
                dir="ltr"
                value={form.promo.en}
                onChange={setNested("promo", "en")}
                className={`${inputBase} resize-y`}
              />
            </Field>
            <Field label={t.promoAr} htmlFor="set-promo-ar">
              <textarea
                id="set-promo-ar"
                rows={3}
                dir="rtl"
                value={form.promo.ar}
                onChange={setNested("promo", "ar")}
                className={`${inputBase} resize-y`}
              />
            </Field>
          </div>
        </Section>

        {/* PAYMENTS */}
        <Section
          icon={CreditCard}
          title={t.paymentsTitle}
          desc={t.paymentsDesc}
        >
          {form.payments.length === 0 ? (
            <p className="rounded-lg border border-border bg-surfaceElevated p-5 text-center text-sm text-textSecondary">
              {t.noProviders}
            </p>
          ) : (
            <ul className="space-y-3">
              {form.payments.map((p, idx) => (
                <li
                  key={p.id || idx}
                  className="rounded-xl border border-border bg-surfaceElevated p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="sm:w-56">
                      <Field
                        label={t.providerName}
                        htmlFor={`pay-name-${idx}`}
                      >
                        <input
                          id={`pay-name-${idx}`}
                          type="text"
                          value={p.name}
                          onChange={(e) =>
                            setProvider(idx, { name: e.target.value })
                          }
                          className={inputBase}
                        />
                      </Field>
                    </div>
                    <div className="min-w-0 flex-1">
                      <ImageField
                        label={t.providerLogo}
                        value={p.logoUrl}
                        onChange={(next) => setProvider(idx, { logoUrl: next })}
                        idBase={`pay-logo-${idx}`}
                        previewClassName="h-10 w-16"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProvider(idx)}
                      aria-label={`${t.removeProvider} ${p.name || ""}`.trim()}
                      className="grid h-9 w-9 shrink-0 place-items-center self-start rounded-lg border border-border bg-surface text-textSecondary transition-colors hover:border-danger/50 hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={addProvider}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border bg-surface px-4 py-2 text-sm font-medium text-textSecondary transition-colors hover:border-primary/40 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t.addProvider}
          </button>
        </Section>

        {/* SOCIAL MEDIA */}
        <Section icon={Share2} title={t.socialTitle} desc={t.socialDesc}>
          <div className="grid gap-4 sm:grid-cols-2">
            {SOCIAL_KEYS.map((key) => (
              <Field key={key} label={t[key]} htmlFor={`set-social-${key}`}>
                <div className="relative">
                  <Link2
                    className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted"
                    aria-hidden="true"
                  />
                  <input
                    id={`set-social-${key}`}
                    type="url"
                    dir="ltr"
                    inputMode="url"
                    placeholder="https://…"
                    value={form.social?.[key] ?? ""}
                    onChange={setNested("social", key)}
                    className={`${inputBase} ps-9`}
                  />
                </div>
              </Field>
            ))}
          </div>
        </Section>

        {/* POLICIES & PAGES */}
        <Section icon={FileText} title={t.pagesTitle} desc={t.pagesDesc}>
          <div className="space-y-6">
            {PAGE_KEYS.map((slug) => (
              <div key={slug}>
                <h3 className="mb-2 font-display text-base font-bold text-textPrimary text-start">
                  {t[PAGE_LABELS[slug]]}
                </h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label={t.english}>
                    <RichTextEditor
                      value={form.pages?.[slug]?.en ?? ""}
                      onChange={(html) =>
                        setBilingual("pages", slug, "en")(html)
                      }
                      dir="ltr"
                      ariaLabel={`${t[PAGE_LABELS[slug]]} — ${t.english}`}
                    />
                  </Field>
                  <Field label={t.arabic}>
                    <RichTextEditor
                      value={form.pages?.[slug]?.ar ?? ""}
                      onChange={(html) =>
                        setBilingual("pages", slug, "ar")(html)
                      }
                      dir="rtl"
                      ariaLabel={`${t[PAGE_LABELS[slug]]} — ${t.arabic}`}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </section>
  );
}
