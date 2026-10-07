import { Linkedin, Github, Instagram } from 'lucide-react';
import { Logo } from '../common/Logo';

export function Footer() {
  return (
    <footer className="relative z-10 bg-background border-t border-border py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Left: Logo + Tagline + Socials */}
          <div className="space-y-4">
            <Logo size="sm" />
            <p className="text-muted-foreground text-sm">
              The Gateway to Tech Ventures
            </p>
            <div className="flex gap-4">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-600 dark:text-brand-mint transition-colors"
              >
                <Linkedin size={20} />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-600 dark:text-brand-mint transition-colors"
              >
                <Github size={20} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-600 dark:text-brand-mint transition-colors"
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Center: Quick Links */}
          <div>
            <h4 className="text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="#vision" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Vision
                </a>
              </li>
              <li>
                <a href="#programs" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Programs
                </a>
              </li>
              <li>
                <a href="#events" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Events
                </a>
              </li>
              <li>
                <a href="#apply" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Apply
                </a>
              </li>
            </ul>
          </div>

          {/* Right: Contact */}
          <div>
            <h4 className="text-foreground mb-4">Contact</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>ENICarthage</p>
              <p>Technological Campus</p>
              <p>contact@qai-hub.tn</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© 2026 Q-AI Hub. All rights reserved. Powered by ENICarthage</p>
        </div>
      </div>
    </footer>
  );
}
