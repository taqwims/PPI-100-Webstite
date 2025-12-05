import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CardGlass from '../components/ui/glass/CardGlass';
import InputGlass from '../components/ui/glass/InputGlass';
import ButtonGlass from '../components/ui/glass/ButtonGlass';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import api from '../services/api';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.post('/auth/login', { email, password });
            login(response.data.token);
            navigate('/dashboard');
        } catch (err) {
            setError('Invalid email or password');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px]" />

            <CardGlass className="w-full max-w-md relative z-10 backdrop-blur-2xl bg-black/40 border-white/10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-slate-900 font-bold text-3xl shadow-lg shadow-purple-500/30 mb-6">
                        P
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h1>
                    <p className="text-slate-300-400">Sign in to access your dashboard</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300-400" size={20} />
                            <InputGlass
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-12"
                                required
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300-400" size={20} />
                            <InputGlass
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-12"
                                required
                            />
                        </div>
                    </div>

                    <ButtonGlass type="submit" className="w-full py-3 text-lg group">
                        Sign In <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </ButtonGlass>
                </form>

                <div className="mt-8 text-center text-sm text-slate-300-500">
                    <p>Don't have an account? Contact Administrator</p>
                </div>
            </CardGlass>
        </div>
    );
};

export default Login;
