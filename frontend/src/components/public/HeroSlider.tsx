import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFeatureStore } from '../../store/featureStore';

const defaultSlides = [
    {
        id: 1,
        image: '/images/slider_1.png',
        title: 'Generasi Qur\'ani',
        subtitle: 'Mencetak kader ulama dan pemimpin masa depan yang berakhlak mulia, cerdas, dan berwawasan global.',
        cta: 'Daftar Sekarang',
        link: '/ppdb'
    },
    {
        id: 2,
        image: '/images/slider_2.png',
        title: 'Lingkungan Islami',
        subtitle: 'Suasana pesantren yang kondusif untuk ibadah dan belajar dengan fasilitas masjid yang megah.',
        cta: 'Lihat Profil',
        link: '/profile'
    },
    {
        id: 3,
        image: '/images/slider_3.png',
        title: 'Ekstrakurikuler Unggulan',
        subtitle: 'Mengembangkan minat dan bakat santri melalui berbagai kegiatan positif dan berprestasi.',
        cta: 'Kegiatan Kami',
        link: '/profile'
    }
];

const HeroSlider: React.FC = () => {
    const { school } = useFeatureStore();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

    const slides = useMemo(() => {
        return [
            {
                id: 1,
                image: (!imgErrors[0] && school.landing_slide_1_image) ? school.landing_slide_1_image : defaultSlides[0].image,
                title: school.landing_slide_1_title || school.landing_hero_title || defaultSlides[0].title,
                subtitle: school.landing_slide_1_subtitle || school.landing_hero_subtitle || defaultSlides[0].subtitle,
                cta: school.landing_slide_1_cta || defaultSlides[0].cta,
                link: school.landing_slide_1_link || defaultSlides[0].link
            },
            {
                id: 2,
                image: (!imgErrors[1] && school.landing_slide_2_image) ? school.landing_slide_2_image : defaultSlides[1].image,
                title: school.landing_slide_2_title || defaultSlides[1].title,
                subtitle: school.landing_slide_2_subtitle || defaultSlides[1].subtitle,
                cta: school.landing_slide_2_cta || defaultSlides[1].cta,
                link: school.landing_slide_2_link || defaultSlides[1].link
            },
            {
                id: 3,
                image: (!imgErrors[2] && school.landing_slide_3_image) ? school.landing_slide_3_image : defaultSlides[2].image,
                title: school.landing_slide_3_title || defaultSlides[2].title,
                subtitle: school.landing_slide_3_subtitle || defaultSlides[2].subtitle,
                cta: school.landing_slide_3_cta || defaultSlides[2].cta,
                link: school.landing_slide_3_link || defaultSlides[2].link
            }
        ];
    }, [school, imgErrors]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % slides.length);
        }, 6000);
        return () => clearInterval(timer);
    }, [slides.length]);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    };

    const handleImageError = (index: number) => {
        setImgErrors(prev => ({ ...prev, [index]: true }));
    };

    const activeSlide = slides[currentIndex] || slides[0];

    return (
        <div className="relative h-screen w-full overflow-hidden bg-slate-950">
            <AnimatePresence initial={false} mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 1.08 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute inset-0"
                >
                    {/* Lazy-loaded optimized slide image with error fallback */}
                    <img
                        src={activeSlide.image}
                        alt={activeSlide.title}
                        loading={currentIndex === 0 ? "eager" : "lazy"}
                        decoding="async"
                        onError={() => handleImageError(currentIndex)}
                        className="absolute inset-0 w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/60 to-slate-950/30" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
                </motion.div>
            </AnimatePresence>

            <div className="absolute inset-0 flex items-center z-10">
                <div className="container mx-auto px-6">
                    <div className="max-w-2xl space-y-8">
                        <motion.div
                            key={`text-${currentIndex}`}
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25, duration: 0.5 }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-6">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-xs sm:text-sm font-semibold text-emerald-300 tracking-wider uppercase">
                                    {school.name || 'Penerimaan Santri Baru'}
                                </span>
                            </div>

                            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 tracking-tight drop-shadow-md">
                                {activeSlide.title}
                            </h1>
                            <p className="text-lg sm:text-xl text-slate-200 leading-relaxed mb-8 max-w-xl font-normal drop-shadow">
                                {activeSlide.subtitle}
                            </p>

                            <div className="flex flex-wrap gap-4">
                                <Link to={activeSlide.link || '/ppdb'}>
                                    <button className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2 group">
                                        <span>{activeSlide.cta || 'Daftar Sekarang'}</span>
                                        <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                                    </button>
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className="absolute bottom-10 right-10 flex gap-3 z-20">
                <button
                    onClick={prevSlide}
                    aria-label="Slide Sebelumnya"
                    className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95"
                >
                    <ChevronLeft size={22} />
                </button>
                <button
                    onClick={nextSlide}
                    aria-label="Slide Selanjutnya"
                    className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95"
                >
                    <ChevronRight size={22} />
                </button>
            </div>

            {/* Indicators */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2.5 z-20">
                {slides.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        aria-label={`Ke slide ${idx + 1}`}
                        className={`h-2.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-emerald-500 w-9 shadow-lg shadow-emerald-500/50' : 'bg-white/30 hover:bg-white/50 w-2.5'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};

export default HeroSlider;
