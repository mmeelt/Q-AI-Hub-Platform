import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Upload, Sparkles, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { GradientButton } from '../../components/common/GradientButton';
import { GlassCard } from '../../components/common/GlassCard';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { toast } from 'sonner';
import { api } from '../../services/api';

export function ProgramApplicationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [program, setProgram] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [startupId, setStartupId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (id) {
          const data = await api.getEventById(id);
          setProgram(data);
        }

        if (localStorage.getItem('isLoggedIn') === 'true') {
          try {
            // The API returns the list of the user's startups: pre-fill with the first one
            const startups = await api.getMyStartup();
            const startup = Array.isArray(startups) ? startups[0] : null;
            if (startup) {
              setStartupId(startup.startupId || startup.id);
              setFormData(prev => ({
                ...prev,
                startupName: startup.projectName || '',
                sector: startup.businessSector || '',
                description: startup.rawDescription || '',
                githubUrl: startup.githubUrl || '',
                teamSize: startup.currentTeamSize?.toString() || '1',
              }));
            }
          } catch (startupError) {
            // No startup found, ignore
          }
        }
      } catch (e) {
        toast.error('Failed to load details');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id]);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    startupName: '',
    sector: '',
    logo: null as File | null,
    description: '',
    aiDescription: '',
    githubUrl: '',
    teamSize: '',
    userRole: '',
    teammates: [] as { email: string; role: string }[],
    techStack: '',
    pitchDeck: null as File | null,
    agreeToTerms: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-foreground">Loading program details...</div>;
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-muted-foreground">Program not found</p>
      </div>
    );
  }

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logo' | 'pitchDeck',
  ) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setFormData({ ...formData, [field]: file });
    }
  };

  const handleGenerateAI = async () => {
    if (!formData.description.trim()) return;

    setIsGenerating(true);
    try {
      const result = await api.refineDescription(formData.description);
      setFormData({ ...formData, aiDescription: result.refinedDescription });
      setShowComparison(true);
    } catch (e) {
      toast.error('AI enhancement failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const sectors = [
    'HealthTech',
    'FinTech',
    'EdTech',
    'GreenTech',
    'DeepTech',
    'AgriTech',
    'Cybersecurity',
  ];

  const commonRoles = [
    'CEO (Chief Executive Officer)',
    'CTO (Chief Technology Officer)',
    'COO (Chief Operating Officer)',
    'Accountant',
    'Software Engineer',
    'Product Designer',
    'Marketing Manager',
    'Sales Representative',
    'Legal Counsel',
    'Data Scientist',
    'AI Researcher',
  ];

  const handleSubmit = async () => {
    if (!formData.agreeToTerms) {
      toast.error('Please agree to the terms before submitting.');
      return;
    }

    setIsLoading(true);
    try {
      // Upload files if present
      let logoUrl = '';
      if (formData.logo) {
        try { logoUrl = await api.uploadFile(formData.logo, 'logos'); } catch (_) {}
      }

      let pitchDeckUrl = '';
      if (formData.pitchDeck) {
        try { pitchDeckUrl = await api.uploadFile(formData.pitchDeck, 'pitch-decks'); } catch (_) {}
      }

      const startupData = {
        projectName: formData.startupName,
        businessSector: formData.sector,
        rawDescription: formData.aiDescription || formData.description,
        currentTeamSize: parseInt(formData.teamSize) || 1,
        companyLogoUrl: logoUrl,
        pitchDeckLink: pitchDeckUrl,
      };

      let currentStartupId = startupId;
      if (currentStartupId) {
        await api.updateStartupProfile(currentStartupId, startupData);
      } else {
        const newStartup = await api.createStartup(startupData);
        currentStartupId = newStartup.startupId || newStartup.id;
        setStartupId(currentStartupId);
      }

      const answers = {
        ...startupData,
        githubUrl: formData.githubUrl,
        userRole: formData.userRole,
        teammates: formData.teammates,
        techStack: formData.techStack,
      };

      const result = await api.submitApplicationWithAnswers({
        targetEventId: String(id),
        linkedStartupId: currentStartupId!,
        initialApplicationAnswers: JSON.stringify(answers),
      });

      toast.success('Application submitted successfully!');
      navigate('/dashboard?tab=applications');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-background text-foreground py-24 px-6">
      <ParticleBackground />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <span className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground">
            Program Application
          </span>
        </div>

        <div className="text-center mb-10">
          <h1
            className="text-4xl md:text-5xl font-bold mb-3"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <span className="text-foreground">
              Apply to {program.title}
            </span>
          </h1>
          <p className="text-muted-foreground text-sm uppercase tracking-[0.2em] mb-3">
            {program.axis}
          </p>
          <p className="text-muted-foreground text-base max-w-2xl mx-auto">
            Share your startup vision and join the next generation of quantum‑AI
            builders at ENICarthage.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-5 left-0 right-0 h-1 bg-foreground/5 overflow-hidden rounded-full">
              <div
                className="h-full bg-foreground/30 transition-all duration-500"
                style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
              />
            </div>

            {[1, 2, 3].map((step) => (
              <div key={step} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${currentStep >= step
                    ? 'bg-foreground/20 text-foreground border border-border shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                    : 'bg-muted text-muted-foreground/80 border border-border'
                    }`}
                >
                  {currentStep > step ? <Check size={20} /> : step}
                </div>
                <span
                  className={`text-xs mt-2 ${currentStep >= step ? 'text-foreground' : 'text-muted-foreground/80'
                    }`}
                >
                  {step === 1 ? 'Profile' : step === 2 ? 'Description' : 'Submit'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Startup Profile */}
        {currentStep === 1 && (
          <GlassCard>
            <div className="p-8">
              <h2
                className="text-2xl font-bold mb-6"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Startup Profile
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Startup Name *
                  </label>
                  <input
                    type="text"
                    value={formData.startupName}
                    onChange={(e) =>
                      setFormData({ ...formData, startupName: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:border-brand-sky focus:outline-none transition-colors text-foreground"
                    placeholder="Enter your startup name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Sector *
                  </label>
                  <select
                    value={formData.sector}
                    onChange={(e) =>
                      setFormData({ ...formData, sector: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:border-brand-sky focus:outline-none transition-colors text-foreground"
                  >
                    <option value="">Select a sector</option>
                    {sectors.map((sector) => (
                      <option key={sector} value={sector}>
                        {sector}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Upload Logo
                  </label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-brand-sky/50 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'logo')}
                      className="hidden"
                      id="program-logo-upload"
                    />
                    <label htmlFor="program-logo-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {formData.logo
                          ? formData.logo.name
                          : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        PNG, JPG up to 5MB
                      </p>
                    </label>
                  </div>
                </div>

                <GradientButton
                  fullWidth
                  onClick={() => setCurrentStep(2)}
                  disabled={!formData.startupName || !formData.sector}
                  className={
                    !formData.startupName || !formData.sector
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }
                >
                  Continue to Description{' '}
                  <ChevronRight className="ml-2 w-5 h-5" />
                </GradientButton>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Step 2: AI-Assisted Description */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <GlassCard>
              <div className="p-8">
                <h2
                  className="text-2xl font-bold mb-6"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Project Description
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Describe your idea in your own words... *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={8}
                      className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:border-brand-sky focus:outline-none transition-colors text-foreground resize-none"
                      placeholder="Tell us about the problem you're solving, your solution, and your target market..."
                    />
                  </div>

                  <GradientButton
                    fullWidth
                    onClick={handleGenerateAI}
                    disabled={!formData.description || isGenerating}
                    className={
                      !formData.description
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }
                  >
                    <Sparkles className="mr-2 w-5 h-5" />
                    {isGenerating ? 'Optimizing with AI...' : 'Optimize with AI'}
                  </GradientButton>
                </div>
              </div>
            </GlassCard>

            {isGenerating && (
              <div className="grid md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <GlassCard key={i}>
                    <div className="p-6 space-y-3">
                      <div className="h-4 bg-foreground/10 rounded animate-pulse" />
                      <div className="h-4 bg-foreground/10 rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-foreground/10 rounded animate-pulse w-1/2" />
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}

            {showComparison && !isGenerating && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <GlassCard>
                    <div className="p-6">
                      <h3 className="text-sm font-bold text-muted-foreground mb-3">
                        Your Original Text
                      </h3>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                        {formData.description}
                      </p>
                    </div>
                  </GlassCard>

                  <GlassCard gradient>
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-brand-mint" />
                        <h3 className="text-sm font-bold text-foreground">
                          AI-Enhanced Version
                        </h3>
                      </div>
                      <div className="text-sm text-foreground/90 space-y-3 whitespace-pre-wrap">
                        {formData.aiDescription}
                      </div>
                    </div>
                  </GlassCard>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                  <GradientButton className="flex-1" onClick={() => setCurrentStep(3)}>
                    Use AI-Enhanced Version <ChevronRight className="ml-2 w-5 h-5" />
                  </GradientButton>
                  <button
                    onClick={() => { 
                      setFormData(prev => ({ ...prev, aiDescription: '' })); 
                      setCurrentStep(3); 
                    }}
                    className="flex-1 px-6 py-3 rounded-full font-semibold border-2 border-border text-foreground hover:bg-foreground/5 transition-all flex items-center justify-center"
                  >
                    Keep Original Text
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 rounded-full font-semibold border-2 border-border text-foreground hover:bg-foreground/5 transition-all flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" /> Back
              </button>
              {!showComparison && (
                <GradientButton
                  onClick={() => setCurrentStep(3)}
                  disabled={!formData.description}
                  className={`flex-grow ${!formData.description ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  Skip AI Enhancement
                </GradientButton>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Dynamic Form */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <GlassCard>
              <div className="p-8">
                <h2
                  className="text-2xl font-bold mb-6"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Additional Information
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      GitHub Repository URL
                    </label>
                    <input
                      type="url"
                      value={formData.githubUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, githubUrl: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:border-brand-sky focus:outline-none transition-colors text-foreground"
                      placeholder="https://github.com/your-repo"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Team Size
                      </label>
                      <input
                        type="number"
                        value={formData.teamSize}
                        onChange={(e) => {
                          const size = e.target.value;
                          const numSize = Number(size);
                          const newTeammates = [...formData.teammates];

                          if (numSize > 1) {
                            // Adjust teammates array based on new size
                            const diff = numSize - 1 - newTeammates.length;
                            if (diff > 0) {
                              for (let i = 0; i < diff; i++) {
                                newTeammates.push({ email: '', role: '' });
                              }
                            } else if (diff < 0) {
                              newTeammates.splice(numSize - 1);
                            }
                          } else {
                            newTeammates.splice(0);
                          }

                          setFormData({ ...formData, teamSize: size, teammates: newTeammates });
                        }}
                        className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:border-brand-sky focus:outline-none transition-colors text-foreground"
                        placeholder="Enter number of team members"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Your Role *
                      </label>
                      <select
                        value={formData.userRole}
                        onChange={(e) =>
                          setFormData({ ...formData, userRole: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:border-brand-sky focus:outline-none transition-colors text-foreground"
                      >
                        <option value="">Select your role</option>
                        {commonRoles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Team Member Email Invitations */}
                  {Number(formData.teamSize) > 1 && (
                    <div className="bg-muted border border-border rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="h-4 w-4 text-cyan-700 dark:text-brand-sky" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        <p className="text-sm font-medium text-foreground">Invite Team Members</p>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        Send email invitations to your {Number(formData.teamSize) - 1} teammate{Number(formData.teamSize) > 2 ? 's' : ''} to join your application.
                      </p>
                      <div className="space-y-4">
                        {formData.teammates.map((teammate, i) => (
                          <div key={i} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-sky/15 to-brand-purple/15 text-xs font-bold text-cyan-700 dark:text-brand-sky">
                                {i + 1}
                              </div>
                              <input
                                type="email"
                                value={teammate.email}
                                onChange={(e) => {
                                  const newTeammates = [...formData.teammates];
                                  newTeammates[i].email = e.target.value;
                                  setFormData({ ...formData, teammates: newTeammates });
                                }}
                                placeholder={`teammate${i + 1}@email.com`}
                                className="flex-1 px-3 py-2.5 bg-card rounded-lg border border-border text-sm text-foreground outline-none focus:border-brand-sky/50 placeholder:text-muted-foreground/40 transition-all"
                              />
                            </div>
                            <div className="pl-10">
                              <select
                                value={teammate.role}
                                onChange={(e) => {
                                  const newTeammates = [...formData.teammates];
                                  newTeammates[i].role = e.target.value;
                                  setFormData({ ...formData, teammates: newTeammates });
                                }}
                                className="w-full px-3 py-2.5 bg-card border border-border rounded-lg focus:border-brand-sky focus:outline-none transition-colors text-sm text-foreground"
                              >
                                <option value="">Select teammate role</option>
                                {commonRoles.map((role) => (
                                  <option key={role} value={role}>
                                    {role}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tech Stack Used
                    </label>
                    <input
                      type="text"
                      value={formData.techStack}
                      onChange={(e) =>
                        setFormData({ ...formData, techStack: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:border-brand-sky focus:outline-none transition-colors text-foreground"
                      placeholder="e.g., React, Python, TensorFlow, Qiskit"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Pitch Deck (PDF, max 10MB)
                    </label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-brand-sky/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileUpload(e, 'pitchDeck')}
                        className="hidden"
                        id="program-deck-upload"
                      />
                      <label htmlFor="program-deck-upload" className="cursor-pointer">
                        <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {formData.pitchDeck
                            ? formData.pitchDeck.name
                            : 'Upload your pitch deck'}
                        </p>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-brand-sky/10 rounded-lg border border-brand-sky/30">
                    <input
                      type="checkbox"
                      id="program-terms"
                      checked={formData.agreeToTerms}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          agreeToTerms: e.target.checked,
                        })
                      }
                      className="mt-1 w-5 h-5 rounded accent-brand-sky"
                    />
                    <label
                      htmlFor="program-terms"
                      className="text-sm text-foreground/90"
                    >
                      I agree to the terms and conditions. I understand that Q-AI
                      Hub provides IP protection and confidentiality for all
                      submissions.
                    </label>
                  </div>

                  <GradientButton
                    fullWidth
                    disabled={!formData.agreeToTerms}
                    onClick={handleSubmit}
                    className={`!py-4 ${!formData.agreeToTerms
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                      }`}
                  >
                    Submit Application
                  </GradientButton>
                </div>
              </div>
            </GlassCard>

            <button
              onClick={() => setCurrentStep(2)}
              className="px-6 py-3 rounded-full font-semibold border-2 border-border text-foreground hover:bg-foreground/5 transition-all flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
          </div>
        )}

        {/* Back to Home Link */}
        <div className="text-center mt-8">
          <Link
            to="/"
            className="text-cyan-700 dark:text-brand-sky hover:text-emerald-600 dark:text-brand-mint transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

