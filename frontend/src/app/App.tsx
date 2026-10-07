import { lazy, Suspense, useEffect } from 'react';
import { api } from './services/api';
import { clearAuth, isLoggedIn } from './utils/localStorage';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { RequireAuth } from './components/auth/RequireAuth';
import { ThemeProvider, useTheme } from './components/theme/ThemeProvider';
import { ScrollToTop } from './components/layout/ScrollToTop';

// Each page is downloaded only when it is first visited (smaller initial bundle)
const LandingPage = lazy(() => import('./pages/public/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const OTPPage = lazy(() => import('./pages/auth/OTPPage').then(m => ({ default: m.OTPPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const EventApplicationPage = lazy(() => import('./pages/participant/EventApplicationPage').then(m => ({ default: m.EventApplicationPage })));
const ProgramApplicationPage = lazy(() => import('./pages/participant/ProgramApplicationPage').then(m => ({ default: m.ProgramApplicationPage })));
const ExpertEventPage = lazy(() => import('./pages/expert/ExpertEventPage').then(m => ({ default: m.ExpertEventPage })));
const UserDashboard = lazy(() => import('./pages/participant/UserDashboard').then(m => ({ default: m.UserDashboard })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const CreateEventPage = lazy(() => import('./pages/admin/CreateEventPage').then(m => ({ default: m.CreateEventPage })));
const EditEventPage = lazy(() => import('./pages/admin/EditEventPage').then(m => ({ default: m.EditEventPage })));
const InviteUserPage = lazy(() => import('./pages/admin/InviteUserPage').then(m => ({ default: m.InviteUserPage })));
const EventsPage = lazy(() => import('./pages/public/EventsPage').then(m => ({ default: m.EventsPage })));
const StartupDetailPage = lazy(() => import('./pages/participant/StartupDetailPage').then(m => ({ default: m.StartupDetailPage })));
const QuestionnairePage = lazy(() => import('./pages/participant/QuestionnairePage').then(m => ({ default: m.QuestionnairePage })));
const InviteTeammatePage = lazy(() => import('./pages/participant/InviteTeammatePage').then(m => ({ default: m.InviteTeammatePage })));
const PhaseSubmissionsPage = lazy(() => import('./pages/admin/PhaseSubmissionsPage').then(m => ({ default: m.PhaseSubmissionsPage })));
const TrackPage = lazy(() => import('./pages/public/TrackPage').then(m => ({ default: m.TrackPage })));
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const SimpleEventRegisterPage = lazy(() => import('./pages/public/SimpleEventRegisterPage').then(m => ({ default: m.SimpleEventRegisterPage })));
const CreateStartupProfilePage = lazy(() => import('./pages/participant/CreateStartupProfilePage').then(m => ({ default: m.CreateStartupProfilePage })));
const MyStartupsPage = lazy(() => import('./pages/participant/MyStartupsPage').then(m => ({ default: m.MyStartupsPage })));
const ManageStartupPage = lazy(() => import('./pages/participant/ManageStartupPage').then(m => ({ default: m.ManageStartupPage })));
const InvitationsPage = lazy(() => import('./pages/participant/InvitationsPage').then(m => ({ default: m.InvitationsPage })));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" role="status" aria-live="polite">
      <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster position="bottom-right" theme={theme} richColors closeButton />;
}

function App() {
  // The UI remembers "logged in" in localStorage, but the session itself is the HttpOnly cookie,
  // which disappears when the browser is closed without "Remember me" (or after a logout elsewhere).
  // Check it once at start-up so the site never shows a logged-in state without a session.
  useEffect(() => {
    if (!isLoggedIn()) return;
    api.refreshSession().then(ok => {
      if (!ok) {
        clearAuth();
        window.dispatchEvent(new Event('qa-session-ended'));
      }
    });
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <ScrollToTop />
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/otp" element={<OTPPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/events" element={<EventsPage />} />
          {/* Public: simple events accept guests (name + email), no account or startup needed */}
          <Route path="/events/:id/register" element={<SimpleEventRegisterPage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route
            path="/events/:id/apply"
            element={
              <RequireAuth deniedRoles={['ADMIN']}>
                <EventApplicationPage />
              </RequireAuth>
            }
          />
          <Route
            path="/programs/:id/apply"
            element={
              <RequireAuth deniedRoles={['ADMIN']}>
                <ProgramApplicationPage />
              </RequireAuth>
            }
          />
          <Route
            path="/expert/event/:id"
            element={
              <RequireAuth>
                <ExpertEventPage />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth deniedRoles={['ADMIN']}>
                <UserDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/apply/:type/:id/questions"
            element={
              <RequireAuth deniedRoles={['ADMIN']}>
                <QuestionnairePage />
              </RequireAuth>
            }
          />
          <Route
            path="/startup/:id"
            element={
              <RequireAuth>
                <StartupDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/startup/:id/invite"
            element={
              <RequireAuth>
                <InviteTeammatePage />
              </RequireAuth>
            }
          />
          <Route
            path="/my-startups"
            element={
              <RequireAuth>
                <MyStartupsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/my-startups/:id"
            element={
              <RequireAuth>
                <ManageStartupPage />
              </RequireAuth>
            }
          />
          <Route
            path="/invitations"
            element={
              <RequireAuth>
                <InvitationsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/startup/create"
            element={
              <RequireAuth>
                <CreateStartupProfilePage />
              </RequireAuth>
            }
          />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route
            path="/admin/dashboard"
            element={
              <RequireAuth allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/events"
            element={
              <RequireAuth allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireAuth allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/startups"
            element={
              <RequireAuth allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/pitch"
            element={
              <RequireAuth allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <RequireAuth allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/events/create"
            element={
              <RequireAuth allowedRoles={['ADMIN']}>
                <CreateEventPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/events/:id/edit"
            element={
              <RequireAuth allowedRoles={['ADMIN']}>
                <EditEventPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/users/invite"
            element={
              <RequireAuth allowedRoles={['ADMIN']}>
                <InviteUserPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/phases/:phaseId/submissions"
            element={
              <RequireAuth allowedRoles={['ADMIN']}>
                <PhaseSubmissionsPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>

        <ThemedToaster />
      </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
