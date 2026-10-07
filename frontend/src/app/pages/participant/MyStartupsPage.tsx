import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Rocket, Plus, ArrowRight, Target, Users, Layout, Globe, Search, Loader2 } from 'lucide-react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api';

export function MyStartupsPage() {
    const navigate = useNavigate();
    const [startups, setStartups] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const profileName = localStorage.getItem('userName') || 'Founder';

    useEffect(() => {
        const fetchStartups = async () => {
            try {
                const data = await api.getMyStartups();
                setStartups(data);
            } catch (error) {
                console.error('Failed to fetch startups', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStartups();
    }, []);

    const filteredStartups = startups.filter(s => 
        s.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.businessSector?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen relative">
            <ParticleBackground />
            <DashboardHeader activeTab="my-startups" profileName={profileName} />

            <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
                {/* Hero Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h1 className="text-4xl md:text-5xl font-bold mb-3 flex items-center gap-4">
                            <Rocket className="text-cyan-500" size={40} />
                            My Startups
                        </h1>
                        <p className="text-muted-foreground text-lg">Manage your entrepreneurial journey and team collaborations.</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-4"
                    >
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-cyan-500 transition-colors" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search startups..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-11 pr-6 py-3 bg-card/50 backdrop-blur-xl border border-border rounded-full outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all w-full md:w-64"
                            />
                        </div>
                        <Button 
                            onClick={() => navigate('/startup/create')}
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 border-none px-6 rounded-full shadow-lg shadow-cyan-500/20"
                        >
                            <Plus size={18} className="mr-2" />
                            New Startup
                        </Button>
                    </motion.div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="animate-spin text-cyan-500" size={48} />
                        <p className="text-muted-foreground animate-pulse">Loading your startups...</p>
                    </div>
                ) : filteredStartups.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card/50 backdrop-blur-xl border border-dashed border-border rounded-3xl p-16 text-center max-w-2xl mx-auto"
                    >
                        <div className="w-20 h-20 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Layout className="text-muted-foreground" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold mb-3">No startups found</h2>
                        <p className="text-muted-foreground mb-8">You haven't registered any startups yet. Start your journey today!</p>
                        <Button 
                            onClick={() => navigate('/startup/create')}
                            variant="outline"
                            className="rounded-full px-8"
                        >
                            Create your first startup
                        </Button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredStartups.map((startup, index) => (
                            <motion.div
                                key={startup.startupId}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ y: -8 }}
                                className="group relative bg-card/80 backdrop-blur-2xl border border-border rounded-3xl overflow-hidden hover:border-cyan-500/30 transition-all cursor-pointer shadow-xl shadow-black/5"
                                onClick={() => navigate(`/my-startups/${startup.startupId}`)}
                            >
                                {/* Card Header / Logo */}
                                <div className="h-32 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-grid-white/5" />
                                    <div className="absolute bottom-0 left-0 p-6 flex items-end gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-2xl border border-white/20 z-10">
                                            {startup.companyLogoUrl ? (
                                                <img src={startup.companyLogoUrl} alt={startup.projectName} className="w-full h-full object-contain p-2" />
                                            ) : (
                                                <Rocket className="text-cyan-500" size={32} />
                                            )}
                                        </div>
                                    </div>
                                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider z-10 ${
                                        startup.startupStatus === 'ACTIVE' 
                                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                    }`}>
                                        {startup.startupStatus || 'Draft'}
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-8">
                                    <h3 className="text-2xl font-bold mb-2 group-hover:text-cyan-500 transition-colors">{startup.projectName}</h3>
                                    <p className="text-muted-foreground text-sm line-clamp-2 mb-6">
                                        {startup.companyTagline || startup.rawDescription || "No description provided yet."}
                                    </p>

                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Target size={16} className="text-purple-500" />
                                            <span>{startup.businessSector || "General"}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Users size={16} className="text-blue-500" />
                                            <span>{startup.currentTeamSize || 1} Members</span>
                                        </div>
                                    </div>

                                    {/* Stats / Progress */}
                                    <div className="space-y-4 pt-6 border-t border-border/50">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-muted-foreground font-medium uppercase tracking-wider">Overall Progress</span>
                                            <span className="text-foreground font-bold">{startup.overallProgressPct || 0}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${startup.overallProgressPct || 0}%` }}
                                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-8 flex items-center justify-between">
                                        {startup.companyWebsiteUrl ? (
                                            <a 
                                                href={startup.companyWebsiteUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-xs text-muted-foreground hover:text-cyan-500 flex items-center gap-1.5 transition-colors"
                                            >
                                                <Globe size={14} />
                                                Website
                                            </a>
                                        ) : <div />}
                                        <div className="flex items-center gap-1 text-cyan-500 font-bold text-sm">
                                            Manage 
                                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
