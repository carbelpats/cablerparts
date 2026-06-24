// -----------------------------------------------------------------------------
// AL-MEYAR — InfoPage (bilingual content pages)
//
// A single, content-driven page that backs every footer/nav info route:
//   /about  /contact  /support  /returns  /shipping  /privacy  /terms
//
// Content lives in a slug-keyed map with full EN + AR copy; the active slug
// comes from a `slug` prop (App passes it per-route) or — as a fallback — the
// :slug route param. Renders the Midnight-Tachometer hero shell + body sections,
// sets per-route <title>/description via useDocumentMeta, and is fully RTL-aware
// through logical Tailwind utilities. The /contact page surfaces the real Dammam
// address / phone / email (latin dir="ltr" for phone + email).
//
// Bilingual via a local STRINGS={en,ar} chrome dict + the per-slug CONTENT map
// (selected by useLang().lang). a11y: semantic headings, labelled regions,
// focus-visible links. No Date.now / Math.random at module top.
// -----------------------------------------------------------------------------

import { Link, useParams } from "react-router-dom";
import {
  Info,
  Mail,
  Phone,
  MapPin,
  RotateCcw,
  Truck,
  ShieldCheck,
  FileText,
  LifeBuoy,
  Building2,
  ArrowRight,
} from "lucide-react";
import { useLang } from "../context/LanguageContext";
import { useSettings } from "../context/SettingsContext";
import { useDocumentMeta } from "../hooks/useDocumentMeta";

/* ----------------------------------------------------------------------------
   Page chrome strings (shared across every slug).
---------------------------------------------------------------------------- */
const STRINGS = {
  en: {
    home: "Home",
    notFoundTitle: "Page not found",
    notFoundBody:
      "We couldn’t find that page. Head back to the storefront to keep browsing.",
    backHome: "Back to home",
    browseCatalog: "Browse the catalog",
    contactCta: "Contact our team",
    // contact block labels
    address: "Address",
    phone: "Phone",
    email: "Email",
    hours: "Support hours",
    hoursValue: "Sun–Thu, 9:00–18:00 (AST)",
  },
  ar: {
    home: "الرئيسية",
    notFoundTitle: "الصفحة غير موجودة",
    notFoundBody:
      "تعذّر العثور على هذه الصفحة. عُد إلى المتجر لمواصلة التصفّح.",
    backHome: "العودة للرئيسية",
    browseCatalog: "تصفّح الكتالوج",
    contactCta: "تواصل مع فريقنا",
    address: "العنوان",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    hours: "ساعات الدعم",
    hoursValue: "الأحد–الخميس، 9:00–18:00 (بتوقيت السعودية)",
  },
};

/* Coming-soon fallback shown when an admin hasn't authored this page yet. */
const COMING_SOON = {
  en: {
    title: "Content coming soon",
    body: "We're putting the finishing touches on this page. Check back shortly, or reach our team if you need help right away.",
  },
  ar: {
    title: "المحتوى قريباً",
    body: "نضع اللمسات الأخيرة على هذه الصفحة. عُد قريباً، أو تواصل مع فريقنا إن احتجت مساعدة فورية.",
  },
};

/* Map a route slug to its settings.pages key. Routes use "returns" for the
   returns/warranty page, while the CMS stores it under "warranty". */
const PAGE_KEY_BY_SLUG = {
  about: "about",
  support: "support",
  returns: "warranty",
  shipping: "shipping",
  privacy: "privacy",
  terms: "terms",
  pdpl: "pdpl",
  disclaimer: "disclaimer",
};

/* ----------------------------------------------------------------------------
   Dependency-free HTML sanitizer for admin-authored rich text.

   The policy/content HTML comes from the trusted admin CMS, but we still strip
   anything script-like (script/style/iframe/event handlers, javascript: URLs)
   before injecting it via dangerouslySetInnerHTML — defense in depth. Runs in
   the browser (DOMParser); on the server it returns "" so nothing unsanitized
   is ever rendered. Module-top safe (no Date.now / Math.random / DOM access at
   import time — DOMParser is only touched inside the function).
---------------------------------------------------------------------------- */
const ALLOWED_TAGS = new Set([
  "P", "BR", "B", "STRONG", "I", "EM", "U", "S", "H1", "H2", "H3", "H4",
  "UL", "OL", "LI", "BLOCKQUOTE", "A", "SPAN", "DIV", "HR", "CODE", "PRE",
]);

function sanitizeHtml(dirty) {
  if (!dirty || typeof dirty !== "string") return "";
  if (typeof window === "undefined" || typeof window.DOMParser === "undefined") {
    return "";
  }
  let doc;
  try {
    doc = new window.DOMParser().parseFromString(dirty, "text/html");
  } catch {
    return "";
  }

  const walk = (node) => {
    // Iterate over a static copy so removals don't disturb traversal.
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === 1) {
        const tag = child.tagName;
        if (!ALLOWED_TAGS.has(tag)) {
          child.remove();
          return;
        }
        // Strip every attribute except a safe href on anchors.
        Array.from(child.attributes).forEach((attr) => {
          const name = attr.name.toLowerCase();
          if (tag === "A" && name === "href") {
            const val = (attr.value || "").trim();
            // Allow only http(s)/mailto/tel; reject javascript:, data:, etc.
            if (!/^(https?:|mailto:|tel:|#|\/)/i.test(val)) {
              child.removeAttribute("href");
            }
          } else {
            child.removeAttribute(attr.name);
          }
        });
        if (tag === "A" && child.getAttribute("href")) {
          child.setAttribute("target", "_blank");
          child.setAttribute("rel", "noopener noreferrer");
        }
        walk(child);
      } else if (child.nodeType !== 3) {
        // Comments, CDATA, etc. → drop.
        child.remove();
      }
    });
  };

  walk(doc.body);
  return doc.body.innerHTML;
}

/* Real contact details — mirror the footer. */
const CONTACT = {
  en: {
    address: "Cabler Parts Distribution Center, Dammam, Eastern Province, KSA",
  },
  ar: {
    address: "مركز كابلر بارتس للتوزيع، الدمّام، المنطقة الشرقية، السعودية",
  },
  phone: "+966 800 000 000",
  email: "support@cablerparts.com",
};

/* ----------------------------------------------------------------------------
   Per-slug content. Each entry: { icon, eyebrow, title, intro, sections[] }
   in both languages. `sections` are { heading, body } — body may be a string
   or an array of strings (rendered as paragraphs / bullet list).
---------------------------------------------------------------------------- */
const CONTENT = {
  about: {
    icon: Building2,
    en: {
      eyebrow: "About",
      title: "About Cabler Parts",
      intro:
        "Cabler Parts — “the standard” — supplies engineered-to-standard performance auto parts across the Gulf, with traceable part numbers and verified fitment.",
      sections: [
        {
          heading: "Our promise",
          body: "Every component we ship is traceable by part number, verified for fitment against your vehicle, and backed by a clear GCC-wide warranty. We treat order accuracy as a manufacturing tolerance — not a guess.",
        },
        {
          heading: "Built for the Gulf",
          body: "From our Dammam distribution center we deliver across the GCC with fast, tracked shipping. Pricing is localized to SAR and USD, and the whole storefront is fully bilingual in Arabic and English.",
        },
        {
          heading: "Quality you can verify",
          body: "We focus on OEM-grade and ISO 9001 components, paired with transparent specs and verified buyer reviews — so popularity reads as engineering consensus, not hype.",
        },
      ],
    },
    ar: {
      eyebrow: "عن كابلر بارتس",
      title: "عن كابلر بارتس",
      intro:
        "كابلر بارتس يوفّر قطع غيار أداء مهندَسة بمعايير الوكالة في جميع أنحاء الخليج، بأرقام قطع قابلة للتتبّع وتوافق موثّق.",
      sections: [
        {
          heading: "وعدنا",
          body: "كل قطعة نشحنها قابلة للتتبّع برقمها، وموثّقة التوافق مع سيارتك، ومدعومة بضمان واضح في كل دول الخليج. ندير دقّة الطلب كأنها تفاوت تصنيعي — لا تخمين.",
        },
        {
          heading: "مصمّم للخليج",
          body: "من مركز توزيعنا في الدمّام نوصّل إلى كل دول الخليج بشحن سريع وقابل للتتبّع. الأسعار محلّية بالريال السعودي والدولار، والمتجر بالكامل ثنائي اللغة عربي وإنجليزي.",
        },
        {
          heading: "جودة يمكنك التحقّق منها",
          body: "نركّز على قطع بمستوى الوكالة ومعتمدة آيزو 9001، مع مواصفات شفّافة ومراجعات مشترين موثّقين — لتقرأ الشعبية كإجماع هندسي لا كضجيج.",
        },
      ],
    },
  },

  contact: {
    icon: Mail,
    isContact: true,
    en: {
      eyebrow: "Contact",
      title: "Contact us",
      intro:
        "Questions about a part, an order, or fitment? Our Gulf-based team is here to help.",
      sections: [
        {
          heading: "Reach us",
          body: "Email us anytime or call during support hours — we typically reply within one business day. Have your order ID ready for the fastest help.",
        },
      ],
    },
    ar: {
      eyebrow: "تواصل",
      title: "تواصل معنا",
      intro:
        "أسئلة عن قطعة أو طلب أو التوافق؟ فريقنا في الخليج جاهز لمساعدتك.",
      sections: [
        {
          heading: "تواصل معنا",
          body: "راسلنا في أي وقت أو اتصل خلال ساعات الدعم — نردّ عادةً خلال يوم عمل واحد. جهّز رقم طلبك لأسرع مساعدة.",
        },
      ],
    },
  },

  support: {
    icon: LifeBuoy,
    en: {
      eyebrow: "Support",
      title: "Help & support",
      intro:
        "Everything you need to track an order, confirm fitment, or resolve an issue.",
      sections: [
        {
          heading: "Track your order",
          body: "Use the Track Order page with the “MR-” id from your receipt to follow your shipment in real time, from preparation in our GCC hub to delivery.",
        },
        {
          heading: "Confirm fitment",
          body: "Add your vehicle to The Garage (Make → Model → Year) to see verified-fit badges across the catalog, or decode your VIN in the Garage for an instant match.",
        },
        {
          heading: "Still stuck?",
          body: "Contact our team with your order ID and part number and we’ll sort it out quickly.",
        },
      ],
    },
    ar: {
      eyebrow: "الدعم",
      title: "المساعدة والدعم",
      intro:
        "كل ما تحتاجه لتتبّع طلب، أو تأكيد التوافق، أو حلّ مشكلة.",
      sections: [
        {
          heading: "تتبّع طلبك",
          body: "استخدم صفحة تتبّع الطلب برقم «MR-» الموجود في إيصالك لمتابعة شحنتك لحظة بلحظة، من التجهيز في مركزنا الخليجي حتى التوصيل.",
        },
        {
          heading: "تأكيد التوافق",
          body: "أضف سيارتك إلى المرآب (الصنع ← الطراز ← السنة) لرؤية شارات التوافق الموثّق عبر الكتالوج، أو فكّ رقم الهيكل (VIN) في المرآب لمطابقة فورية.",
        },
        {
          heading: "ما زلت بحاجة لمساعدة؟",
          body: "تواصل مع فريقنا برقم طلبك ورقم القطعة وسنحلّ الأمر بسرعة.",
        },
      ],
    },
  },

  returns: {
    icon: RotateCcw,
    en: {
      eyebrow: "Returns & warranty",
      title: "Returns & warranty",
      intro:
        "Shop with confidence — clear returns and a GCC-wide warranty on every part.",
      sections: [
        {
          heading: "30-day returns",
          body: "Unused parts in original packaging can be returned within 30 days of delivery. Start a return by contacting us with your order ID; we’ll issue instructions and a refund to your original payment method once the item is received and inspected. Approved refunds are processed within 7–14 business days of receiving and inspecting the return, back to the original payment method used at checkout.",
        },
        {
          heading: "2-year warranty",
          body: "Eligible components are covered against manufacturing defects for 2 years. Warranty claims require the order ID and the part number printed on your invoice.",
        },
        {
          heading: "What isn’t covered",
          body: "Wear items, improper installation, and damage from misuse fall outside the warranty. When in doubt, contact us before installing.",
        },
      ],
    },
    ar: {
      eyebrow: "الإرجاع والضمان",
      title: "الإرجاع والضمان",
      intro:
        "تسوّق باطمئنان — سياسة إرجاع واضحة وضمان في كل دول الخليج على كل قطعة.",
      sections: [
        {
          heading: "إرجاع خلال 30 يومًا",
          body: "يمكن إرجاع القطع غير المستخدمة بعبوتها الأصلية خلال 30 يومًا من الاستلام. ابدأ الإرجاع بالتواصل معنا برقم طلبك؛ وسنزوّدك بالتعليمات ونعيد المبلغ إلى وسيلة الدفع الأصلية بعد استلام القطعة وفحصها. تُعالَج المبالغ المستردّة المعتمدة خلال 7–14 يوم عمل من استلام القطعة المُرجعة وفحصها، وتُعاد إلى وسيلة الدفع الأصلية المستخدمة عند الدفع.",
        },
        {
          heading: "ضمان سنتين",
          body: "القطع المؤهّلة مغطّاة ضد عيوب التصنيع لمدة سنتين. تتطلّب مطالبات الضمان رقم الطلب ورقم القطعة المطبوع على فاتورتك.",
        },
        {
          heading: "ما لا يشمله الضمان",
          body: "قطع التآكل، والتركيب غير الصحيح، والأضرار الناتجة عن سوء الاستخدام خارج نطاق الضمان. عند الشكّ، تواصل معنا قبل التركيب.",
        },
      ],
    },
  },

  shipping: {
    icon: Truck,
    en: {
      eyebrow: "Shipping",
      title: "Shipping across the GCC",
      intro:
        "Fast, tracked delivery from our Dammam hub to every GCC market.",
      sections: [
        {
          heading: "Coverage & speed",
          body: "We ship across the GCC — Saudi Arabia, UAE, Kuwait, Qatar, Bahrain, and Oman. Domestic KSA orders typically arrive in 1–3 business days; other GCC destinations in 3–7 business days.",
        },
        {
          heading: "Free GCC shipping",
          body: "Qualifying orders ship free across the GCC — the cart shows exactly how much more you need to unlock it. Smaller orders carry a flat, transparent rate at checkout.",
        },
        {
          heading: "Tracking",
          body: "Every order ships with a trackable “MR-” id. Follow it any time on the Track Order page from preparation to delivery.",
        },
      ],
    },
    ar: {
      eyebrow: "الشحن",
      title: "الشحن داخل دول الخليج",
      intro:
        "توصيل سريع وقابل للتتبّع من مركزنا في الدمّام إلى كل أسواق الخليج.",
      sections: [
        {
          heading: "التغطية والسرعة",
          body: "نشحن إلى كل دول الخليج — السعودية والإمارات والكويت وقطر والبحرين وعُمان. تصل الطلبات داخل السعودية عادةً خلال 1–3 أيام عمل، وبقية وجهات الخليج خلال 3–7 أيام عمل.",
        },
        {
          heading: "شحن مجاني داخل الخليج",
          body: "الطلبات المؤهّلة تُشحن مجانًا داخل الخليج — وتعرض السلة بالضبط كم يتبقّى لتفعيله. الطلبات الأصغر عليها رسوم ثابتة وواضحة عند الدفع.",
        },
        {
          heading: "التتبّع",
          body: "كل طلب يُشحن برقم «MR-» قابل للتتبّع. تابعه في أي وقت من صفحة تتبّع الطلب من التجهيز حتى التوصيل.",
        },
      ],
    },
  },

  privacy: {
    icon: ShieldCheck,
    en: {
      eyebrow: "Legal",
      title: "Privacy policy",
      intro:
        "We collect only what we need to fulfil your orders and improve your experience.",
      sections: [
        {
          heading: "What we collect",
          body: "Account details (name, email), order and shipping information, and basic usage data. Payment card details are tokenized by our PCI-DSS-compliant payment provider and are never stored on our servers — we never see or keep your full card number.",
        },
        {
          heading: "How we use it",
          body: "To process and ship orders, provide support, prevent fraud, and improve the storefront. We do not sell your personal data.",
        },
        {
          heading: "Your choices",
          body: "You can view and update your profile from your account, and request deletion of your data by contacting us. We retain order records as required for warranty and legal purposes.",
        },
        {
          heading: "Saudi PDPL compliance",
          body: "We process personal data in line with the Saudi Personal Data Protection Law (PDPL). For full detail on your rights, the lawful basis for processing, retention periods, and how to reach our data controller, see our dedicated Personal Data Protection (PDPL) page.",
        },
      ],
    },
    ar: {
      eyebrow: "قانوني",
      title: "سياسة الخصوصية",
      intro:
        "نجمع فقط ما نحتاجه لتنفيذ طلباتك وتحسين تجربتك.",
      sections: [
        {
          heading: "ما الذي نجمعه",
          body: "بيانات الحساب (الاسم، البريد الإلكتروني)، ومعلومات الطلب والشحن، وبيانات استخدام أساسية. تُرمَّز بيانات بطاقة الدفع لدى مزوّد الدفع المتوافق مع معيار PCI-DSS ولا تُخزَّن أبدًا على خوادمنا — فنحن لا نرى رقم بطاقتك الكامل ولا نحتفظ به.",
        },
        {
          heading: "كيف نستخدمها",
          body: "لمعالجة الطلبات وشحنها، وتقديم الدعم، ومنع الاحتيال، وتحسين المتجر. نحن لا نبيع بياناتك الشخصية.",
        },
        {
          heading: "خياراتك",
          body: "يمكنك عرض ملفك الشخصي وتحديثه من حسابك، وطلب حذف بياناتك بالتواصل معنا. نحتفظ بسجلّات الطلبات وفق ما يتطلّبه الضمان والأغراض القانونية.",
        },
        {
          heading: "الامتثال لنظام حماية البيانات الشخصية السعودي",
          body: "نعالج البيانات الشخصية وفقًا لنظام حماية البيانات الشخصية السعودي (PDPL). للاطّلاع على تفاصيل حقوقك، والأساس النظامي للمعالجة، ومدد الاحتفاظ، وكيفية التواصل مع المتحكّم في البيانات لدينا، راجع صفحة حماية البيانات الشخصية (PDPL) المخصّصة.",
        },
      ],
    },
  },

  terms: {
    icon: FileText,
    en: {
      eyebrow: "Legal",
      title: "Terms of service",
      intro:
        "The terms that govern your use of the Cabler Parts storefront and purchases.",
      sections: [
        {
          heading: "Orders & pricing",
          body: "Prices are shown in your selected currency (SAR or USD) and may change without notice. We reserve the right to cancel orders with pricing or stock errors and refund any payment in full.",
        },
        {
          heading: "Fitment responsibility",
          body: "Fitment tools and verified-fit badges are provided to assist you, but final responsibility for selecting the correct part rests with the buyer. When unsure, confirm the part number with our team before ordering.",
        },
        {
          heading: "Liability",
          body: "Cabler Parts is not liable for installation costs or consequential damages. Our maximum liability for any claim is limited to the price paid for the affected part. Returns and warranty are governed by the Returns & Warranty policy.",
        },
      ],
    },
    ar: {
      eyebrow: "قانوني",
      title: "شروط الخدمة",
      intro:
        "الشروط التي تحكم استخدامك لمتجر كابلر بارتس وعمليات الشراء.",
      sections: [
        {
          heading: "الطلبات والأسعار",
          body: "تُعرض الأسعار بالعملة التي تختارها (الريال السعودي أو الدولار) وقد تتغيّر دون إشعار. نحتفظ بالحقّ في إلغاء الطلبات التي تحتوي أخطاء في السعر أو المخزون وإعادة أي مبلغ مدفوع بالكامل.",
        },
        {
          heading: "مسؤولية التوافق",
          body: "أدوات التوافق وشارات التوافق الموثّق مقدَّمة لمساعدتك، لكن المسؤولية النهائية عن اختيار القطعة الصحيحة تقع على المشتري. عند الشكّ، أكّد رقم القطعة مع فريقنا قبل الطلب.",
        },
        {
          heading: "المسؤولية",
          body: "كابلر بارتس غير مسؤول عن تكاليف التركيب أو الأضرار التبعية. أقصى مسؤولية لنا عن أي مطالبة محدودة بسعر القطعة المتأثّرة. يخضع الإرجاع والضمان لسياسة الإرجاع والضمان.",
        },
      ],
    },
  },

  pdpl: {
    icon: ShieldCheck,
    en: {
      eyebrow: "Legal",
      title: "Personal Data Protection (PDPL)",
      intro:
        "How Cabler Parts collects, uses, protects, and shares your personal data under the Saudi Personal Data Protection Law.",
      sections: [
        {
          heading: "Legal basis",
          body: "This policy is issued in accordance with the Saudi Personal Data Protection Law (PDPL — نظام حماية البيانات الشخصية) and its Implementing Regulations, issued by the Saudi Data & AI Authority (SDAIA). It complements our Privacy Policy and governs how we handle the personal data of customers in the Kingdom.",
        },
        {
          heading: "Personal data we collect",
          body: "Identity and contact data (name, email, phone, billing and shipping address); order, payment, and delivery records; vehicle and fitment data you add to The Garage; account credentials; and technical data such as device, browser, and usage information. We do not store full payment card numbers — these are tokenized by our PCI-DSS-compliant payment provider.",
        },
        {
          heading: "Purposes of processing",
          body: "We process personal data to create and manage your account, fulfil and deliver orders, process payments and refunds, provide customer support and warranty service, prevent fraud, comply with legal and tax obligations, and — with your consent — send you marketing communications.",
        },
        {
          heading: "Lawful basis & consent",
          body: "We rely on the lawful bases recognized by the PDPL: performance of the contract with you, compliance with a legal obligation, our legitimate interests (such as fraud prevention and service improvement), and your explicit consent where required (for example, marketing). You may withdraw consent at any time without affecting processing carried out before withdrawal.",
        },
        {
          heading: "Data retention",
          body: "We keep personal data only for as long as necessary for the purposes above, including the duration of your account and any period required by warranty, accounting, tax, and other legal obligations. When data is no longer needed, it is securely deleted or anonymized.",
        },
        {
          heading: "Your rights",
          body: [
            "Right to be informed about how your personal data is processed.",
            "Right to access your personal data and obtain a copy.",
            "Right to request correction of inaccurate or incomplete data.",
            "Right to request deletion of your data where there is no legal reason to retain it.",
            "Right to object to or restrict certain processing, including direct marketing.",
          ],
        },
        {
          heading: "Security measures",
          body: "We apply technical and organizational safeguards — encryption in transit, access controls, tokenized payments, and least-privilege handling of data — to protect personal data against loss, misuse, and unauthorized access. No method of transmission is completely secure, but we continually review and improve our controls.",
        },
        {
          heading: "Cross-border transfer",
          body: "Where personal data is transferred or processed outside the Kingdom (for example, by trusted hosting or service providers), we do so only in line with the PDPL and its conditions for cross-border transfer, and we require appropriate safeguards to keep your data protected to an equivalent standard.",
        },
        {
          heading: "Contact the data controller",
          body: "Cabler Parts is the data controller for your personal data. To exercise any of your rights, withdraw consent, or raise a concern, contact us at support@cablerparts.com or through our Contact page. You also have the right to lodge a complaint with the competent supervisory authority (SDAIA).",
        },
      ],
    },
    ar: {
      eyebrow: "قانوني",
      title: "سياسة حماية البيانات الشخصية",
      intro:
        "كيف يجمع كابلر بارتس بياناتك الشخصية ويستخدمها ويحميها ويشاركها وفق نظام حماية البيانات الشخصية السعودي.",
      sections: [
        {
          heading: "الأساس النظامي",
          body: "تصدر هذه السياسة وفقًا لنظام حماية البيانات الشخصية السعودي (PDPL) ولائحته التنفيذية، الصادر عن الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا). وهي مكمّلة لسياسة الخصوصية لدينا وتنظّم كيفية تعاملنا مع البيانات الشخصية للعملاء داخل المملكة.",
        },
        {
          heading: "البيانات الشخصية التي نجمعها",
          body: "بيانات الهوية والتواصل (الاسم، البريد الإلكتروني، الهاتف، عنوان الفوترة والشحن)؛ وسجلّات الطلبات والدفع والتوصيل؛ وبيانات المركبة والتوافق التي تضيفها إلى المرآب؛ وبيانات الدخول للحساب؛ والبيانات التقنية مثل الجهاز والمتصفّح ومعلومات الاستخدام. لا نخزّن أرقام بطاقات الدفع الكاملة — إذ تُرمَّز لدى مزوّد الدفع المتوافق مع معيار PCI-DSS.",
        },
        {
          heading: "أغراض المعالجة",
          body: "نعالج البيانات الشخصية لإنشاء حسابك وإدارته، وتنفيذ الطلبات وتوصيلها، ومعالجة المدفوعات والمبالغ المستردّة، وتقديم الدعم وخدمة الضمان، ومنع الاحتيال، والامتثال للالتزامات النظامية والضريبية، وإرسال الرسائل التسويقية بموافقتك.",
        },
        {
          heading: "الأساس النظامي والموافقة",
          body: "نعتمد على الأسس النظامية التي يقرّها نظام حماية البيانات الشخصية: تنفيذ العقد المبرم معك، والامتثال لالتزام نظامي، ومصالحنا المشروعة (مثل منع الاحتيال وتحسين الخدمة)، وموافقتك الصريحة عند الحاجة (كالتسويق). ويمكنك سحب موافقتك في أي وقت دون التأثير على المعالجة التي تمّت قبل السحب.",
        },
        {
          heading: "الاحتفاظ بالبيانات",
          body: "نحتفظ بالبيانات الشخصية للمدة اللازمة للأغراض المذكورة أعلاه فقط، بما في ذلك مدة استمرار حسابك وأي مدة يتطلّبها الضمان والمحاسبة والالتزامات الضريبية والنظامية الأخرى. وعند انتفاء الحاجة إليها، تُحذف بشكل آمن أو تُجهَّل هويتها.",
        },
        {
          heading: "حقوقك",
          body: [
            "حق العلم بكيفية معالجة بياناتك الشخصية.",
            "حق الوصول إلى بياناتك الشخصية والحصول على نسخة منها.",
            "حق طلب تصحيح البيانات غير الدقيقة أو غير المكتملة.",
            "حق طلب حذف بياناتك متى لم يوجد سبب نظامي للاحتفاظ بها.",
            "حق الاعتراض على معالجات معيّنة أو تقييدها، بما في ذلك التسويق المباشر.",
          ],
        },
        {
          heading: "إجراءات الأمان",
          body: "نطبّق ضوابط تقنية وتنظيمية — التشفير أثناء النقل، وضوابط الوصول، وترميز المدفوعات، ومبدأ الحدّ الأدنى من الصلاحيات في التعامل مع البيانات — لحماية البيانات الشخصية من الفقد وسوء الاستخدام والوصول غير المصرّح به. ولا توجد وسيلة نقل آمنة تمامًا، لكننا نراجع ضوابطنا ونحسّنها باستمرار.",
        },
        {
          heading: "النقل خارج المملكة",
          body: "حين تُنقل البيانات الشخصية أو تُعالَج خارج المملكة (مثل مزوّدي الاستضافة أو الخدمات الموثوقين)، نفعل ذلك فقط بما يتوافق مع نظام حماية البيانات الشخصية وشروطه للنقل خارج المملكة، ونشترط ضمانات مناسبة للحفاظ على حماية بياناتك بمستوى مكافئ.",
        },
        {
          heading: "التواصل مع المتحكّم في البيانات",
          body: "كابلر بارتس هو المتحكّم في بياناتك الشخصية. لممارسة أيٍّ من حقوقك أو سحب موافقتك أو إبداء ملاحظة، تواصل معنا عبر support@cablerparts.com أو من خلال صفحة التواصل. ولك أيضًا حق تقديم شكوى إلى الجهة الرقابية المختصّة (سدايا).",
        },
      ],
    },
  },

  disclaimer: {
    icon: FileText,
    en: {
      eyebrow: "Legal",
      title: "Disclaimer & Domain Ownership",
      intro:
        "Our pledge of domain ownership and the disclaimers that apply to information published on this store.",
      sections: [
        {
          heading: "Domain ownership pledge",
          body: "The merchant operating this store pledges full ownership of the domain name __DOMAIN__ and bears full responsibility for the validity and integrity of all information published about it. Ownership of the domain belongs to the applicant/merchant, and the store is operated under that ownership.",
        },
        {
          heading: "Accuracy of information",
          body: "We make every effort to keep product details, specifications, pricing, fitment data, and availability accurate and up to date. However, information is provided “as is” and may contain inadvertent errors or change without notice. We do not warrant that all content is complete, current, or error-free, and we reserve the right to correct any error and update content at any time.",
        },
        {
          heading: "Limitation of liability",
          body: "To the maximum extent permitted by law, Cabler Parts is not liable for any indirect, incidental, or consequential damages arising from the use of this store or reliance on its content, including installation costs. Our maximum liability for any claim is limited to the price paid for the affected part, as set out in our Terms of Service.",
        },
        {
          heading: "Third-party links & brands",
          body: "This store may reference third-party brands, trademarks, and manufacturer part numbers solely to identify fitment and compatibility; all such marks remain the property of their respective owners and their use does not imply endorsement or affiliation. Any links to external sites are provided for convenience, and we are not responsible for their content, policies, or practices.",
        },
        {
          heading: "Authentic store & impersonation",
          body: "This store and its official domain __DOMAIN__ are genuine and operated by the merchant. We are not affiliated with any look-alike site, and we will never ask for your password or full card details by email or message. If you encounter a site, link, or message impersonating Cabler Parts, please report it to us immediately at support@cablerparts.com so we can act on it.",
        },
      ],
    },
    ar: {
      eyebrow: "قانوني",
      title: "إخلاء المسؤولية وتعهّد ملكية النطاق",
      intro:
        "تعهّدنا بملكية النطاق وإخلاءات المسؤولية المنطبقة على المعلومات المنشورة في هذا المتجر.",
      sections: [
        {
          heading: "تعهّد ملكية النطاق",
          body: "يتعهّد التاجر المُشغِّل لهذا المتجر بملكيته الكاملة لاسم النطاق __DOMAIN__ ويتحمّل كامل المسؤولية عن صحّة وسلامة جميع المعلومات المنشورة بشأنه. وتعود ملكية النطاق لمقدّم الطلب/التاجر، ويُشغَّل المتجر بموجب هذه الملكية.",
        },
        {
          heading: "دقّة المعلومات",
          body: "نبذل كل جهد للحفاظ على دقّة وتحديث تفاصيل المنتجات ومواصفاتها وأسعارها وبيانات التوافق وتوفّرها. ومع ذلك تُقدَّم المعلومات «كما هي» وقد تتضمّن أخطاءً غير مقصودة أو تتغيّر دون إشعار. ولا نضمن أن يكون كل المحتوى كاملًا أو محدّثًا أو خاليًا من الأخطاء، ونحتفظ بحق تصحيح أي خطأ وتحديث المحتوى في أي وقت.",
        },
        {
          heading: "حدود المسؤولية",
          body: "إلى أقصى حدّ يسمح به النظام، لا يتحمّل كابلر بارتس أي أضرار غير مباشرة أو عرضية أو تبعية تنشأ عن استخدام هذا المتجر أو الاعتماد على محتواه، بما في ذلك تكاليف التركيب. وأقصى مسؤولية لنا عن أي مطالبة محدودة بسعر القطعة المتأثّرة، وفق ما هو منصوص عليه في شروط الخدمة.",
        },
        {
          heading: "روابط وعلامات الأطراف الثالثة",
          body: "قد يشير هذا المتجر إلى علامات تجارية وأرقام قطع لجهات صانعة من أطراف ثالثة لغرض تحديد التوافق فقط؛ وتظل جميع تلك العلامات ملكًا لأصحابها، ولا يعني استخدامها أي تأييد أو ارتباط. وأي روابط لمواقع خارجية مقدَّمة للتسهيل فقط، ولسنا مسؤولين عن محتواها أو سياساتها أو ممارساتها.",
        },
        {
          heading: "المتجر الأصلي وانتحال الهوية",
          body: "هذا المتجر ونطاقه الرسمي __DOMAIN__ أصليان ويُشغَّلان من قِبل التاجر. ولسنا مرتبطين بأي موقع مشابه، ولن نطلب منك كلمة المرور أو بيانات بطاقتك الكاملة عبر البريد أو الرسائل. وإذا صادفت موقعًا أو رابطًا أو رسالة تنتحل هوية كابلر بارتس، فيرجى إبلاغنا فورًا عبر support@cablerparts.com لاتخاذ الإجراء اللازم.",
        },
      ],
    },
  },
};

/* Meta (title + description) per slug, both languages. Kept compact. */
const META = {
  about: {
    en: {
      title: "About",
      description:
        "Cabler Parts supplies engineered-to-standard performance auto parts across the Gulf — traceable, verified, and warranty-backed.",
    },
    ar: {
      title: "عن كابلر بارتس",
      description:
        "كابلر بارتس يوفّر قطع غيار أداء مهندَسة بمعايير الوكالة في كل أنحاء الخليج — قابلة للتتبّع وموثّقة ومدعومة بالضمان.",
    },
  },
  contact: {
    en: {
      title: "Contact us",
      description:
        "Contact the Cabler Parts team in Dammam by phone or email for help with parts, orders, and fitment.",
    },
    ar: {
      title: "تواصل معنا",
      description:
        "تواصل مع فريق كابلر بارتس في الدمّام هاتفيًا أو عبر البريد للمساعدة في القطع والطلبات والتوافق.",
    },
  },
  support: {
    en: {
      title: "Help & support",
      description:
        "Track orders, confirm fitment, and resolve issues with Cabler Parts help & support.",
    },
    ar: {
      title: "المساعدة والدعم",
      description:
        "تتبّع الطلبات وتأكيد التوافق وحلّ المشكلات مع مساعدة ودعم كابلر بارتس.",
    },
  },
  returns: {
    en: {
      title: "Returns & warranty",
      description:
        "Cabler Parts 30-day returns and a 2-year GCC-wide warranty on eligible parts.",
    },
    ar: {
      title: "الإرجاع والضمان",
      description:
        "إرجاع خلال 30 يومًا وضمان سنتين في كل دول الخليج على القطع المؤهّلة من كابلر بارتس.",
    },
  },
  shipping: {
    en: {
      title: "Shipping across the GCC",
      description:
        "Fast, tracked Cabler Parts shipping across the GCC from our Dammam hub, with free shipping on qualifying orders.",
    },
    ar: {
      title: "الشحن داخل دول الخليج",
      description:
        "شحن سريع وقابل للتتبّع من كابلر بارتس عبر دول الخليج من مركز الدمّام، مع شحن مجاني للطلبات المؤهّلة.",
    },
  },
  privacy: {
    en: {
      title: "Privacy policy",
      description:
        "How Cabler Parts collects, uses, and protects your data.",
    },
    ar: {
      title: "سياسة الخصوصية",
      description: "كيف يجمع كابلر بارتس بياناتك ويستخدمها ويحميها.",
    },
  },
  terms: {
    en: {
      title: "Terms of service",
      description:
        "The terms governing your use of the Cabler Parts storefront and purchases.",
    },
    ar: {
      title: "شروط الخدمة",
      description: "الشروط التي تحكم استخدامك لمتجر كابلر بارتس وعمليات الشراء.",
    },
  },
  pdpl: {
    en: {
      title: "Personal Data Protection (PDPL)",
      description:
        "How Cabler Parts handles your personal data under the Saudi Personal Data Protection Law — your rights, consent, retention, and contacting the data controller.",
    },
    ar: {
      title: "سياسة حماية البيانات الشخصية",
      description:
        "كيف يتعامل كابلر بارتس مع بياناتك الشخصية وفق نظام حماية البيانات الشخصية السعودي — حقوقك والموافقة والاحتفاظ والتواصل مع المتحكّم في البيانات.",
    },
  },
  disclaimer: {
    en: {
      title: "Disclaimer & Domain Ownership",
      description:
        "Cabler Parts domain ownership pledge, accuracy and liability disclaimers, third-party brands, and how to report impersonation.",
    },
    ar: {
      title: "إخلاء المسؤولية وتعهّد ملكية النطاق",
      description:
        "تعهّد كابلر بارتس بملكية النطاق، وإخلاءات الدقّة والمسؤولية، وعلامات الأطراف الثالثة، وكيفية الإبلاغ عن انتحال الهوية.",
    },
  },
};

/* ----------------------------------------------------------------------------
   Section body renderer — string → <p>, array → bullet list.
---------------------------------------------------------------------------- */
function SectionBody({ body }) {
  if (Array.isArray(body)) {
    return (
      <ul className="mt-2 flex list-none flex-col gap-2">
        {body.map((line, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 text-sm leading-relaxed text-textSecondary text-start"
          >
            <span
              aria-hidden="true"
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p className="mt-2 text-sm leading-relaxed text-textSecondary text-start">
      {body}
    </p>
  );
}

/* ----------------------------------------------------------------------------
   Contact details card — only rendered for the /contact slug.
---------------------------------------------------------------------------- */
function ContactCard({ tx, lang, contact }) {
  // CMS-driven contact details (settings.contact) with the original hardcoded
  // values as the fallback when a field is empty/unset.
  const address =
    (contact?.address && contact.address[lang]) ||
    CONTACT[lang].address;
  const phone = contact?.phone || CONTACT.phone;
  const email = contact?.email || CONTACT.email;
  const hours =
    (contact?.hours && contact.hours[lang]) || tx.hoursValue;

  const rows = [
    {
      Icon: MapPin,
      label: tx.address,
      value: address,
      ltr: false,
    },
    { Icon: Phone, label: tx.phone, value: phone, ltr: true },
    { Icon: Mail, label: tx.email, value: email, ltr: true },
    { Icon: LifeBuoy, label: tx.hours, value: hours, ltr: false },
  ];

  return (
    <div className="mt-8 rounded-2xl border border-border bg-surface/70 p-5 shadow-elevated backdrop-blur sm:p-6">
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {rows.map(({ Icon, label, value, ltr }) => (
          <li key={label} className="flex items-start gap-3 text-start">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="text-[11px] font-600 uppercase tracking-wider text-textMuted">
                {label}
              </span>
              {ltr ? (
                <span
                  dir="ltr"
                  className="mt-0.5 font-mono text-sm text-textPrimary text-start tabular-nums break-words"
                >
                  {value}
                </span>
              ) : (
                <span className="mt-0.5 text-sm font-500 text-textPrimary">
                  {value}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   InfoPage — slug from prop (preferred) or :slug route param.
---------------------------------------------------------------------------- */
export default function InfoPage({ slug: slugProp }) {
  const { lang } = useLang();
  const { settings } = useSettings();
  const params = useParams();
  const tx = STRINGS[lang] || STRINGS.en;

  const slug = slugProp || params.slug;
  const entry = slug ? CONTENT[slug] : null;
  const meta = (slug && META[slug]) || null;
  const metaTx = meta ? meta[lang] || meta.en : null;

  // Always call the hook (rules-of-hooks); null title leaves it untouched.
  useDocumentMeta({
    title: metaTx ? metaTx.title : tx.notFoundTitle,
    description: metaTx ? metaTx.description : undefined,
  });

  // Unknown slug → friendly not-found within the storefront chrome.
  if (!entry) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-20 text-center">
        <span className="grid mx-auto h-14 w-14 place-items-center rounded-2xl border border-border bg-surface text-textMuted">
          <Info className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-6 font-display text-2xl font-700 text-textPrimary">
          {tx.notFoundTitle}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-textSecondary">
          {tx.notFoundBody}
        </p>
        <Link
          to="/"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-display text-sm font-600 text-bg shadow-glow transition-all duration-300 hover:bg-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          {tx.backHome}
          <ArrowRight
            className="h-4 w-4 rtl:-scale-x-100"
            aria-hidden="true"
          />
        </Link>
      </main>
    );
  }

  const c = entry[lang] || entry.en;
  const Icon = entry.icon || Info;

  // Resolve the live domain for slugs that interpolate it (the disclaimer's
  // domain-ownership pledge). Static CONTENT uses a `__DOMAIN__` placeholder so
  // the copy stays a plain string; we swap in settings.compliance.domain when
  // available, otherwise the production default. Sections are mapped lazily so
  // unrelated slugs keep their original (already-string) bodies untouched.
  const domain = settings?.compliance?.domain || "cablerparts.com";
  const fillDomain = (text) =>
    typeof text === "string" ? text.replaceAll("__DOMAIN__", domain) : text;
  const sections = (c.sections || []).map((s) => ({
    heading: fillDomain(s.heading),
    body: Array.isArray(s.body) ? s.body.map(fillDomain) : fillDomain(s.body),
  }));

  // Admin-authored rich-text override for this slug, if any. The contact slug
  // is content-managed through settings.contact (the ContactCard) instead, so
  // it never consults settings.pages. When an admin has authored HTML for a
  // CMS-backed slug it overrides the built-in copy; otherwise the static
  // sections below render (and the "coming soon" block only when neither exists).
  const pageKey = entry.isContact ? null : PAGE_KEY_BY_SLUG[slug];
  const cmsRaw =
    pageKey && settings?.pages?.[pageKey]
      ? settings.pages[pageKey][lang] ||
        settings.pages[pageKey].en ||
        ""
      : "";
  const cmsHtml = cmsRaw ? sanitizeHtml(cmsRaw) : "";
  const soon = COMING_SOON[lang] || COMING_SOON.en;

  return (
    <main className="relative isolate min-h-[70vh] overflow-hidden bg-bg">
      {/* ---- Layered ambient background (Midnight-Tachometer) ---- */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute -left-1/4 -top-1/3 h-[44rem] w-[44rem] rounded-full bg-primary/15 blur-[120px] motion-safe:animate-glow-pulse" />
        <div className="absolute -right-1/4 top-1/4 h-[36rem] w-[36rem] rounded-full bg-accent/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(rgb(var(--border) / 0.16) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--border) / 0.16) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 80% 55% at 50% 20%, black 30%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 55% at 50% 20%, black 30%, transparent 80%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
      </div>

      <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-20">
        {/* ---- Breadcrumb ---- */}
        <nav aria-label="Breadcrumb" className="text-start">
          <ol className="flex items-center gap-1.5 font-mono text-xs text-textMuted">
            <li>
              <Link
                to="/"
                className="transition-colors hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded"
              >
                {tx.home}
              </Link>
            </li>
            <li aria-hidden="true">
              <ArrowRight className="h-3 w-3 rtl:-scale-x-100" />
            </li>
            <li className="text-textSecondary">{c.eyebrow}</li>
          </ol>
        </nav>

        {/* ---- Header ---- */}
        <header className="mt-6 text-start">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[0.7rem] uppercase tracking-widest text-primary">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {c.eyebrow}
          </span>
          <h1 className="mt-5 font-display text-3xl font-700 tracking-tight text-textPrimary text-balance sm:text-4xl">
            {c.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-textSecondary text-balance text-start">
            {c.intro}
          </p>
        </header>

        {/* ---- Contact details (contact slug only) ---- */}
        {entry.isContact && (
          <ContactCard tx={tx} lang={lang} contact={settings?.contact} />
        )}

        {/* ---- Body ----
             Precedence: an admin-authored rich-text override (sanitized) wins;
             otherwise the built-in static sections render (so every policy page
             ships with clear, complete copy by default); the editable
             "coming soon" block appears only when a slug has neither. */}
        {cmsHtml ? (
          <div
            className="info-prose mt-10 text-start"
            dir={lang === "ar" ? "rtl" : "ltr"}
            // Sanitized above via sanitizeHtml() (tag/attr allow-list).
            dangerouslySetInnerHTML={{ __html: cmsHtml }}
          />
        ) : sections.length > 0 ? (
          <div className="mt-10 flex flex-col gap-8">
            {sections.map((s, i) => (
              <section key={i} className="text-start">
                <h2 className="font-display text-lg font-600 text-textPrimary">
                  {s.heading}
                </h2>
                <SectionBody body={s.body} />
              </section>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-surface/60 p-8 text-center shadow-elevated backdrop-blur">
            <span className="grid mx-auto h-12 w-12 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
              <Info className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-5 font-display text-lg font-700 text-textPrimary">
              {soon.title}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-textSecondary">
              {soon.body}
            </p>
            <Link
              to="/contact"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 font-display text-sm font-600 text-textPrimary transition-all duration-200 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
              {tx.contactCta}
            </Link>
          </div>
        )}

        {/* ---- Footer CTAs ---- */}
        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-8 sm:flex-row sm:items-center">
          <Link
            to="/#catalog"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-display text-sm font-600 text-bg shadow-glow transition-all duration-300 hover:bg-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            {tx.browseCatalog}
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100"
              aria-hidden="true"
            />
          </Link>
          {!entry.isContact && (
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 font-display text-sm font-600 text-textPrimary transition-all duration-200 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
              {tx.contactCta}
            </Link>
          )}
        </div>
      </div>

      {/* Prose styling for admin-authored rich text — scoped to .info-prose so
          it never leaks. Uses the Midnight-Tachometer semantic tokens (via the
          CSS custom properties) so it adapts to light/dark automatically and is
          RTL-aware (logical margins). */}
      <style>{`
        .info-prose { color: rgb(var(--text-secondary)); font-size: 0.95rem; line-height: 1.75; }
        .info-prose > :first-child { margin-top: 0; }
        .info-prose p { margin: 0 0 1rem; }
        .info-prose h1, .info-prose h2, .info-prose h3, .info-prose h4 {
          color: rgb(var(--text-primary));
          font-family: var(--font-display, inherit);
          font-weight: 700;
          line-height: 1.3;
          margin: 1.75rem 0 0.75rem;
        }
        .info-prose h1 { font-size: 1.6rem; }
        .info-prose h2 { font-size: 1.25rem; }
        .info-prose h3 { font-size: 1.1rem; }
        .info-prose strong, .info-prose b { color: rgb(var(--text-primary)); font-weight: 700; }
        .info-prose a {
          color: rgb(var(--primary));
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .info-prose a:hover { color: rgb(var(--primary-hover)); }
        .info-prose ul, .info-prose ol { margin: 0 0 1rem; padding-inline-start: 1.5rem; }
        .info-prose ul { list-style: disc; }
        .info-prose ol { list-style: decimal; }
        .info-prose li { margin: 0.35rem 0; }
        .info-prose blockquote {
          margin: 1rem 0;
          padding-inline-start: 1rem;
          border-inline-start: 3px solid rgb(var(--primary) / 0.6);
          color: rgb(var(--text-muted));
          font-style: italic;
        }
        .info-prose hr { margin: 1.75rem 0; border: 0; border-top: 1px solid rgb(var(--border)); }
        .info-prose code {
          font-family: var(--font-mono, monospace);
          font-size: 0.85em;
          background: rgb(var(--surface-elevated));
          border: 1px solid rgb(var(--border));
          border-radius: 0.375rem;
          padding: 0.1rem 0.35rem;
        }
        .info-prose pre {
          background: rgb(var(--surface-elevated));
          border: 1px solid rgb(var(--border));
          border-radius: 0.75rem;
          padding: 1rem;
          overflow-x: auto;
          margin: 0 0 1rem;
        }
        .info-prose pre code { background: none; border: 0; padding: 0; }
      `}</style>
    </main>
  );
}
