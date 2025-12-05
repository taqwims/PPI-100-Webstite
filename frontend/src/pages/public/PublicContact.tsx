import React from 'react';
import CardGlass from '../../components/ui/glass/CardGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import { MapPin, Phone, Mail, Send, Clock } from 'lucide-react';
import api from '../../services/api';
import { useMutation } from '@tanstack/react-query';

const PublicContact: React.FC = () => {
    const { mutate: submitContact, isPending } = useMutation({
        mutationFn: async (data: any) => {
            return await api.post('/public/contact', data);
        },
        onSuccess: () => {
            alert('Pesan Anda telah terkirim! Terima kasih telah menghubungi kami.');
        },
        onError: (error: any) => {
            alert(error.response?.data?.error || 'Gagal mengirim pesan.');
        }
    });

    return (
        <div className="space-y-20 pb-24">
            {/* Hero Section */}
            <section className="relative pt-32 pb-10 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                    <div className="absolute top-20 right-20 w-72 h-72 bg-purple-600/20 rounded-full blur-[100px] animate-pulse" />
                </div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <h1 className="text-5xl lg:text-7xl font-bold mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                        <span className="text-white">Hubungi</span> <br />
                        <span className="text-gradient-primary">Kami</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                        Kami siap membantu menjawab pertanyaan Anda seputar Pesantren Persis 100 Banjar­sari.
                    </p>
                </div>
            </section>

            {/* Contact Info & Form */}
            <section className="container mx-auto px-6">
                <div className="grid lg:grid-cols-2 gap-12">
                    {/* Info */}
                    <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
                        <CardGlass className="p-8 space-y-6">
                            <h3 className="text-2xl font-bold text-white">Informasi Kontak</h3>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-white/5 rounded-xl text-purple-400">
                                        <MapPin size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white mb-1">Alamat</h4>
                                        <p className="text-gray-400 leading-relaxed">
                                            Jl. Raya Banjarsari No. 100,<br />
                                            Kec. Banjarsari, Kab. Ciamis,<br />
                                            Jawa Barat 46383
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-white/5 rounded-xl text-purple-400">
                                        <Phone size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white mb-1">Telepon / WhatsApp</h4>
                                        <p className="text-gray-400">+62 812-3456-7890</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-white/5 rounded-xl text-purple-400">
                                        <Mail size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white mb-1">Email</h4>
                                        <p className="text-gray-400">info@ppi100banjarsari.sch.id</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-white/5 rounded-xl text-purple-400">
                                        <Clock size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white mb-1">Jam Operasional</h4>
                                        <p className="text-gray-400">Senin - Sabtu: 07.00 - 16.00 WIB</p>
                                        <p className="text-gray-400">Ahad: Libur</p>
                                    </div>
                                </div>
                            </div>
                        </CardGlass>

                        {/* Map Placeholder */}
                        <div className="h-64 rounded-3xl overflow-hidden glass-panel border border-white/10 relative">
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3956.270678685764!2d108.555!3d-7.435!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zN8KwMjYnMDYuMCJTIDEwOMKwMzMnMTguMCJF!5e0!3m2!1sen!2sid!4v1620000000000!5m2!1sen!2sid"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen
                                loading="lazy"
                                title="Map"
                                className="opacity-80 hover:opacity-100 transition-opacity"
                            />
                        </div>
                    </div>

                    {/* Form */}
                    <div className="animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
                        <CardGlass className="p-8">
                            <h3 className="text-2xl font-bold text-white mb-6">Kirim Pesan</h3>
                            <form className="space-y-6" onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const data = Object.fromEntries(formData.entries());
                                submitContact(data);
                                e.currentTarget.reset();
                            }}>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <InputGlass name="name" label="Nama Lengkap" placeholder="Nama Anda" required />
                                    <InputGlass name="email" label="Email" type="email" placeholder="email@contoh.com" required />
                                </div>
                                <InputGlass name="subject" label="Subjek" placeholder="Judul pesan" required />

                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400 font-medium ml-1">Pesan</label>
                                    <textarea
                                        name="message"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all min-h-[150px]"
                                        placeholder="Tulis pesan Anda di sini..."
                                    />
                                </div>

                                <ButtonGlass type="submit" className="w-full flex items-center justify-center gap-2 py-4" disabled={isPending}>
                                    <Send size={18} /> {isPending ? 'Mengirim...' : 'Kirim Pesan'}
                                </ButtonGlass>
                            </form>
                        </CardGlass>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default PublicContact;
