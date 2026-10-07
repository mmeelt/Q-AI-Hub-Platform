import { useEffect, useRef } from 'react';
import { useTheme } from '../theme/ThemeProvider';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const CONNECTION_DISTANCE = 150;
const LIGHT_DOTS = ['rgba(0, 229, 255, 0.5)', 'rgba(0, 245, 160, 0.5)', 'rgba(123, 47, 255, 0.4)'];

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  // Read inside the animation loop so a theme switch recolors without restarting it
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Fewer particles on small screens: the connection pass is O(n²)
    const particleCount = window.innerWidth < 768 ? 35 : 70;
    const particles: Particle[] = [];
    let frameId = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      });
    }

    const draw = () => {
      const light = themeRef.current === 'light';
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!reducedMotion) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = light ? LIGHT_DOTS[i % 3] : 'rgba(0, 245, 160, 0.3)';
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const o = particles[j];
          const dx = p.x - o.x;
          const dy = p.y - o.y;
          const distSq = dx * dx + dy * dy;
          if (distSq >= CONNECTION_DISTANCE * CONNECTION_DISTANCE) continue;
          const opacity = (1 - Math.sqrt(distSq) / CONNECTION_DISTANCE) * 0.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(o.x, o.y);
          ctx.strokeStyle = light
            ? (i % 2 === 0 ? `rgba(0, 229, 255, ${opacity * 1.5})` : `rgba(123, 47, 255, ${opacity * 1.2})`)
            : `rgba(0, 217, 245, ${opacity})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    };

    const animate = () => {
      draw();
      frameId = requestAnimationFrame(animate);
    };

    if (reducedMotion) {
      draw(); // static constellation, no animation
    } else {
      animate();
    }

    return () => {
      cancelAnimationFrame(frameId); // stop the loop when the page unmounts
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-0 ${theme === 'dark' ? 'bg-brand-navy' : 'bg-background'}`}
    />
  );
}
