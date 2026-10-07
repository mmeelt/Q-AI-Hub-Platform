import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, Sparkles, Loader2, Wand2, Check, Rocket, Brain, Calculator, Wifi, Building2, CalendarDays, MapPin } from 'lucide-react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { Navigation } from '../../components/layout/Navigation';
import { Footer } from '../../components/layout/Footer';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { AuthInterceptModal } from '../../components/auth/AuthInterceptModal';
import { FadeInSection } from '../../components/effects/FadeInSection';
import { FloatingGlassPanel } from '../../components/common/FloatingGlassPanel';
import { api } from '../../services/api';
import { toast } from 'sonner';



export function LandingPage() {
  const navigate = useNavigate();
  const isAdmin = (localStorage.getItem('userRole') || '').toUpperCase() === 'ADMIN';
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<{ id: number; title: string; axis: string } | null>(null);
  const [stats, setStats] = useState({ startups: 0, members: 0, partners: 0, axes: 0 });
  const [events, setEvents] = useState<any[]>([]);
  // AI Generator State
  const [rawInput, setRawInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiOutput, setAiOutput] = useState('');

  useEffect(() => {
    // Load real events from backend
    const loadEvents = async () => {
      try {
        const eventData = await api.getEvents();
        setEvents(eventData || []);
      } catch (error) {
        console.error('Failed to load events:', error);
        setEvents([]);
      }
    };

    loadEvents();
  }, []);

  const handleGenerateDescription = async () => {
    if (!rawInput.trim()) return;
    setIsGenerating(true);
    setAiOutput('');
    
    try {
      const data = await api.refineDescription(rawInput);
      setAiOutput(data.refinedDescription);
    } catch (error) {
      console.error('Failed to generate:', error);
      toast.error('AI Service is temporarily unavailable. Please check backend connection.');
      // Fallback for demo
      setAiOutput('Could not reach Gemini. Please ensure the Spring Boot backend is running on port 8081.');
    } finally {
      setIsGenerating(false);
    }
  };



  const handleProgramClick = (programId: number, title: string, axis: string) => {
    setSelectedProgram({ id: programId, title, axis });
    setAuthModalOpen(true);
  };

  // Animate stats on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const animate = (target: number, setter: (val: number) => void) => {
              let current = 0;
              const increment = target / 50;
              const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                  setter(target);
                  clearInterval(timer);
                } else {
                  setter(Math.floor(current));
                }
              }, 30);
            };

            animate(50, (val) => setStats(prev => ({ ...prev, startups: val })));
            animate(200, (val) => setStats(prev => ({ ...prev, members: val })));
            animate(15, (val) => setStats(prev => ({ ...prev, partners: val })));
            animate(5, (val) => setStats(prev => ({ ...prev, axes: val })));
          }
        });
      },
      { threshold: 0.5 }
    );

    const statsElement = document.getElementById('stats-section');
    if (statsElement) observer.observe(statsElement);

    return () => observer.disconnect();
  }, []);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0.3]);

  const PILLARS = [
    {
      icon: Rocket,
      title: 'Entrepreneurship',
      description: 'We empower students and innovators to transform bold ideas into scalable startups through mentorship, business modeling, and a vibrant entrepreneurial ecosystem.',
    },
    {
      icon: Brain,
      title: 'Artificial Intelligence',
      description: 'Advancing AI research and applications — from deep learning to quantum-enhanced algorithms — to solve complex real-world problems at scale.',
    },
    {
      icon: Calculator,
      title: 'Mathematics',
      description: 'Bridging theoretical mathematics with applied sciences, cultivating the rigorous analytical foundations required to lead in quantum computing and AI.',
    },
    {
      icon: Wifi,
      title: 'Internet of Things',
      description: 'Connecting intelligent devices to create smart ecosystems — building the infrastructure for a data-driven future through embedded systems and edge AI.',
    },
    {
      icon: Building2,
      title: 'Incubation',
      description: 'Providing startups with the resources, networks, and strategic guidance needed to grow from prototype to market — turning innovation into sustainable impact.',
    },
  ];

  return (
    <div className="min-h-screen relative">
      <ParticleBackground />
      <Navigation />

      {/* Hero Section – parallax + big bold typography + white space */}
      <section ref={heroRef} className="relative z-10 min-h-screen flex items-center justify-center px-6 pt-24 pb-32">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="text-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="flex justify-center"
          >
            <Logo size="lg" showText={false} />
          </motion.div>
          <motion.h1
            className="text-6xl md:text-8xl font-extrabold mt-12 mb-8 tracking-tight text-foreground leading-[1.1] drop-shadow-lg dark:drop-shadow-[0_2px_20px_rgba(0,0,0,0.3)]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            The Gateway to Tech Ventures
          </motion.h1>
          <motion.p
            className="text-xl md:text-2xl text-muted-foreground mb-16 max-w-2xl mx-auto font-medium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Incubating the next generation of Quantum-AI startups at ENICarthage
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row gap-5 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            {!isAdmin && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button variant="primary" onClick={() => setAuthModalOpen(true)}>
                Apply Now
              </Button>
            </motion.div>
            )}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="ghost"
                onClick={() => document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Discover Our Vision
              </Button>
            </motion.div>
            {!isAdmin && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                onClick={() => navigate('/track')}
              >
                Track Application
              </Button>
            </motion.div>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* Featured Events Section */}
      {events.length > 0 && (
        <section className="relative z-10 py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <FadeInSection variant="fade-up" className="text-center mb-16">
              <p className="uppercase tracking-[0.25em] text-xs text-muted-foreground mb-4 font-medium">
                Upcoming Events
              </p>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                Featured Events
              </h2>
              <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
                Discover our latest workshops, hackathons, and incubation programs
              </p>
            </FadeInSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.slice(0, 6).map((event: any, index: number) => (
                <motion.div
                  key={event.eventId ?? event.id ?? index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="group"
                >
                  <div className="h-full p-px rounded-2xl bg-gradient-to-br from-foreground/10 via-transparent to-foreground/5 hover:from-foreground/15 hover:to-foreground/5 transition-all duration-500">
                    <div className="relative h-full rounded-[calc(1rem-1px)] p-6 flex flex-col border border-border/40 bg-card/50 group-hover:border-primary/20 transition-all duration-500 shadow-sm">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-primary/10 text-primary border-primary/30">
                          {event.category || 'Event'}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                          Open
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-foreground/90 transition-colors leading-tight">
                        {event.title}
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-grow">
                        {event.description || 'Join us for an exciting event focused on innovation and entrepreneurship.'}
                      </p>

                      {/* Meta info */}
                      <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarDays size={14} className="text-primary/70" />
                          <span>{event.startDate ? new Date(event.startDate).toLocaleDateString() : 'Date to be announced'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin size={14} className="text-primary/70" />
                          <span>{event.location || 'Online'}</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-auto">
                        <Button
                          variant="primary"
                          fullWidth
                          onClick={() => navigate(`/events`)}
                          className="text-sm"
                        >
                          Learn More
                          <ArrowRight size={16} className="ml-2" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* View All Events Button */}
            <div className="text-center mt-12">
              <Button
                variant="outline"
                onClick={() => navigate('/events')}
                className="px-8 py-3"
              >
                View All Events
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Programs Section */}
      <section id="programs" className="relative z-10 py-32 px-6 bg-gradient-to-b from-transparent to-primary/5">
        <div className="max-w-7xl mx-auto">
          <FadeInSection variant="fade-up" className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6 uppercase tracking-widest">
              <Sparkles size={14} /> Our Strategic Axes
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
              Five Pillars of Innovation
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive approach to fostering Quantum-AI entrepreneurship
            </p>
          </FadeInSection>

          {/* Compact responsive grid: 1 column on phones, 2 on tablets, 3 on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {PILLARS.map((pillar, index) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
              >
                <div className="group relative h-full rounded-2xl border border-border bg-card/70 backdrop-blur-xl p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                      <pillar.icon size={22} strokeWidth={1.75} />
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-muted-foreground/60">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{pillar.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section – before Partners (stats) */}
      <section id="about" className="relative z-10 py-24 md:py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <FadeInSection variant="fade-up" className="text-center mb-12">
            <p className="uppercase tracking-[0.25em] text-xs text-muted-foreground mb-4 font-medium">
              About
            </p>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-10 text-foreground">
              The Q-AI Hub
            </h2>
          </FadeInSection>
          <div className="space-y-6 text-muted-foreground text-base md:text-lg leading-relaxed">
            <p>
              The Q-AI Hub is a pioneering research and innovation initiative hosted at ENICarthage, University of Carthage, Tunisia, positioned at the forefront of the convergence between Quantum Computing and Artificial Intelligence.
            </p>
            <p>
              Our mission is to explore, design, develop, validate, and deploy hybrid Quantum-AI solutions to address critical real-world challenges in health, environment, and beyond.
            </p>
            <p>
              We also train and mentor students to anticipate the quantum era and launch impactful startups, fostering a new generation of tech entrepreneurs equipped to lead in tomorrow&apos;s deep-tech landscape.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats-section" className="relative z-10 py-32">
        <div className="max-w-7xl mx-auto px-6">
          <FloatingGlassPanel depth="lg" className="p-12 md:p-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-12 text-center">
              {[
                { value: stats.startups, label: 'Startups', suffix: '+' },
                { value: stats.members, label: 'Members', suffix: '+' },
                { value: stats.partners, label: 'Partners', suffix: '' },
                { value: stats.axes, label: 'Axes', suffix: '' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-5xl md:text-7xl font-extrabold mb-2 text-foreground tracking-tight drop-shadow-md dark:drop-shadow-[0_2px_16px_rgba(0,0,0,0.2)]">
                    {stat.value}{stat.suffix}
                  </div>
                  <div className="text-muted-foreground font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </FloatingGlassPanel>
        </div>
      </section>

      {/* AI Description Generator Demo Section */}
      <section id="ai-demo" className="relative z-10 py-32 px-6 bg-gradient-to-b from-transparent to-primary/5">
        <div className="max-w-4xl mx-auto">
          <FadeInSection variant="fade-up" className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6 uppercase tracking-widest">
              <Sparkles size={14} /> AI Strategy Engine
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
              Refine Your Startup Vision
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Use AI to transform your raw ideas into compelling, professional descriptions
            </p>
          </FadeInSection>
          <FloatingGlassPanel depth="md" className="p-8 md:p-12 overflow-hidden">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">What are you building?</label>
                <textarea 
                  className="w-full h-32 bg-background/50 border border-border rounded-xl p-4 focus:ring-2 focus:ring-primary/50 transition-all outline-none text-foreground placeholder:text-muted-foreground/30"
                  placeholder="Describe your startup in raw terms..."
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                />
              </div>

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button 
                  variant="primary" 
                  className="w-full justify-center gap-3 py-6 text-lg"
                  onClick={handleGenerateDescription}
                  disabled={isGenerating || !rawInput.trim()}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Optimizing Pitch...
                    </>
                  ) : (
                    <>
                      <Wand2 size={20} />
                      Generate Professional Description
                    </>
                  )}
                </Button>
              </motion.div>

              {aiOutput && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 p-6 rounded-2xl bg-primary/5 border border-primary/10 relative group"
                >
                  <div className="absolute top-4 right-4 text-primary/30">
                    <Sparkles size={24} />
                  </div>
                  <h4 className="text-primary font-bold text-sm uppercase tracking-widest mb-3">AI Refined Strategy</h4>
                  <p className="text-foreground leading-relaxed italic text-lg font-medium">
                    {aiOutput}
                  </p>
                  <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <Button 
                      variant="primary" 
                      onClick={() => {
                        setRawInput(aiOutput);
                        setAiOutput('');
                      }}
                      className="flex-1 justify-center gap-2"
                    >
                      <Check size={18} /> Replace with AI Version
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => setAiOutput('')}
                      className="flex-1 justify-center bg-background/50 hover:bg-background/80"
                    >
                      Keep Original
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </FloatingGlassPanel>
        </div>
      </section>


      <Footer />

      <AuthInterceptModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setSelectedProgram(null);
        }}
        eventName={selectedProgram?.title}
        eventDate={selectedProgram?.axis}
        returnUrl={selectedProgram ? `/programs/${selectedProgram.id}/apply` : undefined}
      />
    </div>
  );
}
