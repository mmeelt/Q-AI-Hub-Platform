import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, ArrowLeft, CheckCircle, Clock, AlertCircle, Calendar, Users, FileText, ArrowRight } from 'lucide-react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { Navigation } from '../../components/layout/Navigation';
import { Footer } from '../../components/layout/Footer';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { useI18n } from '../../i18n/I18nProvider';

interface ApplicationStatus {
    trackingCode: string;
    status: string;
    currentPhase: string;
    nextStep: string;
    submittedAt: string;
    lastUpdated: string;
    projectName?: string;
    founderName?: string;
    founderEmail?: string;
    eventType: string;
    applicantUserId?: string;
}

export function TrackPage() {
    const isAdmin = (localStorage.getItem('userRole') || '').toUpperCase() === 'ADMIN';
    return isAdmin ? <Navigate to="/admin/events" replace /> : <TrackPageContent />;
}

function TrackPageContent() {
    const navigate = useNavigate();
    const { t, language } = useI18n();
    const [trackingCode, setTrackingCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [applicationData, setApplicationData] = useState<ApplicationStatus | null>(null);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!trackingCode.trim()) {
            setError(t('track.enterCode'));
            return;
        }

        setIsLoading(true);
        setError('');
        setApplicationData(null);

        try {
            const data = await api.trackApplication(trackingCode.trim());
            setApplicationData(data);
            toast.success(t('track.found'));
        } catch (error: any) {
            setError(error.message || t('track.notFound'));
            toast.error(t('track.notFound'));
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toUpperCase()) {
            case 'ACCEPTED':
            case 'APPROVED':
                return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            case 'PENDING':
            case 'UNDER_REVIEW':
                return <Clock className="w-5 h-5 text-amber-500" />;
            case 'REJECTED':
            case 'DECLINED':
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            default:
                return <FileText className="w-5 h-5 text-muted-foreground" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toUpperCase()) {
            case 'ACCEPTED':
            case 'APPROVED':
                return 'text-emerald-600 bg-emerald-50 border-emerald-200';
            case 'PENDING':
            case 'UNDER_REVIEW':
                return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'REJECTED':
            case 'DECLINED':
                return 'text-red-600 bg-red-50 border-red-200';
            default:
                return 'text-muted-foreground bg-muted border-border';
        }
    };

    return (
        <div className="min-h-screen relative">
            <ParticleBackground />
            <Navigation />
            
            <main className="relative z-10 min-h-screen flex items-center justify-center px-6 py-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-2xl"
                >
                    {/* Header */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mb-6"
                        >
                            <Logo size="lg" showText={false} />
                        </motion.div>
                        <h1 className="text-4xl font-bold text-foreground mb-4">
                            {t('track.title')}
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            {t('track.subtitle')}
                        </p>
                    </div>

                    {/* Tracking Form */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl"
                    >
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="trackingCode" className="block text-sm font-medium text-foreground mb-2">
                                    {t('track.code')}
                                </label>
                                <div className="relative">
                                    <input
                                        id="trackingCode"
                                        type="text"
                                        value={trackingCode}
                                        onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                                        placeholder={t('track.placeholder')}
                                        className="w-full px-4 py-3 pl-12 bg-background border border-border rounded-xl text-foreground outline-none focus:border-primary/40 transition-colors placeholder:text-muted-foreground/40"
                                        disabled={isLoading}
                                    />
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                                </div>
                                {error && (
                                    <p className="mt-2 text-sm text-red-500">{error}</p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                fullWidth
                                disabled={isLoading || !trackingCode.trim()}
                                className="group"
                            >
                                {isLoading ? t('track.searching') : t('track.submit')}
                                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </form>
                    </motion.div>

                    {/* Application Status Display */}
                    {applicationData && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="mt-8 bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl"
                        >
                            <div className="space-y-6">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-foreground">{t('track.status')}</h2>
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full border bg-primary/10 text-primary border-primary/30">
                                        <span className="text-sm font-medium">{applicationData.trackingCode}</span>
                                    </div>
                                </div>

                                {/* Project Info */}
                                {(applicationData.projectName || applicationData.founderName || applicationData.applicantUserId) && (
                                    <div className="space-y-3">
                                        {applicationData.projectName && (
                                            <div>
                                                <h3 className="text-lg font-semibold text-foreground">{applicationData.projectName}</h3>
                                            </div>
                                        )}
                                        {(applicationData.founderName || applicationData.applicantUserId) && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Users className="w-4 h-4" />
                                                <span>{applicationData.founderName || applicationData.applicantUserId}</span>
                                                {applicationData.founderEmail && (
                                                    <span className="text-muted-foreground/70">• {applicationData.founderEmail}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Status */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        {getStatusIcon(applicationData.status)}
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t('track.currentStatus')}</p>
                                            <p className="font-semibold text-foreground capitalize">{applicationData.status}</p>
                                        </div>
                                    </div>

                                    {applicationData.currentPhase && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">{t('track.currentPhase')}</p>
                                                <p className="font-semibold text-foreground">{applicationData.currentPhase}</p>
                                            </div>
                                        </div>
                                    )}

                                    {applicationData.nextStep && (
                                        <div className="flex items-center gap-3">
                                            <ArrowRight className="w-5 h-5 text-primary" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">{t('track.nextStep')}</p>
                                                <p className="font-semibold text-foreground">{applicationData.nextStep}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Timeline */}
                                <div className="space-y-3 pt-4 border-t border-border">
                                    <div className="flex items-center gap-3 text-sm">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">{t('track.submitted', { date: new Date(applicationData.submittedAt).toLocaleDateString(language) })}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">{t('track.updated', { date: new Date(applicationData.lastUpdated).toLocaleDateString(language) })}</span>
                                    </div>
                                    {applicationData.eventType && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <FileText className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">{t('track.eventType', { type: applicationData.eventType })}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Action Button */}
                                {applicationData.status.toUpperCase() === 'ACCEPTED' && (
                                    <div className="pt-4 border-t border-border">
                                        <Button
                                            onClick={() => navigate('/dashboard')}
                                            className="w-full"
                                        >
                                            {t('track.goToDashboard')}
                                            <ArrowRight className="ml-2" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Back Button */}
                    <div className="text-center mt-8">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft size={16} />
                            {t('track.backHome')}
                        </button>
                    </div>
                </motion.div>
            </main>
            <Footer />
        </div>
    );
}
