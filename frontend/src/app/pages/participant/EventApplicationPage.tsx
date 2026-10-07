import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Check, Sparkles, Video, Loader2, X } from 'lucide-react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { PitchVideo } from '../../components/common/PitchVideo';

const MAX_VIDEO_MB = 200;
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'm4v'];

const sectors = [
  'HealthTech', 'FinTech', 'EdTech', 'GreenTech', 'DeepTech', 'AgriTech', 'Cybersecurity',
  'E-commerce', 'SaaS', 'AI/ML', 'Blockchain', 'IoT', 'Biotech', 'CleanTech', 'Other'
];

const commonRoles = [
  'CEO / Founder', 'CTO / Co-Founder', 'Lead Developer', 'UI/UX Designer', 'Product Manager', 'Marketing Lead', 'Other'
];

export function EventApplicationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [useAiVersion, setUseAiVersion] = useState(false);

  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startupId, setStartupId] = useState<string | null>(null);
  const [myStartups, setMyStartups] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    projectName: '',
    businessSector: '',
    companyTagline: '',
    logo: null as File | null,
    logoUrl: '',
    pitchOriginal: '',
    pitchEnhanced: '',
    githubUrl: '',
    website: '',
    teamSize: 1,
    userRole: '',
    userRoleOther: '',
    teammates: [] as { email: string; role: string; roleOther: string }[],
    techStackText: '',
    techStack: [] as string[],
    pitchDeck: null as File | null,
    pitchDeckUrl: '',
    pitchVideo: null as File | null,
    pitchVideoUrl: '',
    acceptTerms: false,
  });

  const [aiPitch, setAiPitch] = useState({
    problem: '',
    solution: '',
    targetMarket: '',
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 1. Load Event Details
        if (id) {
          const fetchedEvent = await api.getEventById(id);
          setEvent(fetchedEvent);
        }

        // 2. Load User Profile and Startup for pre-filling
        if (localStorage.getItem('isLoggedIn') === 'true') {
          try {
            const startups = await api.getMyStartup();
            if (startups && Array.isArray(startups) && startups.length > 0) {
              setMyStartups(startups);
              selectStartup(startups[0]);
            }
          } catch (startupError) {
            console.warn('No existing startup found');
          }
        }
      } catch (e) {
        toast.error('Failed to load event details');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);



  // Pick one of the user's existing startups (or null to create a new one) and pre-fill the form
  const selectStartup = (startup: any | null) => {
    setStartupId(startup ? (startup.startupId || startup.id) : null);
    setFormData(prev => ({
      ...prev,
      projectName: startup?.projectName || '',
      businessSector: startup?.businessSector || '',
      companyTagline: startup?.companyTagline || '',
      website: startup?.companyWebsiteUrl || startup?.website || '',
      logo: null,
      logoUrl: startup?.companyLogoUrl || startup?.logoUrl || '',
      pitchOriginal: startup?.rawDescription || '',
      githubUrl: startup?.githubUrl || '',
      teamSize: startup?.currentTeamSize || 1,
      pitchDeck: null,
      pitchDeckUrl: startup?.pitchDeckLink || startup?.pitchDeckUrl || '',
      pitchVideo: null,
      pitchVideoUrl: startup?.pitchVideoLink || startup?.pitchVideoUrl || '',
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, logo: e.target.files[0] });
    }
  };

  // Local preview of the chosen video (a blob: URL that only exists in this browser, never saved)
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploadStep, setUploadStep] = useState<{ label: string; percent: number } | null>(null);
  useEffect(() => () => { if (videoPreview) URL.revokeObjectURL(videoPreview); }, [videoPreview]);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!VIDEO_EXTENSIONS.includes(ext)) {
      toast.error('Please choose an MP4, MOV or WebM video');
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`The video is ${(file.size / 1024 / 1024).toFixed(0)} MB. The maximum is ${MAX_VIDEO_MB} MB.`);
      return;
    }
    setVideoPreview(URL.createObjectURL(file));
    setFormData({ ...formData, pitchVideo: file });
  };

  const removeVideo = () => {
    setVideoPreview(null);
    setFormData({ ...formData, pitchVideo: null, pitchVideoUrl: '' });
  };

  const handlePitchDeckUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf' && file.size <= 10 * 1024 * 1024) {
        setFormData({ ...formData, pitchDeck: file });
      } else {
        toast.error('Please upload a PDF file under 10MB');
      }
    }
  };

  const handleEnhanceWithAi = async () => {
    if (!formData.pitchOriginal.trim()) {
      toast.error('Please enter your pitch first');
      return;
    }

    setIsGenerating(true);

    try {
      const result = await api.refineDescription(formData.pitchOriginal);
      
      // Parse the refined description to extract structured components
      const refined = result.refinedDescription;
      
      setAiPitch({
        problem: refined.includes('Problem:') ? refined.split('Problem:')[1].split('Solution:')[0].trim() : refined.substring(0, 200),
        solution: refined.includes('Solution:') ? refined.split('Solution:')[1].split('Market:')[0].trim() : refined.substring(200, 400),
        targetMarket: refined.includes('Market:') || refined.includes('Target Market:') ? 
          refined.split(/Market:|Target Market:/)[1].trim() : refined.substring(400, 600),
      });

      setFormData({
        ...formData,
        pitchEnhanced: refined,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to enhance pitch with AI');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.acceptTerms) {
      toast.error('Please accept the terms to submit');
      return;
    }

    setIsLoading(true);
    try {
      // 1-3. Upload the files. Any failure stops the submission with the server's message
      //      (nothing is silently dropped).
      const upload = async (file: File, folder: string, label: string) => {
        setUploadStep({ label, percent: 0 });
        try {
          return await api.uploadFile(file, folder, percent => setUploadStep({ label, percent }));
        } catch (err: any) {
          throw new Error(`${label}: ${err.message}`);
        }
      };
      const logoUrl = formData.logo ? await upload(formData.logo, 'logos', 'Logo') : '';
      const pitchDeckUrl = formData.pitchDeck ? await upload(formData.pitchDeck, 'pitch-decks', 'Pitch deck') : '';
      const pitchVideoUrl = formData.pitchVideo ? await upload(formData.pitchVideo, 'pitch-videos', 'Pitch video') : '';
      setUploadStep(null);

      // 4. Build/Update Startup Profile
      const startupData = {
        projectName: formData.projectName,
        businessSector: formData.businessSector,
        companyTagline: formData.companyTagline,
        rawDescription: useAiVersion ? formData.pitchEnhanced : formData.pitchOriginal,
        companyWebsiteUrl: formData.website,
        companyLogoUrl: logoUrl || formData.logoUrl,
        pitchDeckLink: pitchDeckUrl || formData.pitchDeckUrl,
        pitchVideoLink: pitchVideoUrl || formData.pitchVideoUrl,
        currentTeamSize: formData.teamSize,
      };

      // An existing startup is linked as-is (its profile is edited from "My Startups");
      // a new one is created from this form.
      let currentStartupId = startupId;
      if (!currentStartupId) {
        const newStartup = await api.createStartup(startupData);
        currentStartupId = newStartup.startupId || newStartup.id;
        if (!currentStartupId) throw new Error('Startup creation failed: No ID returned');
        setStartupId(currentStartupId);
      }

      // 5. Build the answers payload
      const answers = {
        ...startupData,
        githubUrl: formData.githubUrl,
        userRole: formData.userRole,
        teammates: formData.teammates,
        techStack: formData.techStack,
      };

      // 6. Submit application to backend
      const result = await api.submitApplicationWithAnswers({
        targetEventId: String(event.eventId || event.id),
        linkedStartupId: currentStartupId!,
        initialApplicationAnswers: JSON.stringify(answers),
      });

      toast.success('Application submitted successfully!');

      // 7. Show confirmation. Phase 1 questions only open after the admin accepts the
      //    application AND activates Phase 1 (reached from the dashboard).
      setIsSubmitted(true);
      setApplicationCode(result.trackingCode);

    } catch (error: any) {
      toast.error(error.message || 'Submission failed. Please try again.');
    } finally {
      setUploadStep(null);
      setIsLoading(false);
    }
  };

  const [applicationCode, setApplicationCode] = useState('');
  const profileName = localStorage.getItem('userName') || 'Student';

  return (
    <div className="min-h-screen relative">
      <ParticleBackground />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Full user account header */}
        <DashboardHeader
          activeTab=""
          profileName={profileName}
          onTabChange={() => {}}
        />

        <div className="flex-1 py-12 px-6">
        {isLoading ? (
          <div className="max-w-md mx-auto flex flex-col items-center justify-center gap-4 py-20" role="status" aria-live="polite">
            <Loader2 className="animate-spin text-primary" size={40} />
            {uploadStep && (
              <div className="w-full">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-foreground">Uploading {uploadStep.label.toLowerCase()}…</span>
                  <span className="text-muted-foreground tabular-nums">{uploadStep.percent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
                  <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${uploadStep.percent}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Keep this page open until the upload is finished.</p>
              </div>
            )}
          </div>
        ) : !event ? (
          <div className="max-w-3xl mx-auto text-center py-20">
            <h1 className="text-2xl mb-4">Event not found</h1>
            <Button onClick={() => navigate('/events')}>Back to Events</Button>
          </div>
        ) : (
          <>
            {/* Event title */}
            <div className="max-w-3xl mx-auto mb-8">
              <h1 className="text-3xl">{event.title}</h1>
              <p className="text-muted-foreground text-sm mt-1">Application Form</p>
            </div>

        {/* Progress bar */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${currentStep === step
                      ? 'bg-foreground/20 text-foreground border border-border scale-110'
                      : currentStep > step
                        ? 'bg-foreground/10 text-foreground border border-border'
                        : 'bg-card text-muted-foreground border border-border'
                      }`}
                  >
                    {currentStep > step ? <Check size={20} /> : step}
                  </div>
                  <span
                    className={`text-sm ${currentStep >= step ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                  >
                    {step === 1 ? 'Project Info' : step === 2 ? 'AI Pitch' : 'Submit'}
                  </span>
                </div>
                {step < 3 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${currentStep > step ? 'bg-foreground/20' : 'bg-card'
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Steps */}
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              <>
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-background/95 backdrop-blur-xl border border-border rounded-3xl p-8"
                  >
                    <h2 className="text-2xl mb-6">Startup Information</h2>

                    <div className="space-y-6">
                      {myStartups.length > 0 && (
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
                          <label className="block text-sm text-muted-foreground mb-2">Apply with</label>
                          <select
                            value={startupId || ''}
                            onChange={(e) => {
                              const chosen = myStartups.find(s => String(s.startupId || s.id) === e.target.value) || null;
                              selectStartup(chosen);
                            }}
                            className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:border-primary/50"
                          >
                            {myStartups.map(s => (
                              <option key={s.startupId || s.id} value={s.startupId || s.id}>
                                {s.projectName || 'Unnamed startup'}
                              </option>
                            ))}
                            <option value="">+ Create a new startup</option>
                          </select>
                          <p className="text-xs text-muted-foreground mt-2">
                            {startupId
                              ? 'Your existing startup is linked to this application. Its profile is not modified.'
                              : 'A new startup profile will be created from this form.'}
                          </p>
                        </div>
                      )}
                      <Input
                        label="Startup Name"
                        type="text"
                        value={formData.projectName}
                        onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                      />

                      <div>
                        <label className="block text-sm text-muted-foreground mb-2">Sector *</label>
                        <select
                          value={formData.businessSector}
                          onChange={(e) => setFormData({ ...formData, businessSector: e.target.value })}
                          className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground outline-none focus:border-brand-mint transition-colors"
                          required
                        >
                          <option value="">Select a sector</option>
                          {sectors.map((sector) => (
                            <option key={sector} value={sector}>{sector}</option>
                          ))}
                        </select>
                      </div>

                      <Input
                        label="One-line Tagline"
                        type="text"
                        value={formData.companyTagline}
                        onChange={(e) => setFormData({ ...formData, companyTagline: e.target.value })}
                        placeholder="Summarize your idea in one sentence"
                      />

                      <Input
                        label="Website (optional)"
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://yourstartup.com"
                      />

                        <label className="block text-sm text-muted-foreground mb-2">Your Role *</label>
                        <select
                          value={formData.userRole}
                          onChange={(e) => setFormData({ ...formData, userRole: e.target.value, userRoleOther: '' })}
                          className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground outline-none focus:border-brand-mint transition-colors"
                          required
                        >
                          <option value="">Select your role</option>
                          {commonRoles.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                        {formData.userRole === 'Other' && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2">
                            <input
                              type="text"
                              value={formData.userRoleOther}
                              onChange={(e) => setFormData({ ...formData, userRoleOther: e.target.value })}
                              placeholder="Type your role..."
                              className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground outline-none focus:border-brand-mint transition-colors"
                            />
                          </motion.div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <label className="block text-sm text-muted-foreground mb-1">Team Size (Including You)</label>
                        <p className="text-xs text-muted-foreground mb-3">How many people are on your team (including yourself)?</p>
                        <div className="flex gap-2 flex-wrap">
                          {[1, 2, 3, 4, 5, 6].map((n) => {
                            const isSelected = formData.teamSize === n;
                            return (
                              <button
                                key={n}
                                type="button"
                                onClick={() => {
                                  const newTeammates: { email: string; role: string; roleOther: string }[] = [];
                                  for (let i = 0; i < n - 1; i++) {
                                    newTeammates.push(formData.teammates[i] ?? { email: '', role: '', roleOther: '' });
                                  }
                                  setFormData({ ...formData, teamSize: n, teammates: newTeammates });
                                }}
                                className={`w-12 h-12 rounded-xl text-sm font-bold border transition-all duration-200 ${
                                  isSelected
                                    ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                                    : 'bg-card border-border text-muted-foreground hover:border-brand-cyan/50 hover:text-foreground'
                                }`}
                              >
                                {n}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {formData.teamSize > 1 && (
                        <div className="space-y-4 mt-6">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-cyan/15">
                              <svg className="h-4 w-4 text-cyan-500 dark:text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">Invite Your Teammates</p>
                              <p className="text-xs text-muted-foreground">Add the email and role for each team member</p>
                            </div>
                          </div>
                          {formData.teammates.map((teammate, i) => (
                            <div key={i} className="rounded-xl bg-card border border-border p-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-cyan/20 to-brand-purple/20 text-xs font-bold text-cyan-500 dark:text-brand-cyan">
                                  {i + 2}
                                </div>
                                <span className="text-sm font-medium text-foreground">Team Member {i + 2}</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                  type="email"
                                  value={teammate.email}
                                  onChange={(e) => {
                                    const t = [...formData.teammates];
                                    t[i] = { ...t[i], email: e.target.value };
                                    setFormData({ ...formData, teammates: t });
                                  }}
                                  placeholder="Email address"
                                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/40"
                                  required
                                />
                                <select
                                  value={teammate.role}
                                  onChange={(e) => {
                                    const t = [...formData.teammates];
                                    t[i] = { ...t[i], role: e.target.value };
                                    setFormData({ ...formData, teammates: t });
                                  }}
                                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/40"
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
                            </div>
                          ))}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm text-muted-foreground mb-2">Startup Logo</label>
                        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-brand-mint transition-colors cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                            id="logo-upload"
                          />
                          <label htmlFor="logo-upload" className="cursor-pointer">
                            {formData.logo ? (
                              <div>
                                <Check className="w-12 h-12 mx-auto mb-2 text-emerald-600 dark:text-brand-mint" />
                                <p className="text-foreground">{formData.logo.name}</p>
                              </div>
                            ) : (
                              <>
                                <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-muted-foreground">Click or drag your startup logo here</p>
                              </>
                            )}
                          </label>
                        </div>
                      </div>

                      {/* Startup Pitch Video */}
                      <div>
                        <label className="block text-sm text-muted-foreground mb-2">Startup Pitch Video <span className="text-xs text-muted-foreground/60">(optional, max {MAX_VIDEO_MB} MB)</span></label>
                        <input
                          type="file"
                          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v"
                          onChange={handleVideoUpload}
                          className="hidden"
                          id="video-upload"
                        />
                        {videoPreview || formData.pitchVideoUrl ? (
                          <div className="space-y-3">
                            {videoPreview ? (
                              <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-border bg-black">
                                <video src={videoPreview} controls preload="metadata" className="absolute inset-0 w-full h-full object-contain" />
                              </div>
                            ) : (
                              <PitchVideo url={formData.pitchVideoUrl} />
                            )}
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-muted-foreground truncate">
                                {formData.pitchVideo
                                  ? `${formData.pitchVideo.name} · ${(formData.pitchVideo.size / 1024 / 1024).toFixed(1)} MB · uploaded when you submit`
                                  : 'Current pitch video'}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                <label htmlFor="video-upload" className="cursor-pointer px-3 py-1.5 rounded-lg border border-border hover:bg-foreground/5 text-foreground">Replace</label>
                                <button type="button" onClick={removeVideo} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border hover:bg-destructive/10 text-destructive">
                                  <X size={14} /> Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <label htmlFor="video-upload" className="block border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-brand-sky transition-colors cursor-pointer">
                            <Video className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-muted-foreground text-sm">Upload a short video explaining your startup</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">MP4, MOV or WebM · up to {MAX_VIDEO_MB} MB</p>
                          </label>
                        )}
                      </div>

                    <div className="flex justify-end mt-8">
                      <Button
                        variant="primary"
                        onClick={() => setCurrentStep(2)}
                        disabled={!formData.projectName || !formData.businessSector}
                      >
                        Next
                      </Button>
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-background/95 backdrop-blur-xl border border-border rounded-3xl p-8"
                  >
                    <h2 className="text-2xl mb-6">AI Pitch Assistant</h2>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm text-muted-foreground mb-2">
                          Describe your idea in plain language
                        </label>
                        <textarea
                          value={formData.pitchOriginal}
                          onChange={(e) => setFormData({ ...formData, pitchOriginal: e.target.value })}
                          className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground outline-none focus:border-brand-mint transition-colors min-h-[150px] resize-none"
                          placeholder="Tell us about your project, what problem it solves, and who it helps..."
                        />
                        <div className="text-right text-xs text-muted-foreground mt-1">
                          {formData.pitchOriginal.length} characters
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        onClick={handleEnhanceWithAi}
                        disabled={isGenerating || !formData.pitchOriginal.trim()}
                        className="w-full sm:w-auto"
                      >
                        <Sparkles size={18} className="mr-2" />
                        {isGenerating ? 'Enhancing...' : 'Enhance with AI'}
                      </Button>

                      {isGenerating && (
                        <div className="space-y-3">
                          <div className="h-4 bg-card rounded animate-pulse" />
                          <div className="h-4 bg-card rounded animate-pulse w-3/4" />
                          <div className="h-4 bg-card rounded animate-pulse w-5/6" />
                          <p className="text-sm text-muted-foreground text-center">Structuring your pitch...</p>
                        </div>
                      )}

                      {aiPitch.problem && !isGenerating && (
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="bg-card/50 border border-border rounded-xl p-6">
                            <p className="text-xs text-muted-foreground mb-2">Your Original</p>
                            <p className="text-sm text-muted-foreground line-clamp-6">{formData.pitchOriginal}</p>
                          </div>

                          <div className="bg-foreground/10 border border-border rounded-xl p-6 relative">
                            <div className="absolute top-3 right-3 flex items-center gap-1 text-xs text-foreground/80">
                              <Sparkles size={14} />
                              AI Enhanced
                            </div>
                            <div className="space-y-4 mt-2">
                              <div>
                                <p className="text-xs text-red-600 dark:text-brand-red mb-1">Problem</p>
                                <p className="text-sm">{aiPitch.problem}</p>
                              </div>
                              <div>
                                <p className="text-xs text-foreground/80 mb-1">Solution</p>
                                <p className="text-sm">{aiPitch.solution}</p>
                              </div>
                              <div>
                                <p className="text-xs text-foreground/70 mb-1">Target Market</p>
                                <p className="text-sm">{aiPitch.targetMarket}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {aiPitch.problem && !isGenerating && (
                        <div className="flex gap-4">
                          <Button variant="primary" onClick={() => { setUseAiVersion(true); setCurrentStep(3); }}>
                            Use Enhanced Version
                          </Button>
                          <Button variant="ghost" onClick={() => { setUseAiVersion(false); setCurrentStep(3); }}>
                            Keep Original
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between mt-8">
                      <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                        Back
                      </Button>
                      {!aiPitch.problem && (
                        <Button variant="ghost" onClick={() => setCurrentStep(3)}>
                          Skip AI Enhancement
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-background/95 backdrop-blur-xl border border-border rounded-3xl p-8"
                  >
                    <h2 className="text-2xl mb-6">Final Details</h2>

                    <div className="space-y-6">
                      <Input
                        label="GitHub Repository URL"
                        type="url"
                        value={formData.githubUrl}
                        onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                        placeholder="https://github.com/..."
                      />

                      {/* Tech Stack */}
                      <div>
                        <label className="block text-sm text-muted-foreground mb-2">Tech Stack</label>
                        <input
                          type="text"
                          value={formData.techStackText}
                          placeholder="React, Python, TensorFlow... (comma separated)"
                          onChange={(e) => setFormData({ ...formData, techStackText: e.target.value, techStack: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                          className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground outline-none focus:border-brand-mint transition-colors"
                        />
                      </div>


                      {/* Pitch Deck */}
                      <div>
                        <label className="block text-sm text-muted-foreground mb-2">Pitch Deck (PDF, max 10MB)</label>
                        <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-brand-mint transition-colors cursor-pointer">
                          <input type="file" accept=".pdf" onChange={handlePitchDeckUpload} className="hidden" id="deck-upload" />
                          <label htmlFor="deck-upload" className="cursor-pointer">
                            {formData.pitchDeck ? (
                              <div>
                                <Check className="w-10 h-10 mx-auto mb-2 text-emerald-600 dark:text-brand-mint" />
                                <p className="text-foreground">{formData.pitchDeck.name}</p>
                                <p className="text-xs text-muted-foreground">{(formData.pitchDeck.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            ) : (
                              <>
                                <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-muted-foreground">Upload your pitch deck</p>
                              </>
                            )}
                          </label>
                        </div>
                      </div>

                      <div className="bg-card/50 border border-border rounded-xl p-6">
                        <p className="text-xs text-muted-foreground mb-3">Application Summary</p>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-muted-foreground">Project:</span> {formData.projectName}</p>
                          <p><span className="text-muted-foreground">Sector:</span> {formData.businessSector}</p>
                          <p><span className="text-muted-foreground">Team:</span> {formData.teamSize} member{formData.teamSize > 1 ? 's' : ''}</p>
                          <p className="text-muted-foreground line-clamp-2">{useAiVersion ? 'Using AI-enhanced pitch' : formData.pitchOriginal}</p>
                        </div>
                      </div>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.acceptTerms}
                          onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                          className="mt-1 w-5 h-5 rounded border-border"
                        />
                        <span className="text-sm text-muted-foreground">
                          I confirm this is my original work and accept the confidentiality terms
                        </span>
                      </label>
                    </div>

                    <div className="flex justify-between mt-8">
                      <Button variant="ghost" onClick={() => setCurrentStep(2)}>Back</Button>
                      <Button variant="primary" onClick={handleSubmit} disabled={!formData.acceptTerms} className="text-lg px-8">
                        Submit Application
                      </Button>
                    </div>
                  </motion.div>
                )}
              </>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-background/95 backdrop-blur-xl border border-border rounded-3xl p-12 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="w-24 h-24 mx-auto mb-6 rounded-full bg-foreground/10 border border-border flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                >
                  <Check size={48} className="text-foreground" />
                </motion.div>

                <h2 className="text-4xl mb-4">Application Submitted!</h2>
                <p className="text-muted-foreground mb-8">
                  Your application is pending. Please wait for the administrator's decision.
                  You will be notified when it is reviewed and when Phase 1 opens.
                </p>

                <div className="bg-card rounded-xl p-6 mb-8 inline-block">
                  <p className="text-xs text-muted-foreground mb-2">Application Reference ID</p>
                  <p className="text-2xl font-mono text-foreground/90">
                    {applicationCode || 'Pending'}
                  </p>
                </div>

                <div className="mt-6">
                  <Button variant="primary" onClick={() => navigate('/dashboard?tab=applications')}>
                    Track your application
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </>
        )}
        </div>
      </div>
    </div>
  );
}
