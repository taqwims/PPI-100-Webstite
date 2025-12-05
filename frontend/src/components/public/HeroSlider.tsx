import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const slides = [
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
        link: '/profile' // Or a specific activities page if it existed
    }
];

const HeroSlider: React.FC = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    };

    return (
        <div className="relative h-screen w-full overflow-hidden">
            <AnimatePresence initial={false} mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7 }}
                    className="absolute inset-0"
                >
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${slides[currentIndex].image})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-transparent" />
                </motion.div>
            </AnimatePresence>

            <div className="absolute inset-0 flex items-center">
                <div className="container mx-auto px-6">
                    <div className="max-w-2xl space-y-8">
                        <motion.div
                            key={`text-${currentIndex}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-6">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-sm font-medium text-green-300 tracking-wide uppercase">Penerimaan Santri Baru 2025</span>
                            </div>

                            <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight mb-6">
                                {slides[currentIndex].title}
                            </h1>
                            <p className="text-xl text-slate-200 leading-relaxed mb-8">
                                {slides[currentIndex].subtitle}
                            </p>

                            <div className="flex flex-wrap gap-4">
                                <Link to={slides[currentIndex].link}>
                                    <button className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-all flex items-center gap-2 group">
                                        {slides[currentIndex].cta}
                                        <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className="absolute bottom-10 right-10 flex gap-4 z-20">
                <button
                    onClick={prevSlide}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all"
                >
                    <ChevronLeft size={24} />
                </button>
                <button
                    onClick={nextSlide}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all"
                >
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Indicators */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {slides.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-3 h-3 rounded-full transition-all ${idx === currentIndex ? 'bg-green-500 w-8' : 'bg-white/30 hover:bg-white/50'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};

export default HeroSlider;
