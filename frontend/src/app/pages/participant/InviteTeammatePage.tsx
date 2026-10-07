import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Send, UserPlus, Briefcase, Mail, MessageSquare, ArrowLeft, CheckCircle2, Rocket, Code2, Wrench, Palette, Megaphone, TrendingUp, Sparkles } from 'lucide-react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { Button } from '../../components/common/Button';

const roles = [
    { value: 'Co-Founder', label: 'Co-Founder', icon: Rocket },
    { value: 'CTO', label: 'CTO', icon: Code2 },
    { value: 'Developer', label: 'Developer', icon: Wrench },
    { value: 'Designer', label: 'Designer', icon: Palette },
    { value: 'Marketing', label: 'Marketing', icon: Megaphone },
    { value: 'Business', label: 'Business', icon: TrendingUp },
    { value: 'Other', label: 'Other', icon: Sparkles },
];

export function InviteTeammatePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        email: '',
        role: '',
        message: '',
    });
    const profileName = localStorage.getItem('userName') || 'Founder';

    const handleChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.email || !form.role) {
            toast.error('Please enter an email and select a role.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email)) {
            toast.error('Please enter a valid email address.');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.inviteTeammate(id!, form.email, form.role, form.message);
            toast.success(`Invitation sent to ${form.email}`);
            navigate(`/my-startups/${id}`);
        } catch (error: any) {
            toast.error(error.message || 'Failed to send invitation');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen relative bg-brand-navy text-foreground">
            <ParticleBackground />
            <DashboardHeader activeTab="my-startups" profileName={profileName} />

            <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <button 
                        onClick={() => navigate(-1)} 
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-500 transition-colors mb-8 group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
                        Back
                    </button>

                    <div className="mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                            Grow Your Team
                        </h1>
                        <p className="text-muted-foreground text-lg">Send a formal invitation to a potential teammate to join your startup.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Email Card */}
                            <section className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                                        <Mail className="text-cyan-500" size={20} />
                                    </div>
                                    <h2 className="text-xl font-bold">Invitee Details</h2>
                                </div>
                                
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                            <input
                                                type="email"
                                                value={form.email}
                                                onChange={e => handleChange('email', e.target.value)}
                                                placeholder="colleague@example.com"
                                                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/5 transition-all text-lg"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Personal Message (Optional)</label>
                                        <div className="relative">
                                            <MessageSquare className="absolute left-4 top-4 text-muted-foreground" size={18} />
                                            <textarea
                                                value={form.message}
                                                onChange={e => handleChange('message', e.target.value)}
                                                placeholder="Explain why they should join your mission..."
                                                rows={5}
                                                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/5 transition-all resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Submit Button (Desktop) */}
                            <div className="hidden lg:block">
                                <Button 
                                    type="submit" 
                                    disabled={isSubmitting || !form.email || !form.role}
                                    className="w-full h-16 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 border-none text-white text-lg font-bold shadow-xl shadow-cyan-500/20"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" size={20} />}
                                    Send Team Invitation
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Role Selection */}
                            <section className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                        <Briefcase className="text-purple-500" size={20} />
                                    </div>
                                    <h2 className="text-xl font-bold">Assign Role</h2>
                                </div>
                                
                                <div className="space-y-3">
                                    {roles.map(r => (
                                        <button
                                            key={r.value}
                                            type="button"
                                            onClick={() => handleChange('role', r.value)}
                                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${
                                                form.role === r.value
                                                    ? 'bg-purple-500/20 border-purple-500/40 text-white'
                                                    : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/10'
                                            }`}
                                        >
                                            <r.icon size={20} className="flex-shrink-0" />
                                            <span className="font-medium flex-1">{r.label}</span>
                                            {form.role === r.value && <CheckCircle2 size={18} className="text-purple-400" />}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Mobile Submit */}
                            <div className="lg:hidden">
                                <Button 
                                    type="submit" 
                                    disabled={isSubmitting || !form.email || !form.role}
                                    className="w-full h-16 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 border-none text-white text-lg font-bold"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" size={20} />}
                                    Send Invitation
                                </Button>
                            </div>
                        </div>
                    </form>
                </motion.div>
            </main>
        </div>
    );
}

function Loader2({ className, size = 18 }: { className?: string, size?: number }) {
    return <div className={`border-2 border-white/30 border-t-white rounded-full animate-spin ${className}`} style={{ width: size, height: size }} />;
}
