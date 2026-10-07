import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface RequireAuthProps {
  children: ReactNode;
  allowedRoles?: string[];
  // Roles that must not use this route (e.g. ADMIN on participant-only pages)
  deniedRoles?: string[];
}

export function RequireAuth({ children, allowedRoles, deniedRoles }: RequireAuthProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // The session is the HttpOnly cookie; the API client redirects to /login once it has expired
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const userRole = localStorage.getItem('userRole')?.replace(/^ROLE_/i, '').toUpperCase();
  const normalizedAllowedRoles = allowedRoles?.map((r) => r.replace(/^ROLE_/i, '').toUpperCase());
  const isDenied = !!userRole && !!deniedRoles?.some((r) => r.replace(/^ROLE_/i, '').toUpperCase() === userRole);
  const homePath = userRole === 'ADMIN' ? '/admin' : '/dashboard';

  useEffect(() => {
    if (!isLoggedIn) {
      const redirectPath = location.pathname + location.search;
      navigate(
        `/login?redirect=${encodeURIComponent(redirectPath)}`,
        {
          state: {
            returnUrl: redirectPath,
            eventName: (location.state as any)?.eventName,
          },
          replace: true,
        }
      );
    } else if (isDenied || (normalizedAllowedRoles && userRole && !normalizedAllowedRoles.includes(userRole))) {
      // User is logged in but this route is not for their role
      navigate(homePath, { replace: true });
    }
  }, [location, navigate, isLoggedIn, userRole, normalizedAllowedRoles, isDenied, homePath]);

  if (!isLoggedIn) {
    return null;
  }

  if (isDenied || (normalizedAllowedRoles && userRole && !normalizedAllowedRoles.includes(userRole))) {
    return null;
  }

  return <>{children}</>;
}

