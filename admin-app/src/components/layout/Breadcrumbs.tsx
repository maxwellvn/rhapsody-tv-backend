import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { ROUTES } from '@/utils/constants';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

// Map routes to readable labels
const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  users: 'Users',
  channels: 'Channels',
  videos: 'Videos',
  programs: 'Programs',
  livestreams: 'Livestreams',
};

const Breadcrumbs = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  // Don't show breadcrumbs on dashboard
  if (pathSegments.length === 0 || (pathSegments.length === 1 && pathSegments[0] === 'dashboard')) {
    return null;
  }

  const breadcrumbs: BreadcrumbItem[] = [];

  // Build breadcrumb trail
  let currentPath = '';
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Check if it's a known route
    const label = routeLabels[segment];
    
    if (label) {
      breadcrumbs.push({
        label,
        path: index < pathSegments.length - 1 ? currentPath : undefined,
      });
    } else {
      // It's likely an ID - show as "Details" or truncated ID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
      const isObjectId = /^[0-9a-f]{24}$/i.test(segment);
      
      if (isUUID || isObjectId) {
        breadcrumbs.push({
          label: 'Details',
        });
      } else {
        breadcrumbs.push({
          label: segment.charAt(0).toUpperCase() + segment.slice(1),
          path: index < pathSegments.length - 1 ? currentPath : undefined,
        });
      }
    }
  });

  return (
    <nav className="flex items-center gap-2 text-sm mb-6">
      <Link
        to={ROUTES.DASHBOARD}
        className="flex items-center gap-1 text-gray-500 hover:text-[#0000FF] transition-colors"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">Home</span>
      </Link>

      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {crumb.path ? (
            <Link
              to={crumb.path}
              className="text-gray-500 hover:text-[#0000FF] transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">{crumb.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
