import { Film, Radio, Tv, Users, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';

interface MenuItem {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  route: string;
  description: string;
  color: string;
  iconColor: string;
}

const menuItems: MenuItem[] = [
  {
    title: 'Users',
    icon: Users,
    route: ROUTES.USERS,
    description: 'Manage user accounts and profiles',
    color: 'bg-blue-50 hover:bg-blue-100',
    iconColor: 'text-[#0000FF]',
  },
  {
    title: 'Channels',
    icon: Radio,
    route: ROUTES.CHANNELS,
    description: 'Manage TV channels and content',
    color: 'bg-purple-50 hover:bg-purple-100',
    iconColor: 'text-purple-600',
  },
  {
    title: 'Videos',
    icon: Video,
    route: ROUTES.VIDEOS,
    description: 'Manage video content library',
    color: 'bg-red-50 hover:bg-red-100',
    iconColor: 'text-red-600',
  },
  {
    title: 'Programs',
    icon: Film,
    route: ROUTES.PROGRAMS,
    description: 'Manage program schedules',
    color: 'bg-green-50 hover:bg-green-100',
    iconColor: 'text-green-600',
  },
  {
    title: 'Livestreams',
    icon: Tv,
    route: ROUTES.LIVESTREAMS,
    description: 'Manage live streaming content',
    color: 'bg-orange-50 hover:bg-orange-100',
    iconColor: 'text-orange-600',
  },
];

const MenuGrid = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {menuItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.route}
            onClick={() => navigate(item.route)}
            className="group bg-white/90 backdrop-blur-sm p-5 md:p-6 rounded-2xl border border-white/50 hover:border-[#0000FF]/50 hover:shadow-2xl transition-all duration-300 text-left transform hover:-translate-y-1"
            style={{
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
            }}
          >
            <div className="flex items-start gap-4 mb-3">
              <div 
                className={`p-3 rounded-xl ${item.color} transition-all duration-300 shadow-lg group-hover:shadow-xl`}
                style={{
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                }}
              >
                <Icon className={item.iconColor} size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg md:text-xl font-semibold text-black mb-1 group-hover:text-[#0000FF] transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-[#666666] leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
            <div className="flex items-center text-[#0000FF] text-sm font-medium mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Manage {item.title}</span>
              <svg 
                className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default MenuGrid;
