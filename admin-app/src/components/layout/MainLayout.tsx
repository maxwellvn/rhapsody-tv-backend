import { useState } from 'react';
import { cn } from '@/lib/utils';
import DashboardHeader from './DashboardHeader';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';

interface MainLayoutProps {
  children: React.ReactNode;
  showBreadcrumbs?: boolean;
}

const MainLayout = ({ children, showBreadcrumbs = true }: MainLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <DashboardHeader />
      
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-300 pt-6 pb-12 px-4 sm:px-6 lg:px-8',
          'md:ml-64',
          sidebarCollapsed && 'md:ml-16'
        )}
      >
        <div className="max-w-6xl mx-auto">
          {showBreadcrumbs && <Breadcrumbs />}
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
