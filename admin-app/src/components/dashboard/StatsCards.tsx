import { Radio, Tv, Users, Video } from 'lucide-react';

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  subtitle?: string;
}

interface StatsCardsProps {
  stats?: StatCard[];
}

const defaultStats: StatCard[] = [
  {
    label: 'Total Users',
    value: '-',
    icon: Users,
    subtitle: 'Loading...',
  },
  {
    label: 'Total Channels',
    value: '-',
    icon: Radio,
    subtitle: 'Loading...',
  },
  {
    label: 'Total Videos',
    value: '-',
    icon: Video,
    subtitle: 'Loading...',
  },
  {
    label: 'Live Streams',
    value: '-',
    icon: Tv,
    subtitle: 'Loading...',
  },
];

const StatsCards = ({ stats = defaultStats }: StatsCardsProps) => {
  // Determine grid columns based on number of stats
  const gridCols = stats.length === 5 
    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' 
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className={`grid ${gridCols} gap-4 md:gap-6`}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div 
            key={index}
            className="bg-white/90 backdrop-blur-sm p-4 md:p-6 rounded-2xl border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300"
            style={{
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#666666]">{stat.label}</span>
              <Icon className="text-[#0000FF]" size={20} />
            </div>
            <p className="text-2xl md:text-3xl font-bold text-black">{stat.value}</p>
            {stat.subtitle && (
              <p className="text-xs text-[#666666] mt-1">{stat.subtitle}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;
