/* eslint-disable import/no-unresolved */
import { useQuery } from '@tanstack/react-query';
import { Radio, Tv, Users, Video, Calendar } from 'lucide-react';
import ChannelsChart from '@/components/dashboard/ChannelsChart';
import MenuGrid from '@/components/dashboard/MenuGrid';
import StatsCards from '@/components/dashboard/StatsCards';
import WelcomeSection from '@/components/dashboard/WelcomeSection';
import MainLayout from '@/components/layout/MainLayout';
import { userService } from '@/services/api/user.service';
import { channelService } from '@/services/api/channel.service';
import { videoService } from '@/services/api/video.service';
import { programService } from '@/services/api/program.service';
import { livestreamService } from '@/services/api/livestream.service';

const Dashboard = () => {
  // Fetch real stats from API
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['dashboard-users'],
    queryFn: async () => {
      const response = await userService.getUsers({ page: 1, limit: 1 });
      return response.data;
    },
  });

  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: ['dashboard-channels'],
    queryFn: async () => {
      const response = await channelService.getChannels({ page: 1, limit: 10 });
      return response.data;
    },
  });

  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ['dashboard-videos'],
    queryFn: async () => {
      const response = await videoService.getVideos({ page: 1, limit: 1 });
      return response.data;
    },
  });

  const { data: programsData, isLoading: programsLoading } = useQuery({
    queryKey: ['dashboard-programs'],
    queryFn: async () => {
      const response = await programService.getPrograms({ page: 1, limit: 1 });
      return response.data;
    },
  });

  const { data: livestreamsData, isLoading: livestreamsLoading } = useQuery({
    queryKey: ['dashboard-livestreams'],
    queryFn: async () => {
      const response = await livestreamService.getLivestreams({ page: 1, limit: 1 });
      return response.data;
    },
  });

  // Build stats for cards
  const stats = [
    {
      label: 'Total Users',
      value: usersLoading ? '...' : (usersData?.total ?? 0).toLocaleString(),
      icon: Users,
      subtitle: usersLoading ? 'Loading...' : 'Registered users',
    },
    {
      label: 'Total Channels',
      value: channelsLoading ? '...' : (channelsData?.total ?? 0).toLocaleString(),
      icon: Radio,
      subtitle: channelsLoading ? 'Loading...' : 'Active channels',
    },
    {
      label: 'Total Videos',
      value: videosLoading ? '...' : (videosData?.total ?? 0).toLocaleString(),
      icon: Video,
      subtitle: videosLoading ? 'Loading...' : 'Uploaded videos',
    },
    {
      label: 'Programs',
      value: programsLoading ? '...' : (programsData?.total ?? 0).toLocaleString(),
      icon: Calendar,
      subtitle: programsLoading ? 'Loading...' : 'Scheduled programs',
    },
    {
      label: 'Livestreams',
      value: livestreamsLoading ? '...' : (livestreamsData?.total ?? 0).toLocaleString(),
      icon: Tv,
      subtitle: livestreamsLoading ? 'Loading...' : 'Live streams',
    },
  ];

  // Build channel chart data from real channels
  const channelChartData = channelsData?.channels?.slice(0, 5).map(channel => ({
    name: channel.name.length > 15 ? channel.name.substring(0, 15) + '...' : channel.name,
    videos: channel.videoCount ?? 0,
  })) ?? [];

  return (
    <MainLayout showBreadcrumbs={false}>
      <WelcomeSection />

      {/* Stats Section */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overview</h3>
        <StatsCards stats={stats} />
      </section>

      {/* Quick Actions / Menu Grid */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <MenuGrid />
      </section>

      {/* Channels Chart - only show if we have channel data */}
      {channelChartData.length > 0 && (
        <section>
          <ChannelsChart data={channelChartData} />
        </section>
      )}
    </MainLayout>
  );
};

export default Dashboard;
