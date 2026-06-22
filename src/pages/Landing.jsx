import Hero from "../components/Hero";
import SocialProof from "../components/SocialProof";
import GarageSelector from "../components/GarageSelector";
import VisualCategoryBar from "../components/VisualCategoryBar";
import ProductGrid from "../components/ProductGrid";
import { useLang } from "../context/LanguageContext";
import { useDocumentMeta } from "../hooks/useDocumentMeta";

/**
 * Landing — the public storefront home page.
 *
 * Renders the landing sections in order inside the persistent
 * <StorefrontLayout> <Outlet/>. Hash navigation (#catalog / #garage) is
 * handled by <ScrollToHash/> in the layout, so these sections only need to
 * expose their existing anchor ids (GarageSelector → #garage,
 * ProductGrid → #catalog). The 3D VehicleExplorer has been removed.
 */
const META = {
  en: {
    title: "The Standard in Auto Parts",
    description:
      "Verified-fit, OEM-grade auto parts shipped across the GCC. Build your garage, confirm fitment by part number, and track every order live.",
  },
  ar: {
    title: "قطع غيار بمعايير الوكالة",
    description:
      "قطع غيار موثّقة التوافق وبمستوى الوكالة تُشحَن في جميع أنحاء الخليج. أنشئ مرآبك، وتحقّق من التوافق برقم القطعة، وتتبّع كل طلب مباشرةً.",
  },
};

export default function Landing() {
  const { lang } = useLang();
  const m = META[lang] || META.en;
  useDocumentMeta({ title: m.title, description: m.description });

  return (
    <>
      <Hero />
      <SocialProof />
      <GarageSelector />
      <VisualCategoryBar />
      <ProductGrid />
    </>
  );
}
