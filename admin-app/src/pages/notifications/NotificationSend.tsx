import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Send, Bell, Users, Tv, Film, History, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { channelService } from '@/services/api/channel.service';
import { programService } from '@/services/api/program.service';
import { apiClient } from '@/services/api/client';
import { ROUTES } from '@/utils/constants';
import { formatDateTime } from '@/utils/helpers';

const notificationSchema = z.object({
  type: z.enum([
    'announcement',
    'new_video',
    'new_livestream',
    'new_channel',
    'new_program',
    'system',
  ]),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(500, 'Message too long'),
  imageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  target: z.enum(['all', 'channel_subscribers', 'program_subscribers']),
  channelId: z.string().optional(),
  programId: z.string().optional(),
  videoId: z.string().optional(),
  livestreamId: z.string().optional(),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

interface BroadcastHistoryItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  target: string;
  sentCount: number;
  failedCount: number;
  sentAt: string;
  createdAt: string;
  channelId?: { name: string };
  programId?: { title: string };
}

const NotificationSend = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch channels
  const { data: channelsData } = useQuery({
    queryKey: ['channels', 1, 100],
    queryFn: async () => {
      const response = await channelService.getChannels({ page: 1, limit: 100 });
      return response.data;
    },
  });

  // Fetch programs
  const { data: programsData } = useQuery({
    queryKey: ['programs', 1, 100],
    queryFn: async () => {
      const response = await programService.getPrograms({ page: 1, limit: 100 });
      return response.data;
    },
  });

  // Fetch broadcast history
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['broadcast-history'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/notifications/history');
      return response.data.data;
    },
  });

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      type: 'announcement',
      title: '',
      message: '',
      imageUrl: '',
      target: 'all',
      channelId: '',
      programId: '',
      videoId: '',
      livestreamId: '',
    },
  });

  const watchTarget = form.watch('target');

  const sendNotificationMutation = useMutation({
    mutationFn: async (data: NotificationFormValues) => {
      const payload = {
        type: data.type,
        title: data.title,
        message: data.message,
        imageUrl: data.imageUrl || undefined,
        target: data.target,
        channelId: data.channelId || undefined,
        programId: data.programId || undefined,
        data: {
          videoId: data.videoId || undefined,
          livestreamId: data.livestreamId || undefined,
          channelId: data.channelId || undefined,
          programId: data.programId || undefined,
        },
      };
      const response = await apiClient.post('/admin/notifications/send', payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Notification sent to ${data.data.sentCount} users!`);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['broadcast-history'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send notification');
    },
  });

  const onSubmit = async (data: NotificationFormValues) => {
    setIsSubmitting(true);
    try {
      await sendNotificationMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTargetLabel = (target: string) => {
    switch (target) {
      case 'all':
        return 'All Users';
      case 'channel_subscribers':
        return 'Channel Subscribers';
      case 'program_subscribers':
        return 'Program Subscribers';
      default:
        return target;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'announcement':
        return 'Announcement';
      case 'new_video':
        return 'New Video';
      case 'new_livestream':
        return 'New Livestream';
      case 'new_channel':
        return 'New Channel';
      case 'new_program':
        return 'New Program';
      case 'system':
        return 'System';
      default:
        return type;
    }
  };

  return (
    <MainLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(ROUTES.DASHBOARD)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#0000FF]/10 rounded-lg">
            <Bell className="h-6 w-6 text-[#0000FF]" />
          </div>
          <h1 className="text-2xl font-bold text-black">Send Notification</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Notification Form */}
        <div
          className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-xl"
          style={{
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
          }}
        >
          <h2 className="text-xl font-semibold text-black mb-6">Compose Notification</h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">Notification Type</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="announcement">Announcement</option>
                        <option value="new_video">New Video</option>
                        <option value="new_livestream">New Livestream</option>
                        <option value="new_channel">New Channel</option>
                        <option value="new_program">New Program</option>
                        <option value="system">System Message</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">Target Audience</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="all">All Users</option>
                        <option value="channel_subscribers">Channel Subscribers</option>
                        <option value="program_subscribers">Program Subscribers</option>
                      </select>
                    </FormControl>
                    <FormDescription>
                      {watchTarget === 'all' && 'Send to all users with push notifications enabled'}
                      {watchTarget === 'channel_subscribers' && 'Send to users subscribed to a specific channel'}
                      {watchTarget === 'program_subscribers' && 'Send to users subscribed to a specific program'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchTarget === 'channel_subscribers' && (
                <FormField
                  control={form.control}
                  name="channelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black">Select Channel</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="">Select a channel...</option>
                          {channelsData?.channels.map((channel) => (
                            <option key={channel.id} value={channel.id}>
                              {channel.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchTarget === 'program_subscribers' && (
                <FormField
                  control={form.control}
                  name="programId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black">Select Program</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="">Select a program...</option>
                          {programsData?.programs.map((program) => (
                            <option key={program.id} value={program.id}>
                              {program.title}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">Title *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Notification title..."
                        className="bg-white border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">Message *</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={3}
                        placeholder="Notification message..."
                        className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">Image URL (optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        className="bg-white border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="videoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black">Video ID (optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Link to video..."
                          className="bg-white border-gray-300"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Opens video when tapped
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="livestreamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black">Livestream ID (optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Link to livestream..."
                          className="bg-white border-gray-300"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Opens livestream when tapped
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0000FF] hover:bg-[#0000CC] text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Sending...' : 'Send Notification'}
              </Button>
            </form>
          </Form>
        </div>

        {/* Broadcast History */}
        <div
          className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-xl"
          style={{
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
          }}
        >
          <div className="flex items-center gap-2 mb-6">
            <History className="h-5 w-5 text-gray-500" />
            <h2 className="text-xl font-semibold text-black">Broadcast History</h2>
          </div>

          {isLoadingHistory ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : historyData?.broadcasts?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No notifications sent yet
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {historyData?.broadcasts?.map((item: BroadcastHistoryItem) => (
                <div
                  key={item._id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-[#0000FF]/10 text-[#0000FF] text-xs font-medium rounded">
                        {getTypeLabel(item.type)}
                      </span>
                      <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded">
                        {getTargetLabel(item.target)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDateTime(item.sentAt || item.createdAt)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-black mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{item.message}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {item.sentCount} sent
                    </span>
                    {item.failedCount > 0 && (
                      <span className="text-red-500">
                        {item.failedCount} failed
                      </span>
                    )}
                    {item.channelId && (
                      <span className="flex items-center gap-1">
                        <Tv className="h-3 w-3" />
                        {item.channelId.name}
                      </span>
                    )}
                    {item.programId && (
                      <span className="flex items-center gap-1">
                        <Film className="h-3 w-3" />
                        {item.programId.title}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default NotificationSend;
