import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, FileText, Bell, Settings, LogOut, Calendar, Shield, Rocket, UserPlus } from 'lucide-react';
import { Logo } from '../common/Logo';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { ThemeToggle } from '../theme/ThemeToggle';
import { api } from '../../services/api';
import { clearAuth } from '../../utils/localStorage';

interface DashboardHeaderProps {
    activeTab?: string;
    profileName?: string;
    onTabChange?: (tabId: string) => void;
    unreadCount?: number;
}

export function DashboardHeader({ activeTab, profileName = 'Founder', onTabChange, unreadCount: externalUnreadCount }: DashboardHeaderProps) {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);
    // The "Expert Roles" tab is only useful to people invited as experts (cached for the session)
    const [isExpert, setIsExpert] = useState(() => sessionStorage.getItem('hasExpertRoles') === 'true');

    useEffect(() => {
        if (sessionStorage.getItem('hasExpertRoles') !== null) return;
        api.getExpertEvents()
            .then(events => {
                const has = Array.isArray(events) && events.length > 0;
                sessionStorage.setItem('hasExpertRoles', String(has));
                setIsExpert(has);
            })
            .catch(() => { /* keep the tab hidden */ });
    }, []);

    useEffect(() => {
        if (externalUnreadCount !== undefined) {
            setUnreadCount(externalUnreadCount);
            return;
        }
        const fetchUnreadCount = async () => {
            try {
                const count = await api.getUnreadNotificationCount();
                setUnreadCount(count);
            } catch (error) {
                // Silent fail
            }
        };
        fetchUnreadCount();
    }, [externalUnreadCount]);

    const navItems = [
        { id: 'overview', icon: Home, label: 'Overview' },
        { id: 'my-startups', icon: Rocket, label: 'My Startups' },
        { id: 'applications', icon: FileText, label: 'My Applications' },
        { id: 'events', icon: Calendar, label: 'Events' },
        { id: 'expert', icon: Shield, label: 'Expert Roles' },
        { id: 'invitations', icon: UserPlus, label: 'Invitations' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ].filter(item => item.id !== 'expert' || isExpert || activeTab === 'expert');


    const handleTabClick = (tabId: string) => {
        if (tabId === 'events') {
            navigate('/events');
            return;
        }

        if (tabId === 'my-startups') {
            navigate('/my-startups');
            return;
        }

        if (tabId === 'invitations') {
            navigate('/invitations');
            return;
        }

        if (onTabChange) {
            onTabChange(tabId);
        } else {
            navigate(`/dashboard?tab=${tabId}`);
        }
    };

    const handleNotificationClick = () => {
        if (onTabChange) {
            onTabChange('notifications');
        } else {
            navigate('/dashboard?tab=notifications');
        }
    };

    const handleLogout = async () => {
        try { await api.logout(); } catch (_) {}
        clearAuth();
        navigate('/');
    };

    return (
        <header className="w-full border-b border-border bg-background/95 backdrop-blur-xl relative z-50">
          <div className="px-4 md:px-8 py-4 grid grid-cols-2 md:grid-cols-[auto_1fr_auto] gap-4 items-center">
            {/* Left section: Logo */}
            <div className="flex justify-start shrink-0 whitespace-nowrap">
                <Link to="/" className="flex items-center gap-2" aria-label="Q-AI Hub home">
                    <Logo size="sm" />
                </Link>
            </div>

            {/* Center section: Desktop nav */}
            <div className="hidden md:flex justify-center">
                <nav className="flex items-center gap-2 rounded-full bg-foreground/5 px-2 py-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleTabClick(item.id)}
                            title={item.label}
                            aria-current={activeTab === item.id ? 'page' : undefined}
                            className={`flex items-center gap-2 px-3 xl:px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${activeTab === item.id
                                ? 'bg-brand-cyan/15 text-cyan-500 dark:text-brand-cyan shadow-[0_0_15px_rgba(0,229,255,0.2)] border border-brand-cyan/30'
                                : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                                }`}
                        >
                            <item.icon size={16} />
                            {/* Icons only on mid-size screens so the bar never overflows */}
                            <span className="hidden xl:inline">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Right section: User section */}
            <div className="flex justify-end flex-1 items-center gap-3">
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    
                    {/* Standalone notification bell */}
                    <button
                        onClick={handleNotificationClick}
                        className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${activeTab === 'notifications'
                                ? 'bg-brand-cyan/15 text-cyan-500 dark:text-brand-cyan border border-brand-cyan/30'
                                : 'bg-foreground/5 border border-border text-muted-foreground hover:text-foreground hover:bg-foreground/10'
                            }`}
                        title="Notifications"
                        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
                    >
                        <Bell size={17} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    <div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-full bg-foreground/5 border border-border">
                        {/* Local initials avatar (no third-party request with the user's name) */}
                        <Avatar name={profileName} />
                        <div className="flex flex-col text-left">
                            <span className="text-sm leading-tight truncate max-w-[140px] text-foreground">{profileName}</span>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 rounded-full text-sm whitespace-nowrap justify-center h-10 w-10 sm:w-auto"
                    >
                        <LogOut size={16} className="sm:mr-2" />
                        <span className="hidden sm:inline">Log out</span>
                    </Button>
                </div>
            </div>
          </div>
        </header>
    );
}
