import { motion, AnimatePresence } from 'motion/react';
import { X, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';

interface AuthInterceptModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventName?: string;
  eventDate?: string;
  returnUrl?: string;
}

export function AuthInterceptModal({ 
  isOpen, 
  onClose, 
  eventName, 
  eventDate,
  returnUrl 
}: AuthInterceptModalProps) {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login', { state: { returnUrl, eventName } });
  };

  const handleRegister = () => {
    navigate('/register', { state: { returnUrl, eventName } });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-card/95 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={24} />
            </button>

            {/* Content */}
            <div className="text-center space-y-6">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full border-2 border-border bg-foreground/10 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                  <div className="w-full h-full rounded-full flex items-center justify-center">
                    <Lock className="text-foreground/90" size={28} />
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <h3 className="text-2xl mb-2">Sign in to Apply</h3>
                <p className="text-muted-foreground">
                  Log in or create your account to submit your application and track your progress.
                </p>
              </div>

              {/* Event Context */}
              {eventName && (
                <div className="bg-card rounded-xl p-4 border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Applying to</p>
                  <p className="text-foreground">{eventName}</p>
                  {eventDate && <p className="text-xs text-muted-foreground mt-1">{eventDate}</p>}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <Button variant="primary" fullWidth onClick={handleLogin}>
                  Log In
                </Button>
                <Button variant="ghost" fullWidth onClick={handleRegister}>
                  Create Account
                </Button>
              </div>

              {/* Helper text */}
              <p className="text-xs text-muted-foreground">
                Your application will resume after login
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
