import { Radio } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ChannelsChartProps {
  data: Array<{ name: string; videos: number }>;
  isLoading?: boolean;
}

// Gradient colors for bars - more vibrant and modern
const barColors = [
  'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)', // Blue
  'linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%)', // Purple
  'linear-gradient(180deg, #10B981 0%, #059669 100%)', // Green
  'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)', // Orange
  'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)', // Red
];

// Solid colors for fallback
const solidColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

const ChannelsChart = ({ data, isLoading }: ChannelsChartProps) => {
  // Don't render if no data
  if (!data || data.length === 0) {
    return (
      <div 
        className="bg-white/90 backdrop-blur-sm p-6 md:p-8 rounded-2xl border border-white/50 shadow-xl mb-8"
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg md:text-xl font-semibold text-black flex items-center gap-2">
            <Radio className="text-[#0000FF]" size={22} />
            Videos per Channel
          </h3>
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500">
          {isLoading ? 'Loading channel data...' : 'No channels available'}
        </div>
      </div>
    );
  }

  // Custom tooltip with better styling
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div 
          className="bg-white rounded-lg shadow-xl border border-gray-200 p-3"
          style={{
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
          }}
        >
          <p className="text-sm font-semibold text-gray-800 mb-1">
            {payload[0].payload.name}
          </p>
          <p className="text-base font-bold text-[#0000FF]">
            {payload[0].value} <span className="text-xs font-normal text-gray-600">videos</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      className="bg-white/90 backdrop-blur-sm p-6 md:p-8 rounded-2xl border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300 mb-8"
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg md:text-xl font-semibold text-black flex items-center gap-2">
          <Radio className="text-[#0000FF]" size={22} />
          Videos per Channel
        </h3>
        <div className="text-xs text-gray-500 hidden sm:block">
          Total: {data.reduce((sum, item) => sum + item.videos, 0)} videos
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={320}>
        <BarChart 
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
        >
          <defs>
            {/* Gradient definitions for bars */}
            <linearGradient id="barGradient0" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="barGradient1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
              <stop offset="100%" stopColor="#7C3AED" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
              <stop offset="100%" stopColor="#059669" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="barGradient3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity={1} />
              <stop offset="100%" stopColor="#D97706" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="barGradient4" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={1} />
              <stop offset="100%" stopColor="#DC2626" stopOpacity={1} />
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#E5E7EB" 
            vertical={false}
            opacity={0.5}
          />
          
          <XAxis 
            dataKey="name" 
            stroke="#666666" 
            fontSize={13}
            fontWeight={500}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
            tick={{ fill: '#666666' }}
          />
          
          <YAxis 
            stroke="#666666" 
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
            tick={{ fill: '#666666' }}
            width={50}
          />
          
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
          
          <Bar 
            dataKey="videos" 
            radius={[12, 12, 0, 0]}
            barSize={60}
          >
            {data.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`url(#barGradient${index % barColors.length})`}
                style={{
                  filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Legend/Summary */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex flex-wrap gap-4 justify-center text-xs text-gray-600">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: solidColors[index % solidColors.length] }}
              />
              <span className="font-medium">{item.name}:</span>
              <span className="font-semibold text-gray-800">{item.videos}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChannelsChart;
