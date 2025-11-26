import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import ButtonGlass from './ButtonGlass';

const NavbarGlass: React.FC = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Profil', path: '/profile' },
        { name: 'PPDB', path: '/ppdb' },
    ];

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'py-4' : 'py-6'
                }`}
        >
            <div className="container mx-auto px-6">
                <div
                    className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl px-6 py-3 flex justify-between items-center shadow-lg transition-all duration-300 ${isScrolled ? 'bg-gray-900/60' : ''
                        }`}
                >
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-purple-500/30">
                            P
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight">PPI 100</span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`text-sm font-medium transition-colors hover:text-purple-300 ${location.pathname === link.path ? 'text-white' : 'text-gray-300'
                                    }`}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    {/* Auth Button */}
                    <div className="hidden md:block">
                        <Link to="/login">
                            <ButtonGlass variant="primary" className="px-6 py-2 text-sm">
                                Login SIS
                            </ButtonGlass>
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden text-white p-2"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isOpen && (
                    <div className="md:hidden mt-4 backdrop-blur-xl bg-gray-900/90 border border-white/10 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-5">
                        <div className="flex flex-col gap-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`text-lg font-medium ${location.pathname === link.path ? 'text-purple-400' : 'text-gray-300'
                                        }`}
                                    onClick={() => setIsOpen(false)}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <hr className="border-white/10 my-2" />
                            <Link to="/login" onClick={() => setIsOpen(false)}>
                                <ButtonGlass className="w-full">Login SIS</ButtonGlass>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default NavbarGlass;
