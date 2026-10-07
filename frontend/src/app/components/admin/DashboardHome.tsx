import { Calendar, Rocket, Users, Zap, BarChart3, TrendingUp, ArrowUpRight, Activity, DollarSign, Target, PieChart, Layers } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { toast } from 'sonner';


interface DashboardHomeProps {
    onNavigate: (section: string) => void;
}

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } },
};

/** 0 -> "$0", 950 -> "$950", 12500 -> "$12.5K", 2300000 -> "$2.3M" */
function formatMoney(value: number | null | undefined) {
    const v = Number(value) || 0;
    const trim = (n: number) => n.toFixed(1).replace(/\.0$/, '');
    if (v >= 1_000_000) return `$${trim(v / 1_000_000)}M`;
    if (v >= 1_000) return `$${trim(v / 1_000)}K`;
    return `$${Math.round(v)}`;
}

/* ─── Mini SVG Line Chart ─── */
function MiniLineChart({ data: raw, color, height = 100 }: { data: number[]; color: string; height?: number }) {
    // a line needs 2 points: a single value (or none) is drawn as a flat line
    const clean = raw.filter(v => Number.isFinite(v));
    const data = clean.length >= 2 ? clean : [clean[0] ?? 0, clean[0] ?? 0];
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const w = 100;
    const pts = data.map((v, i) => ({
        x: (i / (data.length - 1)) * w,
        y: height - ((v - min) / range) * (height - 20) - 10,
    }));
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area = `${line} L ${w} ${height} L 0 ${height} Z`;
    return (
        <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
            <defs>
                <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <motion.path d={area} fill={`url(#grad-${color.replace('#', '')})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} />
            <motion.path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3, duration: 1.2, ease: 'easeOut' }} />
            {pts.map((p, i) => (
                <motion.circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 + i * 0.08 }} />
            ))}
        </svg>
    );
}

/* ─── Mini SVG Pie Chart (Donut) ─── */
function DonutChart({ segments, size = 160 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    const r = 60;
    const cx = size / 2;
    const cy = size / 2;
    let acc = 0;
    const paths = segments.map(seg => {
        const startAngle = (acc / total) * 360 - 90;
        acc += seg.value;
        const endAngle = (acc / total) * 360 - 90;
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;
        const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
        const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
        const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
        const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);
        return { ...seg, d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`, pct: Math.round((seg.value / total) * 100) };
    });
    return (
        <div className="flex items-center gap-6">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {paths.map((p, i) => (
                    <motion.path key={i} d={p.d} fill={p.color} fillOpacity={0.85} className="stroke-background" strokeWidth="2"
                        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 + i * 0.1, type: 'spring' as const, stiffness: 200 }}
                        style={{ transformOrigin: `${cx}px ${cy}px` }} />
                ))}
                <circle cx={cx} cy={cy} r="32" className="fill-card" />
                <text x={cx} y={cy - 4} textAnchor="middle" className="fill-foreground font-bold text-sm">{total}</text>
                <text x={cx} y={cy + 10} textAnchor="middle" className="fill-muted-foreground text-[8px]">STARTUPS</text>
            </svg>
            <div className="flex flex-col gap-1.5">
                {paths.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                        <span className="text-xs text-foreground/70 w-20">{p.label}</span>
                        <span className="text-xs font-semibold tabular-nums" style={{ color: p.color }}>{p.pct}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function DashboardHome({ onNavigate }: DashboardHomeProps) {
    const navigate = useNavigate();
    const [statsData, setStatsData] = useState<any>(null);
    const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            setIsLoading(true);
            try {
                const [stats, events] = await Promise.all([
                    api.getDashboardStats(),
                    api.getAdminEvents().catch(() => [])
                ]);
                setStatsData(stats);
                // Filter for upcoming events (status = Upcoming or Open)
                // Open first, then coming soon; soonest start date first
                const upcoming = events
                    .filter((e: any) => e.status === 'DRAFT' || e.status === 'ACTIVE')
                    .sort((a: any, b: any) => (a.status === b.status ? 0 : a.status === 'ACTIVE' ? -1 : 1)
                        || String(a.startDate || '9999').localeCompare(String(b.startDate || '9999')))
                    .slice(0, 6);
                setUpcomingEvents(upcoming);
            } catch (error) {
                console.error('Failed to load admin stats:', error);
                toast.error('Failed to load dashboard statistics.');
            } finally {
                setIsLoading(false);
            }
        };
        loadStats();
    }, []);

    const stats = [
        { label: 'Total Events', value: statsData?.metricTotalEvents?.toString() || '0', change: '', icon: Calendar, gradient: 'from-brand-cyan to-brand-blue', glow: 'rgba(0,229,255,0.15)' },
        { label: 'Active Startups', value: statsData?.metricActiveStartups?.toString() || '0', change: '', icon: Rocket, gradient: 'from-brand-teal to-brand-sky', glow: 'rgba(0,255,194,0.15)' },
        { label: 'Total Users', value: statsData?.metricTotalUsers?.toString() || '0', change: '', icon: Users, gradient: 'from-brand-purple to-brand-cyan', glow: 'rgba(123,47,255,0.15)' },
        { label: 'Pitches Evaluated', value: statsData?.metricPitchesEvaluated?.toString() || '0', change: '', icon: Zap, gradient: 'from-brand-purple to-brand-blue', glow: 'rgba(123,47,255,0.15)' },
    ];

    const recentActivity = statsData?.feedRecentActivity?.map((a: any) => ({
        action: `Application ${a.status}`,
        detail: `ID: ${a.applicationId} - Score: ${a.score || 'Pending'}`,
        time: new Date(a.submittedAt).toLocaleDateString(),
        dotColor: a.status === 'ACCEPTED' ? 'bg-brand-teal' : 'bg-brand-purple',
        glowColor: a.status === 'ACCEPTED' ? 'shadow-[0_0_6px_rgba(0,255,194,0.5)]' : 'shadow-[0_0_6px_rgba(123,47,255,0.5)]'
    })) || [];

    const fundingStats = [
        { label: 'Total Funding Raised', value: formatMoney(statsData?.metricTotalFunding), icon: DollarSign, gradient: 'from-brand-teal to-brand-cyan', glow: 'rgba(0,255,194,0.12)' },
        { label: 'Total Applications', value: statsData?.totalApplications?.toString() || '0', icon: TrendingUp, gradient: 'from-brand-purple to-brand-cyan', glow: 'rgba(123,47,255,0.12)' },
        { label: 'Investment Rounds', value: '0', icon: Layers, gradient: 'from-brand-cyan to-brand-blue', glow: 'rgba(0,229,255,0.12)' },
    ];

    const sectorData = statsData?.chartSectorFocusData ? 
        Object.entries(statsData.chartSectorFocusData).map(([label, value]: [string, any], idx) => ({
            label,
            value: Number(value),
            color: ['#00E5FF', '#7B2FFF', '#00FFC2', '#0061FF', '#00D9F5'][idx % 5]
        })) : [];

    const growthData = statsData?.chartGrowthByYear ? 
        Object.values(statsData.chartGrowthByYear).map(v => Number(v)) : [0];
    const growthYears = statsData?.chartGrowthByYear ? 
        Object.keys(statsData.chartGrowthByYear) : ['2026'];

    const handleExport = async (format: 'json' | 'csv' = 'csv') => {
        try {
            const data = await api.exportReport(format);
            // Create download link
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: format === 'csv' ? 'text/csv' : 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dashboard-export.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success(`Exported as ${format.toUpperCase()}`);
        } catch (error) {
            toast.error('Export failed');
        }
    };

    const quickActions = [
        { label: 'Create New Event', icon: Calendar, nav: 'events', desc: 'Set up a hackathon or workshop' },
        { label: 'Evaluate a Pitch', icon: BarChart3, nav: 'pitch', desc: 'Score startup presentations' },
        { label: 'View Users', icon: Users, nav: 'users', desc: 'Manage founders & members' },
        { label: 'View Startups', icon: Rocket, nav: 'startups', desc: 'Track portfolio companies' },
    ];

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6">
            {/* Welcome Banner */}
            <motion.div variants={item} className="bg-card border border-border rounded-2xl p-6 mb-2 shadow-sm">
                <h2 className="text-3xl font-bold text-foreground">
                    Welcome back, <span className="bg-gradient-to-r from-brand-cyan to-brand-teal bg-clip-text text-transparent">Admin</span>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Here's what's happening across Q-AI Hub today</p>
            </motion.div>

            {/* Stats */}
            <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 24, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.15 + i * 0.08, type: 'spring' as const, stiffness: 200, damping: 20 }}
                        whileHover={{ y: -5, filter: 'brightness(1.1)' }}
                        className="group relative overflow-hidden rounded-2xl p-6 transition-all cursor-pointer bg-card border border-border shadow-sm"
                    >
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 bg-gradient-to-br ${stat.gradient}`} />
                        {/* Bottom Accent Glow */}
                        <div className={`absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient} opacity-40 blur-sm`} />
                        
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{stat.label}</p>
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 shadow-inner group-hover:bg-primary/10 transition-colors">
                                    <stat.icon className="h-4.5 w-4.5 text-muted-foreground/70 group-hover:text-primary transition-colors" />
                                </div>
                            </div>
                            <p className={`text-4xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent drop-shadow-sm`}>
                                {stat.value}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* ─── Growth Charts ─── */}
            <motion.div variants={item} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {[
                    { title: 'Event Growth', data: growthData, color: '#00E5FF', latest: statsData?.metricTotalEvents?.toString() || '0', change: '' },
                    { title: 'Total Startups', data: [statsData?.metricActiveStartups || 0], color: '#00FFC2', latest: statsData?.metricActiveStartups?.toString() || '0', change: '' },
                    { title: 'Total Applications', data: [statsData?.totalApplications || 0], color: '#7B2FFF', latest: statsData?.totalApplications?.toString() || '0', change: '' },
                ].map((chart, ci) => (
                    <motion.div key={chart.title}
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + ci * 0.1 }}
                        whileHover={{ y: -3, borderColor: 'var(--color-border)' }}
                        className="relative rounded-2xl p-6 transition-all border border-border bg-card shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-foreground">{chart.title}</p>
                            <span className="text-xs font-medium text-emerald-600 dark:text-brand-teal">{chart.change}</span>
                        </div>
                        <p className="text-2xl font-bold mb-3" style={{ color: chart.color }}>{chart.latest}</p>
                        <MiniLineChart data={chart.data} color={chart.color} height={80} />
                        <div className="flex justify-between mt-2">
                            {growthYears.map(y => <span key={y} className="text-[9px] text-muted-foreground/60">{y}</span>)}
                        </div>
                    </motion.div>
                ))}
            </motion.div>


            {/* ─── Funding & Economic + Sector Pie ─── */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {/* Funding Stats */}
                <motion.div variants={item} className="lg:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="h-5 w-5 text-emerald-600 dark:text-brand-teal" />
                        <h3 className="text-base font-bold text-foreground">Funding & Economic Impact</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {fundingStats.map((fs, fi) => (
                            <motion.div key={fs.label}
                                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 + fi * 0.08 }}
                                whileHover={{ y: -5, filter: 'brightness(1.1)' }}
                                className="relative rounded-2xl p-6 transition-all cursor-default overflow-hidden group bg-card border border-border shadow-sm"
                            >
                                {/* Background Glow Layer */}
                                <div 
                                    className={`absolute inset-0 bg-gradient-to-br ${fs.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} 
                                />
                                {/* Bottom Accent Glow */}
                                <div 
                                    className={`absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r ${fs.gradient} opacity-40 blur-sm`} 
                                />
                                
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/5 shadow-inner">
                                            <fs.icon className="h-4.5 w-4.5 text-muted-foreground/70" />
                                        </div>
                                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{fs.label}</p>
                                    </div>
                                    <p className={`text-3xl font-bold bg-gradient-to-r ${fs.gradient} bg-clip-text text-transparent drop-shadow-sm`}>
                                        {fs.value}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Sector Pie Chart */}
                <motion.div variants={item} 
                    className="relative rounded-2xl p-6 border border-border bg-card shadow-sm"
                >
                    <div className="flex items-center gap-2 mb-5">
                        <PieChart className="h-5 w-5 text-purple-600 dark:text-brand-purple" />
                        <h3 className="text-base font-bold text-foreground">Sector Focus</h3>
                    </div>
                    <DonutChart segments={sectorData} />
                </motion.div>
            </div>

            {/* Activity + Quick Actions */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <motion.div variants={item} 
                    className="lg:col-span-2 relative rounded-2xl p-7 border border-border bg-card shadow-sm"
                >
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-cyan-600 dark:text-brand-cyan" />
                            <h3 className="text-base font-bold text-foreground">Recent Activity</h3>
                        </div>
                        <span className="text-xs text-muted-foreground">Last 7 days</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        {recentActivity.map((activity, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + i * 0.08 }}
                                whileHover={{ x: 4, backgroundColor: 'var(--color-muted)' }}
                                className="flex items-start gap-3 rounded-lg p-3 transition-all cursor-default"
                            >
                                <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${activity.dotColor} ${activity.glowColor}`} />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground/90">{activity.action}</p>
                                    <p className="text-xs text-muted-foreground">{activity.detail}</p>
                                </div>
                                <p className="shrink-0 text-[11px] text-muted-foreground/70">{activity.time}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                <motion.div variants={item} 
                    className="relative rounded-2xl p-7 border border-border bg-card shadow-sm"
                >
                    <div className="flex items-center gap-2 mb-5">
                        <Zap className="h-5 w-5 text-cyan-600 dark:text-brand-cyan" />
                        <h3 className="text-base font-bold text-foreground">Quick Actions</h3>
                    </div>
                    <div className="flex flex-col gap-2.5">
                        {quickActions.map((action, i) => (
                            <motion.button
                                key={action.label}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + i * 0.08 }}
                                whileHover={{ 
                                    scale: 1.02, 
                                    x: 4,
                                    backgroundColor: 'rgba(0, 229, 255, 0.05)',
                                    borderColor: 'rgba(0, 229, 255, 0.2)'
                                }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => action.nav === 'create-event' ? navigate('/admin/events/create') : onNavigate(action.nav)}
                                className="group/btn flex items-center gap-4 rounded-2xl bg-muted/30 p-4 text-left transition-all border border-border hover:shadow-lg hover:shadow-cyan-500/5"
                            >
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-cyan/10 to-brand-blue/10 group-hover/btn:from-brand-cyan/20 group-hover/btn:to-brand-blue/20 transition-all duration-300">
                                    <action.icon className="h-5 w-5 text-cyan-600 dark:text-brand-cyan group-hover/btn:scale-110 transition-transform" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-foreground/90 group-hover/btn:text-primary transition-colors">{action.label}</p>
                                    <p className="text-[11px] leading-tight text-muted-foreground mt-0.5">{action.desc}</p>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 group-hover/btn:text-cyan-500 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-all" />
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Upcoming Events */}
            <motion.div variants={item} 
                className="relative rounded-2xl p-7 border border-border bg-card shadow-sm"
            >
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-cyan-600 dark:text-brand-cyan" />
                        <h3 className="text-base font-bold text-foreground">Upcoming Events</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleExport('csv')}
                            className="text-xs font-medium text-cyan-600 dark:text-brand-cyan hover:text-cyan-600 dark:text-brand-cyan/80 transition-colors"
                        >
                            Export CSV
                        </button>
                        <button onClick={() => onNavigate('events')} className="text-xs font-medium text-cyan-600 dark:text-brand-cyan hover:text-cyan-600 dark:text-brand-cyan/80 transition-colors">View all →</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {upcomingEvents.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-muted-foreground">No upcoming events</div>
                    ) : (
                        upcomingEvents.map((event, i) => {
                            const isOpen = event.status === 'ACTIVE';
                            const count = event.participantCount ?? 0;
                            const capacity = event.maxParticipants || 0;
                            const pct = capacity > 0 ? Math.min(Math.round((count / capacity) * 100), 100) : null;
                            return (
                            <motion.div
                                key={event.eventId ?? i}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 + i * 0.1 }}
                                whileHover={{ y: -2, borderColor: 'rgba(0,229,255,0.15)' }}
                                onClick={() => navigate('/admin/events')}
                                className="rounded-xl border border-border p-4 transition-all hover:bg-muted/50 cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${isOpen ? 'bg-brand-teal/15 text-emerald-600 dark:text-brand-teal' : 'bg-brand-purple/10 text-purple-600 dark:text-brand-purple'}`}>
                                        {isOpen ? 'Open' : 'Coming soon'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {count} {event.eventType === 'SIMPLE' ? 'registered' : (count === 1 ? 'applicant' : 'applicants')}
                                    </span>
                                </div>
                                <h4 className="mt-3 text-sm font-semibold text-foreground">{event.title}</h4>
                                <p className="mt-0.5 text-xs text-muted-foreground">{event.startDate ? new Date(event.startDate).toLocaleDateString() : 'Date to be announced'}</p>
                                {pct !== null ? (
                                    <div className="mt-3 flex items-center gap-2">
                                        <div className="flex-1 h-1 overflow-hidden rounded-full bg-foreground/5">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ delay: 0.8 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                                                className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-teal"
                                            />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">{count}/{capacity}</span>
                                    </div>
                                ) : (
                                    <p className="mt-3 text-[10px] text-muted-foreground">No participant limit</p>
                                )}
                            </motion.div>
                            );
                        })
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
