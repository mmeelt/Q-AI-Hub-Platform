import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Rocket, Globe, Upload, X, Check, Save, Building2, Target, Sparkles, Users, Mail, User, Loader2 } from 'lucide-react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api';
import { toast } from 'sonner';

const sectors = [
    'HealthTech', 'FinTech', 'EdTech', 'GreenTech', 'DeepTech', 'AgriTech', 'Cybersecurity',
    'E-commerce', 'SaaS', 'AI/ML', 'Blockchain', 'IoT', 'Biotech', 'CleanTech', 'Other'
];

export function CreateStartupProfilePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editingId = searchParams.get('id');
    const [isLoading, setIsLoading] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [aiDescription, setAiDescription] = useState('');
    const [existingStartup, setExistingStartup] = useState<any>(null);
    const [formData, setFormData] = useState({
        projectName: '',
        businessSector: '',
        companyTagline: '',
        website: '',
        rawDescription: '',
        teamSize: 1,
        userRole: '',
        userRoleOther: '',
        teammates: [] as { email: string; role: string; roleOther?: string }[],
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [pitchDeckFile, setPitchDeckFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const profileName = localStorage.getItem('userName') || 'Founder';

    useEffect(() => {
        loadExistingStartup();
    }, []);

    const loadExistingStartup = async () => {
        try {
            const startups = await api.getMyStartup();
            if (Array.isArray(startups) && startups.length > 0) {
                const startup = editingId 
                    ? startups.find((s: any) => s.startupId === editingId) 
                    : startups[0];
                
                if (startup) {
                    setExistingStartup(startup);
                    setFormData({
                        projectName: startup.projectName || '',
                        businessSector: startup.businessSector || '',
                        companyTagline: startup.companyTagline || '',
                        website: startup.companyWebsiteUrl || startup.website || '',
                        rawDescription: startup.rawDescription || '',
                        teamSize: startup.currentTeamSize || 1,
                        userRole: '',
                        userRoleOther: '',
                        teammates: [],
                    });
                    if (startup.logoUrl || startup.companyLogoUrl) {
                        setLogoPreview(startup.logoUrl || startup.companyLogoUrl);
                    }
                }
            }
        } catch (error) {
            // No existing startup, continue with form
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handlePitchDeckChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPitchDeckFile(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const payload = {
                projectName: formData.projectName,
                businessSector: formData.businessSector,
                companyTagline: formData.companyTagline,
                companyWebsiteUrl: formData.website,
                rawDescription: formData.rawDescription,
                currentTeamSize: formData.teamSize,
                startupFormAnswers: JSON.stringify({
                    userRole: formData.userRole,
                    userRoleOther: formData.userRoleOther,
                    teammates: formData.teammates
                }),
                coFounderNames: formData.teammates.filter(t => t.role === 'Co-Founder' || t.roleOther === 'Co-Founder').map(t => t.email)
            };

            if (existingStartup) {
                // Update existing startup
                await api.updateStartupProfile(existingStartup.startupId || existingStartup.id, payload);
                toast.success('Startup profile updated successfully!');
            } else {
                // Create new startup
                await api.createStartup(payload);
                toast.success('Startup profile created successfully!');
            }
            navigate('/dashboard?tab=startup');
        } catch (error: any) {
            toast.error(error.message || 'Failed to save startup profile');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAiRefine = async () => {
        if (!formData.rawDescription.trim()) return;
        setIsRefining(true);
        try {
            const data = await api.refineDescription(formData.rawDescription);
            setAiDescription(data.refinedDescription || '');
        } catch {
            toast.error('Enhancement failed. Please try again.');
        } finally {
            setIsRefining(false);
        }
    };

    return (
        <div className="min-h-screen relative">
            <ParticleBackground />
            <DashboardHeader activeTab="" profileName={profileName} />

            <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 rounded-lg hover:bg-foreground/5 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">
                                {existingStartup ? 'Edit Startup Profile' : 'Create Startup Profile'}
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                {existingStartup ? 'Update your startup information' : 'Tell us about your startup'}
                            </p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl"
                        >
                            {/* Logo Upload */}
                            <div className="mb-8">
                                <label className="block text-sm font-medium text-foreground mb-3">
                                    Startup Logo
                                </label>
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 rounded-2xl bg-foreground/5 border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <Rocket className="text-muted-foreground/30" size={32} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            id="logo"
                                            accept="image/*"
                                            onChange={handleLogoChange}
                                            className="hidden"
                                        />
                                        <label
                                            htmlFor="logo"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-foreground/10 text-foreground rounded-lg hover:bg-foreground/20 transition-colors cursor-pointer text-sm"
                                        >
                                            <Upload size={16} />
                                            Upload Logo
                                        </label>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Recommended: 200x200px, PNG or JPG
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Startup Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.projectName}
                                        onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                        className="w-full px-4 py-3 bg-foreground/5 border border-border rounded-xl text-foreground outline-none focus:border-primary/40 transition-colors placeholder:text-muted-foreground/40"
                                        placeholder="e.g., QuantumAI Solutions"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Sector *
                                    </label>
                                    <select
                                        value={formData.businessSector}
                                        onChange={(e) => setFormData({ ...formData, businessSector: e.target.value })}
                                        className="w-full px-4 py-3 bg-foreground/5 border border-border rounded-xl text-foreground outline-none focus:border-primary/40 transition-colors"
                                        required
                                    >
                                        <option value="">Select a sector</option>
                                        {sectors.map((sector) => (
                                            <option key={sector} value={sector}>{sector}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Tagline
                                </label>
                                <input
                                    type="text"
                                    value={formData.companyTagline}
                                    onChange={(e) => setFormData({ ...formData, companyTagline: e.target.value })}
                                    className="w-full px-4 py-3 bg-foreground/5 border border-border rounded-xl text-foreground outline-none focus:border-primary/40 transition-colors placeholder:text-muted-foreground/40"
                                    placeholder="A short, memorable phrase describing your startup"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Website
                                </label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={18} />
                                    <input
                                        type="url"
                                        value={formData.website}
                                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 bg-foreground/5 border border-border rounded-xl text-foreground outline-none focus:border-primary/40 transition-colors placeholder:text-muted-foreground/40"
                                        placeholder="https://yourstartup.com"
                                    />
                                </div>
                            </div>

                            {/* Pitch Deck Upload */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-foreground mb-3">
                                    Pitch Deck
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="file"
                                        id="pitchDeck"
                                        accept=".pdf,.ppt,.pptx"
                                        onChange={handlePitchDeckChange}
                                        className="hidden"
                                    />
                                    <label
                                        htmlFor="pitchDeck"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-foreground/10 text-foreground rounded-lg hover:bg-foreground/20 transition-colors cursor-pointer text-sm"
                                    >
                                        <Upload size={16} />
                                        {pitchDeckFile ? pitchDeckFile.name : 'Upload Pitch Deck'}
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        PDF, PPT, or PPTX (max 10MB)
                                    </p>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Description *
                                </label>
                                <textarea
                                    value={formData.rawDescription}
                                    onChange={(e) => { setFormData({ ...formData, rawDescription: e.target.value }); setAiDescription(''); }}
                                    className="w-full px-4 py-3 bg-foreground/5 border border-border rounded-xl text-foreground outline-none focus:border-primary/40 transition-colors placeholder:text-muted-foreground/40 min-h-[150px] resize-none"
                                    placeholder="Describe your startup, the problem you're solving, and your solution..."
                                    required
                                />
                                {!aiDescription && (
                                    <div className="flex justify-end mt-2">
                                        <button
                                            type="button"
                                            onClick={handleAiRefine}
                                            disabled={isRefining || !formData.rawDescription.trim()}
                                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-foreground/5 text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-40 transition-all"
                                        >
                                            {isRefining ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                            {isRefining ? 'Enhancing...' : 'Enhance'}
                                        </button>
                                    </div>
                                )}
                                {aiDescription && (
                                    <div className="mt-3 p-4 rounded-xl bg-card border border-border">
                                        <p className="text-sm text-foreground/80 leading-relaxed mb-3">{aiDescription}</p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => { setFormData({ ...formData, rawDescription: aiDescription }); setAiDescription(''); }}
                                                className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                                            >
                                                Use this
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAiDescription('')}
                                                className="px-3 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground"
                                            >
                                                Discard
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Team Size & Roles */}
                            <div className="mb-6 pt-6 border-t border-border">
                                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                                    <Users size={20} className="text-primary" />
                                    Team Information
                                </h3>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Your Role *
                                    </label>
                                    <select
                                        value={formData.userRole}
                                        onChange={(e) => setFormData({ ...formData, userRole: e.target.value })}
                                        className="w-full px-4 py-3 bg-foreground/5 border border-border rounded-xl text-foreground outline-none focus:border-primary/40 transition-colors"
                                        required
                                    >
                                        <option value="">Select your role</option>
                                        <option value="CEO">CEO / Founder</option>
                                        <option value="CTO">CTO / Technical Lead</option>
                                        <option value="COO">COO / Operations Lead</option>
                                        <option value="CMO">CMO / Marketing Lead</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    {formData.userRole === 'Other' && (
                                        <div className="mt-3">
                                            <input
                                                type="text"
                                                value={formData.userRoleOther}
                                                onChange={(e) => setFormData({ ...formData, userRoleOther: e.target.value })}
                                                className="w-full px-4 py-3 bg-foreground/5 border border-border rounded-xl text-foreground outline-none focus:border-primary/40 transition-colors placeholder:text-muted-foreground/40"
                                                placeholder="Specify your role"
                                                required
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-foreground mb-3">
                                        Team Size (Including You)
                                    </label>
                                    <div className="flex flex-wrap gap-3 mb-6">
                                        {[1, 2, 3, 4, 5, 6].map((size) => (
                                            <button
                                                key={size}
                                                type="button"
                                                onClick={() => {
                                                    let newTeammates = [...formData.teammates];
                                                    if (size > 1) {
                                                        const diff = (size - 1) - newTeammates.length;
                                                        if (diff > 0) {
                                                            newTeammates = [
                                                                ...newTeammates,
                                                                ...Array(diff).fill(null).map(() => ({ email: '', role: '', roleOther: '' }))
                                                            ];
                                                        } else if (diff < 0) {
                                                            newTeammates = newTeammates.slice(0, size - 1);
                                                        }
                                                    } else {
                                                        newTeammates = [];
                                                    }
                                                    setFormData({ ...formData, teamSize: size, teammates: newTeammates });
                                                }}
                                                className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-medium transition-all ${
                                                    formData.teamSize === size
                                                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110'
                                                        : 'bg-foreground/5 text-foreground hover:bg-foreground/10 border border-border'
                                                }`}
                                            >
                                                {size}{size === 6 ? '+' : ''}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Teammates List */}
                                    {formData.teamSize > 1 && (
                                        <div className="space-y-4">
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                Invite Teammates
                                            </label>
                                            {formData.teammates.map((teammate, idx) => (
                                                <div key={idx} className="p-4 bg-foreground/5 border border-border rounded-xl space-y-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                                                            {idx + 1}
                                                        </div>
                                                        <span className="text-sm font-medium text-foreground">Teammate {idx + 1}</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="relative">
                                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={16} />
                                                            <input
                                                                type="email"
                                                                value={teammate.email}
                                                                onChange={(e) => {
                                                                    const updated = [...formData.teammates];
                                                                    updated[idx].email = e.target.value;
                                                                    setFormData({ ...formData, teammates: updated });
                                                                }}
                                                                placeholder="Email address"
                                                                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/40"
                                                                required
                                                            />
                                                        </div>
                                                        <div className="relative">
                                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={16} />
                                                            <select
                                                                value={teammate.role}
                                                                onChange={(e) => {
                                                                    const updated = [...formData.teammates];
                                                                    updated[idx].role = e.target.value;
                                                                    if (e.target.value !== 'Other') {
                                                                        updated[idx].roleOther = '';
                                                                    }
                                                                    setFormData({ ...formData, teammates: updated });
                                                                }}
                                                                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/40 appearance-none"
                                                                required
                                                            >
                                                                <option value="">Select role</option>
                                                                <option value="Co-Founder">Co-Founder</option>
                                                                <option value="Developer">Developer</option>
                                                                <option value="Designer">Designer</option>
                                                                <option value="Marketing">Marketing</option>
                                                                <option value="Other">Other</option>
                                                            </select>
                                                        </div>
                                                        {teammate.role === 'Other' && (
                                                            <div className="md:col-span-2">
                                                                <input
                                                                    type="text"
                                                                    value={teammate.roleOther || ''}
                                                                    onChange={(e) => {
                                                                        const updated = [...formData.teammates];
                                                                        updated[idx].roleOther = e.target.value;
                                                                        setFormData({ ...formData, teammates: updated });
                                                                    }}
                                                                    placeholder="Specify their role"
                                                                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/40"
                                                                    required
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex items-center justify-end gap-4 pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => navigate('/dashboard')}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={isLoading}
                                    className="flex items-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            {existingStartup ? 'Update Profile' : 'Create Profile'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    </form>
                </motion.div>
            </main>
        </div>
    );
}
