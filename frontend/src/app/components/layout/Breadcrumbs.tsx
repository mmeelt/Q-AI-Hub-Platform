import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs() {
  const location = useLocation();
  
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const path = location.pathname;
    const pathSegments = path.split('/').filter(segment => segment);
    
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/' }
    ];

    if (path.startsWith('/admin')) {
      breadcrumbs.push({ label: 'Admin', href: '/admin/dashboard' });
      
      if (path.includes('/events')) {
        if (path.includes('/create')) {
          breadcrumbs.push({ label: 'Events', href: '/admin/events' });
          breadcrumbs.push({ label: 'Create Event' });
        } else if (path.includes('/edit')) {
          breadcrumbs.push({ label: 'Events', href: '/admin/events' });
          breadcrumbs.push({ label: 'Edit Event' });
        } else {
          breadcrumbs.push({ label: 'Events' });
        }
      } else if (path.includes('/users')) {
        if (path.includes('/invite')) {
          breadcrumbs.push({ label: 'Users', href: '/admin/users' });
          breadcrumbs.push({ label: 'Invite User' });
        } else {
          breadcrumbs.push({ label: 'Users' });
        }
      } else if (path.includes('/startups')) {
        breadcrumbs.push({ label: 'Startups' });
      } else if (path.includes('/pitch')) {
        breadcrumbs.push({ label: 'Pitch Evaluation' });
      } else if (path.includes('/settings')) {
        breadcrumbs.push({ label: 'Settings' });
      } else if (path.includes('/phases')) {
        breadcrumbs.push({ label: 'Events', href: '/admin/events' });
        breadcrumbs.push({ label: 'Phase Submissions' });
      } else {
        breadcrumbs.push({ label: 'Dashboard' });
      }
    } else if (path.startsWith('/events')) {
      breadcrumbs.push({ label: 'Events' });
      if (path.includes('/apply') || path.includes('/register')) {
        breadcrumbs.push({ label: 'Application' });
      }
    } else if (path.startsWith('/programs')) {
      breadcrumbs.push({ label: 'Programs' });
      if (path.includes('/apply')) {
        breadcrumbs.push({ label: 'Application' });
      }
    } else if (path.startsWith('/startup')) {
      breadcrumbs.push({ label: 'My Startup' });
      if (path.includes('/invite')) {
        breadcrumbs.push({ label: 'Invite Teammate' });
      }
    } else if (path.startsWith('/dashboard')) {
      breadcrumbs.push({ label: 'Dashboard' });
    } else if (path.startsWith('/apply')) {
      breadcrumbs.push({ label: 'Application' });
      if (path.includes('/questions')) {
        breadcrumbs.push({ label: 'Questions' });
      }
    } else if (path.startsWith('/track')) {
      breadcrumbs.push({ label: 'Track Application' });
    } else if (path === '/login') {
      breadcrumbs.push({ label: 'Login' });
    } else if (path === '/register') {
      breadcrumbs.push({ label: 'Register' });
    } else if (path === '/otp') {
      breadcrumbs.push({ label: 'Verification' });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          {index === 0 && <Home className="h-4 w-4" />}
          {item.href ? (
            <Link
              to={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
          {index < breadcrumbs.length - 1 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      ))}
    </nav>
  );
}
