import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Calendar, Rocket, Trophy, Settings, Users, ChevronRight, LogOut, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Logo } from '../common/Logo';
import { ThemeToggle } from '../theme/ThemeToggle';
import { api } from '../../services/api';

type NavItem = { label: string; icon: React.ElementType; id: string };

const navItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
    { label: 'Events', icon: Calendar, id: 'events' },
    { label: 'Users', icon: Users, id: 'users' },
    { label: 'Startups', icon: Rocket, id: 'startups' },
    { label: 'Pitch Evaluation', icon: Trophy, id: 'pitch' },
    { label: 'Settings', icon: Settings, id: 'settings' },
];

interface AdminSidebarProps {
    activeSection: string;
    /** Below the lg breakpoint the sidebar is a drawer opened from the top bar */
    mobileOpen?: boolean;
    onClose?: () => void;
}

export function AdminSidebar({ activeSection, mobileOpen = false, onClose }: AdminSidebarProps) {
    const [role, setRole] = useState<string>('admin');
    const [userName, setUserName] = useState<string>('Admin User');

    useEffect(() => {
        const savedRole = localStorage.getItem('userRole') || 'admin';
        const savedName = localStorage.getItem('userName') || 'Admin User';
        setRole(savedRole);
        setUserName(savedName);
    }, []);

    // Filter nav items based on role
    const visibleItems = navItems.filter(item => {
        if (role === 'jury') {
            return ['dashboard', 'startups', 'rules'].includes(item.id);
        }
        return true; // admin sees everything
    });

    // Escape closes the mobile drawer
    useEffect(() => {
        if (!mobileOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [mobileOpen, onClose]);

    return (
        <>
        {/* Dark backdrop behind the open drawer (mobile / tablet) */}
        {mobileOpen && (
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden="true" />
        )}
        <aside
            id="admin-sidebar"
            aria-label="Admin navigation"
            className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-background/95 backdrop-blur-xl border-r border-border transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
            {onClose && (
                <button type="button" onClick={onClose} aria-label="Close menu"
                    className="lg:hidden absolute right-3 top-5 p-2 rounded-lg text-muted-foreground hover:bg-foreground/5">
                    <X className="h-5 w-5" />
                </button>
            )}
            {/* Logo */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-3 px-6 py-6"
            >
                <Link to="/" className="transition-transform hover:scale-105">
                    <Logo size="sm" />
                </Link>
            </motion.div>

            {/* Decorative gradient line */}
            <div className="mx-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            {/* Navigation */}
            <nav className="mt-6 flex-1 px-3">
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-3 px-3 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase"
                >
                    {role === 'jury' ? 'Jury Panel' : 'Admin Panel'}
                </motion.p>
                <ul className="flex flex-col gap-1">
                    {visibleItems.map((item, i) => {
                        const isActive = activeSection === item.id;
                        return (
                            <motion.li
                                key={item.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
                            >
                                <Link
                                    to={`/admin/${item.id}`}
                                    onClick={onClose}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ${isActive
                                        ? 'bg-primary/10 text-primary shadow-[0_0_15px_rgba(0,229,255,0.05)]'
                                        : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground/80'
                                        }`}
                                >
                                    {/* Active indicator glow */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeNavIndicator"
                                            className="absolute inset-0 rounded-xl border border-primary/20"
                                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    <item.icon
                                        className={`relative z-10 h-[18px] w-[18px] transition-all duration-300 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground/60'
                                            }`}
                                    />
                                    <span className="relative z-10">{item.label}</span>
                                    {isActive && (
                                        <ChevronRight className="relative z-10 ml-auto h-4 w-4 text-primary/50" />
                                    )}
                                </Link>
                            </motion.li>
                        );
                    })}
                </ul>
            </nav>

            {/* User profile */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="mx-3 my-4 rounded-xl bg-card/40 p-4 border border-border backdrop-blur shadow-lg shadow-black/10"
            >
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-bold text-white shadow-lg ring-2 ring-primary/20">
                            {userName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">{userName}</p>
                        <p className="truncate text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{role}</p>
                    </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                    <ThemeToggle />
                    <button 
                        aria-label="Log out"
                        title="Log out"
                        onClick={async () => {
                            // Revoke the session server-side (clears the HttpOnly cookies), then local profile data
                            try { await api.logout(); } catch (_) { /* already logged out */ }
                            window.location.href = '/login';
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </motion.div>
        </aside>
        </>
    );
}
