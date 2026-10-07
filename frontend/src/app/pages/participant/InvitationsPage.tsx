import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Mail, Rocket, Check, X, Clock, ArrowRight, 
    ShieldCheck, UserPlus, Info, Loader2, Sparkles 
} from 'lucide-react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { Button } from '../../components/common/Button';
import { toast } from 'sonner';
import { api } from '../../services/api';

export function InvitationsPage() {
    const navigate = useNavigate();
    const [invitations, setInvitations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const profileName = localStorage.getItem('userName') || 'User';

    useEffect(() => {
        fetchInvitations();
    }, []);

    const fetchInvitations = async () => {
        try {
            const data = await api.getMyTeamInvitations();
            // Filter to only show PENDING ones
            setInvitations(data.filter((inv: any) => inv.status === 'PENDING'));
        } catch (error) {
            console.error('Failed to fetch invitations', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResponse = async (id: string, accept: boolean) => {
        setProcessingId(id);
        try {
            await api.respondToTeamInvitation(id, accept);
            toast.success(accept ? 'Invitation accepted! Welcome to the team.' : 'Invitation declined.');
            setInvitations(prev => prev.filter(inv => inv.id !== id));
            if (accept) {
                // If accepted, maybe redirect to the startup page or dashboard
                setTimeout(() => navigate('/dashboard'), 2000);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to respond to invitation');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="min-h-screen relative bg-brand-navy">
            <ParticleBackground />
            <DashboardHeader activeTab="notifications" profileName={profileName} />

            <main className="relative z-10 max-w-5xl mx-auto px-6 py-12">
                <div className="mb-12">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center gap-4">
                            <UserPlus className="text-cyan-500" size={40} />
                            Team Invitations
                        </h1>
                        <p className="text-muted-foreground text-lg">Manage requests to join startup teams and collaborate on new ventures.</p>
                    </motion.div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="animate-spin text-cyan-500" size={48} />
                        <p className="text-muted-foreground animate-pulse">Checking for pending invitations...</p>
                    </div>
                ) : invitations.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[32px] p-20 text-center shadow-2xl"
                    >
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8">
                            <Mail className="text-muted-foreground/30" size={40} />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">No pending invitations</h2>
                        <p className="text-muted-foreground text-lg max-w-md mx-auto mb-10">
                            You're all caught up! When a startup founder invites you to join their team, it will appear here.
                        </p>
                        <Button 
                            onClick={() => navigate('/dashboard')}
                            variant="outline"
                            className="rounded-full px-10 h-14 text-base"
                        >
                            Return to Dashboard
                        </Button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 gap-8">
                        <AnimatePresence>
                            {invitations.map((inv, index) => (
                                <motion.div
                                    key={inv.id}
                                    layout
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="group bg-card/60 backdrop-blur-3xl border border-white/10 rounded-[32px] overflow-hidden hover:border-cyan-500/30 transition-all shadow-2xl"
                                >
                                    <div className="flex flex-col md:flex-row">
                                        {/* Left Side: Brand/Icon */}
                                        <div className="md:w-64 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 p-10 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-white/5">
                                            <div className="w-24 h-24 rounded-3xl bg-white shadow-2xl flex items-center justify-center mb-6 border border-white/20 transform group-hover:scale-105 transition-transform">
                                                <Rocket className="text-cyan-500" size={48} />
                                            </div>
                                            <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-4">
                                                Invitation
                                            </div>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock size={12} />
                                                {new Date(inv.invitedAt).toLocaleDateString()}
                                            </p>
                                        </div>

                                        {/* Right Side: Content */}
                                        <div className="flex-1 p-10 flex flex-col">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <Sparkles className="text-amber-500" size={20} />
                                                    <span className="text-amber-500 font-bold uppercase tracking-widest text-xs">New Opportunity</span>
                                                </div>
                                                <h3 className="text-3xl font-bold mb-2">Join as <span className="text-cyan-500">{inv.inviteeRole}</span></h3>
                                                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                                                    A founder has invited you to collaborate on their project. This is a chance to build something impactful together.
                                                </p>
                                                
                                                {inv.personalMessage && (
                                                    <div className="mb-8 p-6 rounded-2xl bg-cyan-500/5 border-l-4 border-cyan-500 italic text-foreground/90">
                                                        "{inv.personalMessage}"
                                                    </div>
                                                )}

                                                <div className="bg-white/5 rounded-2xl p-6 border border-white/5 mb-8">
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                                            <Info className="text-purple-400" size={20} />
                                                        </div>
                                                        <p className="font-bold text-lg">Details</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-6 text-sm">
                                                        <div>
                                                            <p className="text-muted-foreground mb-1 uppercase tracking-tighter font-bold text-[10px]">Invited By</p>
                                                            <p className="text-white font-medium">Founder ID: {inv.inviterUserId?.slice(0, 8)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground mb-1 uppercase tracking-tighter font-bold text-[10px]">Startup</p>
                                                            <p className="text-white font-medium">Startup Workspace #{inv.startupId?.slice(0, 8)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-white/5">
                                                <Button
                                                    onClick={() => handleResponse(inv.id, true)}
                                                    disabled={processingId === inv.id}
                                                    className="bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-2xl px-8 h-14 font-bold shadow-lg shadow-emerald-500/20 min-w-[160px]"
                                                >
                                                    {processingId === inv.id ? <Loader2 className="animate-spin" /> : <Check className="mr-2" />}
                                                    Accept Invitation
                                                </Button>
                                                <Button
                                                    onClick={() => handleResponse(inv.id, false)}
                                                    disabled={processingId === inv.id}
                                                    variant="outline"
                                                    className="border-white/10 hover:border-red-500/50 hover:bg-red-500/5 hover:text-red-500 rounded-2xl px-8 h-14 font-bold min-w-[160px]"
                                                >
                                                    <X className="mr-2" />
                                                    Decline
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </main>
        </div>
    );
}
