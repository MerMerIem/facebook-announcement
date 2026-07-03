import { SocialIcon } from 'react-social-icons';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer
            dir="rtl"
            className="bg-zinc-900 border-t border-zinc-800 pt-14 pb-6 px-6 md:px-24 lg:px-64 text-zinc-300"
        >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-10">
                {/* Brand Section */}
                <div className="md:col-span-5 space-y-4">
                    <div className="flex items-center gap-3">
                        <img
                            src="/logo.jpg"
                            alt="سكار لمواد البناء"
                            className="h-12 w-auto cursor-pointer"
                            onClick={() => (window.location.href = '/')}
                        />
                        <h2 className="text-xl font-bold text-primary!">
                            سكار لمواد البناء
                        </h2>
                    </div>
                    <p className="max-w-xs text-md leading-snug text-stone-100">
                        متجر متخصص في توفير أحدث الأدوات الكهربائية والمواد
                        البنائية بأفضل الأسعار وأعلى جودة.
                    </p>

                    {/* Social Media */}
                    <div>
                        <h3 className="text-[11px] font-bold tracking-[0.25em] uppercase text-primary! mb-3">
                            تابعنا على
                        </h3>
                        <div className="flex gap-4">
                            <SocialIcon
                                url="https://www.youtube.com"
                                target="_blank"
                                rel="noreferrer"
                                bgColor="#27272a"
                                fgColor="#f5f5f4"
                                className="hover:scale-110 transition-transform"
                                style={{ height: 35, width: 35 }}
                            />
                            <SocialIcon
                                url="https://www.instagram.com"
                                target="_blank"
                                rel="noreferrer"
                                bgColor="#27272a"
                                fgColor="#f5f5f4"
                                className="hover:scale-110 transition-transform"
                                style={{ height: 35, width: 35 }}
                            />
                            <SocialIcon
                                url="https://www.twitter.com"
                                target="_blank"
                                rel="noreferrer"
                                bgColor="#27272a"
                                fgColor="#f5f5f4"
                                className="hover:scale-110 transition-transform"
                                style={{ height: 35, width: 35 }}
                            />
                            <SocialIcon
                                url="https://www.facebook.com"
                                target="_blank"
                                rel="noreferrer"
                                bgColor="#27272a"
                                fgColor="#f5f5f4"
                                className="hover:scale-110 transition-transform"
                                style={{ height: 35, width: 35 }}
                            />
                        </div>
                    </div>
                </div>

                {/* Informations */}
                <div className="md:col-span-3 space-y-3">
                    <h3 className="text-xl font-medium tracking-[0.25em] uppercase text-primary!">
                        معلومات
                    </h3>
                    <ul className="space-y-1 text-md font-medium text-stone-100!">
                        <li>
                            <a
                                href="/a-propos"
                                className="hover:text-primary transition-colors"
                            >
                                من نحن
                            </a>
                        </li>
                        <li>
                            <a
                                href="/contact"
                                className="hover:text-primary transition-colors"
                            >
                                اتصل بنا
                            </a>
                        </li>
                        <li>
                            <a
                                href="/conditions"
                                className="hover:text-primary transition-colors"
                            >
                                الشروط والأحكام
                            </a>
                        </li>
                        <li>
                            <a
                                href="/confidentialite"
                                className="hover:text-primary transition-colors"
                            >
                                سياسة الخصوصية
                            </a>
                        </li>
                    </ul>
                </div>

                {/* Service Client */}
                <div className="md:col-span-4 space-y-3">
                    <h3 className="text-xl font-medium tracking-[0.25em] uppercase text-primary!">
                        خدمة العملاء
                    </h3>
                    <ul className="space-y-1 text-md font-light text-stone-100!">
                        <li>
                            <a
                                href="/faq"
                                className="hover:text-primary! text-stone-100! transition-colors"
                            >
                                الأسئلة الشائعة
                            </a>
                        </li>
                        <li>
                            <a
                                href="/retours"
                                className="hover:text-primary! text-stone-100! transition-colors"
                            >
                                سياسة الإرجاع
                            </a>
                        </li>
                        <li>
                            <a
                                href="/suivi-commande"
                                className="hover:text-primary! text-stone-100! transition-colors"
                            >
                                تتبع الطلب
                            </a>
                        </li>
                        <li>
                            <a
                                href="/guide-tailles"
                                className="hover:text-primary! text-stone-100! transition-colors"
                            >
                                دليل المقاسات
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-6 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-center text-[10px] tracking-widest uppercase text-zinc-400 font-medium">
                <p>© {currentYear} سكار لمواد البناء. جميع الحقوق محفوظة.</p>
                <p className="mt-2 md:mt-0">
                    الجزائر — توصيل سريع لجميع الولايات
                </p>
            </div>
        </footer>
    );
};

export default Footer;
