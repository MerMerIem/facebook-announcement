import { useState } from "react";
import { ProductCard } from "../components/ProductCard";
import { OrderForm } from "@/components/OrderForm";
import item1 from "@/assets/item1.jpg";
import item2 from "@/assets/item2.jpg";
import item3 from "@/assets/item3.jpg";
import item4 from "@/assets/item4.jpg";
import item6 from "@/assets/item6.jpg";
import item7 from "@/assets/item7.jpg";
import item9 from "@/assets/item9.jpg";
import item10 from "@/assets/item10.jpg";
import item11 from "@/assets/item11.jpg";
import item12 from "@/assets/item12.jpg";

// --- Data -------------------------------------------------------------
const products = [
  {
    id: 1,
    name: "جهاز إنذار دخان لاسلكي بشاشة رقمية",
    price: 1500,
    image: item1,
    description:
      "جهاز إنذار مزوّد بشاشة لعرض مستوى أول أكسيد الكربون أو الدخان، يُستخدم للسلامة المنزلية.",
  },
  {
    id: 2,
    name: "صمام نحاسي",
    price: 1000,
    image: item2,
    description:
      "صمام ميكانيكي يُستخدم غالبًا في الأنظمة الهيدروليكية أو أنظمة المياه للتحكم في التدفق.",
  },
  {
    id: 3,
    name: "أداة صنفرة كهربائية دوّارة",
    price: 3000,
    image: item3,
    description:
      "أداة كهربائية تُستخدم لتلميع أو صنفرة الأسطح، تُستخدم في الأعمال الصناعية أو المنزلية.",
  },
  {
    id: 4,
    name: "ضاغط هواء صناعي",
    price: 5000,
    image: item4,
    description:
      "جهاز يُستخدم لضغط الهواء لتشغيل أدوات مثل المفكات الهوائية أو معدات التنظيف.",
  },
  {
    id:5,
    name: "مجموعات قواعد مانعة للاهتزاز للغسالات",
    price: 300,
    image: item6,
    description:
      "قطع مطاطية تُوضع تحت الأجهزة مثل الغسالات لتقليل الضجيج والاهتزاز. ",
  },
  {
    id: 6,
    name: "خزانات مياه بلاستيكية",
    price: 10000,
    image: item7,
    description:
      "خزانات تُستخدم لتخزين مياه الشرب أو مياه الاستخدام اليومي، غالبًا تُوضع خارج المنازل أو المباني. ",
  },
  {
    id: 7,
    name: "فرش تنظيف",
    price: 400,
    image: item9,
    description:
      "مجموعة من الفرش القوية تُركب على المثقاب الكهربائي وتُستخدم لتنظيف الأرضيات أو الأسطح الصلبة. ",
  },{
    id: 10,
    name: "قضبان ستائر",
    price: 2000,
    image: item10,
    description:
      "قضبان معدنية للستائر قابلة للتعديل حسب الطول المطلوب (من 110 سم إلى 310 سم)، تتميز بتصميم زخرفي أنيق وتُثبت بسهولة على الحائط.",
  },
  {
    id: 11,
    name: "سخان ماء",
    price: 4000,
    image: item11,
    description:
      "سخان ماء يعمل بالغاز، يتميز بالكفاءة العالية في تسخين المياه بسرعة وبشكل مستمر .مزود بنظام تحكم يدوي بدرجة الحرارة وتدفق الماء. تصميم أنيق وسهل التركيب. ",
  },
  {
    id: 12,
    name: "عربة يدوية",
    price: 1800,
    image: item12,
    description:
      "عربة يدوية متينة تُستخدم لنقل المواد في مواقع البناء أو الحدائق. مصنوعة من معدن قوي ومزودة بعجلة مطاطية لتسهيل الحركة على مختلف الأسطح.",
  },
];

// --- Component --------------------------------------------------------
function Index() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);

  const handleBuyNow = (product) => {
    setSelectedProduct(product);
    setIsOrderFormOpen(true);
  };

  const handleCloseOrderForm = () => {
    setIsOrderFormOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-border/50">
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-primary bg-clip-text text-transparent mb-4">
            Sekkar quincaillerie
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          اكتشف مجموعتنا المختارة بعناية من المنتجات التقنية. كل منتج تم اختياره بعناية من حيث الجودة، والأداء، والأسلوب.
          </p>
        </div>
      </header>

      {/* Products Grid */}
      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onBuyNow={handleBuyNow} />
          ))}
        </div>
      </main>

      {/* Order Form Modal */}
      <OrderForm
        product={selectedProduct}
        isOpen={isOrderFormOpen}
        onClose={handleCloseOrderForm}
      />

      {/* Footer */}
      <footer className="bg-card border-t border-border/50 mt-16">
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">
            ©2025 Sekkar Quincaillerie. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Index;
