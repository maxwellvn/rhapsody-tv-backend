import { LogOut, Menu, X, LayoutDashboard, Users, Tv, Video, Calendar, Radio } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/utils/constants';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: ROUTES.DASHBOARD },
  { label: 'Users', icon: Users, path: ROUTES.USERS },
  { label: 'Channels', icon: Tv, path: ROUTES.CHANNELS },
  { label: 'Videos', icon: Video, path: ROUTES.VIDEOS },
  { label: 'Programs', icon: Calendar, path: ROUTES.PROGRAMS },
  { label: 'Livestreams', icon: Radio, path: ROUTES.LIVESTREAMS },
];

const DashboardHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === ROUTES.DASHBOARD) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-[#D0D0D0]/50 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo Only */}
          <div className="flex items-center">
            <img 
              src="/assets/logo/Logo.png" 
              alt="Rhapsody TV Logo" 
              className="h-8 w-auto md:h-10"
            />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-[#666666]">
              <span className="text-sm">Welcome,</span>
              <span className="text-sm font-semibold text-black">{user?.fullName || 'Admin'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-[#0000FF] to-[#0000CC] text-white rounded-lg hover:from-[#0000CC] hover:to-[#000099] transition-all duration-300 font-medium text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              style={{
                boxShadow: '0 4px 15px rgba(0, 0, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              }}
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-[#666666] hover:text-black transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[#D0D0D0] bg-white/95 backdrop-blur-md">
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center gap-2 text-[#666666] pb-3 border-b border-[#D0D0D0]">
              <span className="text-sm">Welcome,</span>
              <span className="text-sm font-semibold text-black">{user?.fullName || 'Admin'}</span>
            </div>
            
            {/* Mobile Navigation Links */}
            <nav className="py-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      active
                        ? 'bg-[#0000FF] text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                    )}
                  >
                    <Icon className={cn('w-5 h-5', active ? 'text-white' : 'text-gray-500')} />
                    <span className="font-medium text-sm">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            
            <div className="pt-2 border-t border-[#D0D0D0]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-linear-to-r from-[#0000FF] to-[#0000CC] text-white rounded-lg hover:from-[#0000CC] hover:to-[#000099] transition-all duration-300 font-medium text-sm shadow-lg hover:shadow-xl"
                style={{
                  boxShadow: '0 4px 15px rgba(0, 0, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                }}
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default DashboardHeader;
