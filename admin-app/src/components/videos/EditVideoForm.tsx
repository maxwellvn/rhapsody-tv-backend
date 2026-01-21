import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { videoService } from '@/services/api/video.service';
import { UpdateVideoRequest, Video } from '@/types/api.types';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { channelService } from '@/services/api/channel.service';
import { programService } from '@/services/api/program.service';

const videoSchema = z.object({
  programId: z.string().optional(),
  title: z.string().min(1, 'Title is required').min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  playbackUrl: z.string().url('Must be a valid URL'),
  thumbnailUrl: z.union([
    z.string().url('Must be a valid URL'),
    z.literal(''),
  ]).optional(),
  durationSeconds: z.number().min(0, 'Duration must be positive').optional(),
  visibility: z.enum(['public', 'unlisted', 'private']).default('public'),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

type VideoFormValues = z.infer<typeof videoSchema>;

// Helper to get channel name
const getChannelName = (video: Video, channels?: { id: string; name: string }[]): string => {
  if (typeof video.channelId === 'object') {
    return video.channelId.name;
  }
  return channels?.find(c => c.id === video.channelId)?.name || video.channelId;
};

// Helper to get program ID from video
const getProgramId = (video: Video): string | undefined => {
  if (!video.programId) return undefined;
  if (typeof video.programId === 'object') {
    return video.programId._id;
  }
  return video.programId;
};

interface EditVideoFormProps {
  video: Video;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const EditVideoForm = ({ video, onSuccess, onCancel }: EditVideoFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch channels for dropdown
  const { data: channelsData } = useQuery({
    queryKey: ['channels', 1, 100],
    queryFn: async () => {
      const response = await channelService.getChannels({ page: 1, limit: 100 });
      return response.data;
    },
  });

  // Fetch programs for dropdown
  const { data: programsData } = useQuery({
    queryKey: ['programs', 1, 100],
    queryFn: async () => {
      const response = await programService.getPrograms({ page: 1, limit: 100 });
      return response.data;
    },
  });

  const form = useForm<VideoFormValues>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      programId: getProgramId(video) || '',
      title: video.title,
      description: video.description || '',
      playbackUrl: video.playbackUrl,
      thumbnailUrl: video.thumbnailUrl || '',
      durationSeconds: video.durationSeconds,
      visibility: video.visibility,
      isActive: video.isActive,
      isFeatured: video.isFeatured || false,
    },
  });

  const onSubmit = async (data: VideoFormValues) => {
    setIsSubmitting(true);
    try {
      const payload: UpdateVideoRequest = {
        programId: data.programId?.trim() || undefined,
        title: data.title,
        description: data.description?.trim() || undefined,
        playbackUrl: data.playbackUrl,
        thumbnailUrl: data.thumbnailUrl?.trim() || undefined,
        durationSeconds: data.durationSeconds,
        visibility: data.visibility,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
      };

      const response = await videoService.updateVideo(video.id, payload);
      
      if (response.success) {
        toast.success('Video updated successfully!');
        
        queryClient.invalidateQueries({ queryKey: ['video', video.id] });
        queryClient.invalidateQueries({ queryKey: ['videos'] });
        
        onSuccess?.();
      }
    } catch (error: any) {
      if (error.statusCode === 404) {
        toast.error('Video not found');
      } else {
        toast.error(error.message || 'Failed to update video. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-xl"
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-black">Edit Video</h2>
        {onCancel && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Channel (cannot be changed)</p>
              <p className="text-base font-medium text-black">
                {getChannelName(video, channelsData?.channels)}
              </p>
            </div>

            <FormField
              control={form.control}
              name="programId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Program</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">No program (channel only)</option>
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
          </div>

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Title *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., My Video Title"
                    className="bg-white border-gray-300"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Description</FormLabel>
                <FormControl>
                  <textarea
                    {...field}
                    rows={3}
                    placeholder="Enter video description..."
                    className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="playbackUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Playback URL *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                      placeholder="https://example.com/video.mp4"
                      className="bg-white border-gray-300"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="thumbnailUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Thumbnail URL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                      placeholder="https://example.com/thumbnail.jpg"
                      className="bg-white border-gray-300"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="durationSeconds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Duration (seconds)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="0"
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="3600"
                      className="bg-white border-gray-300"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Visibility</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="public">Public</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="private">Private</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-4 bg-white">
                  <div className="space-y-0.5">
                    <FormLabel className="text-black">Active</FormLabel>
                  </div>
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-5 w-5 rounded border-gray-300 text-[#0000FF] focus:ring-[#0000FF]"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="isFeatured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-yellow-200 p-4 bg-yellow-50">
                <div className="space-y-0.5">
                  <FormLabel className="text-black font-medium">Featured Video</FormLabel>
                  <p className="text-sm text-gray-500">Featured videos appear in the Featured section on the home page</p>
                </div>
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-5 w-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex gap-3 justify-end pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#0000FF] hover:bg-[#0000CC] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Updating...' : 'Update Video'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EditVideoForm;
