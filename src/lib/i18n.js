/* ---------------------------------------------------------------------------
   AL-MEYAR shared i18n foundation.

   ONLY the Language/foundation layer writes this file. Component agents IMPORT
   from here; they never edit it. Per project convention, each component carries
   its OWN local STRINGS = { en:{...}, ar:{...} } object for its copy — keep
   component-specific copy OUT of this file. This module holds only the two
   globally shared dictionaries below.
--------------------------------------------------------------------------- */

/**
 * Canonical category labels. Keys are the EXACT canonical category strings used
 * as product.category, CatalogContext.category and explorer system targets.
 * "All" is the default sentinel. Every key has both en + ar translations.
 */
export const CATEGORY_LABELS = {
  All: { en: "All", ar: "الكل" },
  Braking: { en: "Braking", ar: "المكابح" },
  Suspension: { en: "Suspension", ar: "نظام التعليق" },
  Engine: { en: "Engine", ar: "المحرك" },
  Filtration: { en: "Filtration", ar: "الفلاتر" },
  Electrical: { en: "Electrical", ar: "الكهرباء" },
  Lighting: { en: "Lighting", ar: "الإضاءة" },
  Drivetrain: { en: "Drivetrain", ar: "نقل الحركة" },
  Exhaust: { en: "Exhaust", ar: "العادم" },
  Cooling: { en: "Cooling", ar: "نظام التبريد" },
  Tires: { en: "Tires", ar: "الإطارات" },
};

/**
 * Small shared dictionary for globally reused chrome words (currency labels,
 * common buttons, etc.). Select with: const t = COMMON[lang].
 */
export const COMMON = {
  en: {
    // currency
    sar: "SAR",
    usd: "USD",
    currency: "Currency",
    // primary actions
    addToCart: "Add to Cart",
    addedToCart: "Added to Cart",
    viewDetails: "View Details",
    viewCart: "View Cart",
    shopNow: "Shop Now",
    buyNow: "Buy Now",
    checkout: "Checkout",
    // generic chrome
    close: "Close",
    cancel: "Cancel",
    save: "Save",
    search: "Search",
    loading: "Loading",
    quantity: "Quantity",
    each: "each",
    // status
    inStock: "In Stock",
    outOfStock: "Out of Stock",
    lowStock: "Low Stock",
    free: "Free",
    new: "New",
    sale: "Sale",
    off: "OFF",
    // social proof
    reviews: "reviews",
    rating: "Rating",
    verified: "Verified",
  },
  ar: {
    // currency
    sar: "ريال",
    usd: "دولار",
    currency: "العملة",
    // primary actions
    addToCart: "أضف إلى السلة",
    addedToCart: "أُضيف إلى السلة",
    viewDetails: "عرض التفاصيل",
    viewCart: "عرض السلة",
    shopNow: "تسوّق الآن",
    buyNow: "اشترِ الآن",
    checkout: "إتمام الشراء",
    // generic chrome
    close: "إغلاق",
    cancel: "إلغاء",
    save: "حفظ",
    search: "بحث",
    loading: "جارٍ التحميل",
    quantity: "الكمية",
    each: "للقطعة",
    // status
    inStock: "متوفر",
    outOfStock: "غير متوفر",
    lowStock: "كمية محدودة",
    free: "مجاني",
    new: "جديد",
    sale: "تخفيض",
    off: "خصم",
    // social proof
    reviews: "تقييم",
    rating: "التقييم",
    verified: "موثّق",
  },
};
