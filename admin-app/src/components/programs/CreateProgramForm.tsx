import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, X, Calendar, Clock, Repeat } from 'lucide-react';
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
import { programService } from '@/services/api/program.service';
import { CreateProgramRequest, ScheduleType, DAYS_OF_WEEK } from '@/types/api.types';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { channelService } from '@/services/api/channel.service';

const programSchema = z.object({
  channelId: z.string().min(1, 'Channel is required'),
  title: z.string().min(1, 'Title is required').min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  scheduleType: z.enum(['daily', 'weekly', 'once']),
  // For daily/weekly
  startTimeOfDay: z.string().optional(),
  endTimeOfDay: z.string().optional(),
  // For weekly
  daysOfWeek: z.array(z.number()).optional(),
  // For once (and optional for daily/weekly as effective date range)
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timezone: z.string().optional(),
  category: z.string().optional(),
  thumbnailUrl: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validate based on schedule type
  if (data.scheduleType === 'daily' || data.scheduleType === 'weekly') {
    if (!data.startTimeOfDay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start time is required for daily/weekly schedules',
        path: ['startTimeOfDay'],
      });
    }
    if (!data.endTimeOfDay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End time is required for daily/weekly schedules',
        path: ['endTimeOfDay'],
      });
    }
  }

  if (data.scheduleType === 'weekly') {
    if (!data.daysOfWeek || data.daysOfWeek.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select at least one day for weekly schedules',
        path: ['daysOfWeek'],
      });
    }
  }

  if (data.scheduleType === 'once') {
    if (!data.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start date/time is required for special programs',
        path: ['startTime'],
      });
    }
    if (!data.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date/time is required for special programs',
        path: ['endTime'],
      });
    }
    if (data.startTime && data.endTime && new Date(data.endTime) <= new Date(data.startTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End time must be after start time',
        path: ['endTime'],
      });
    }
  }
});

type ProgramFormValues = z.infer<typeof programSchema>;

interface CreateProgramFormProps {
  onSuccess?: () => void;
}

const CreateProgramForm = ({ onSuccess }: CreateProgramFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
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

  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      channelId: '',
      title: '',
      description: '',
      scheduleType: 'daily',
      startTimeOfDay: '',
      endTimeOfDay: '',
      daysOfWeek: [],
      startTime: '',
      endTime: '',
      timezone: 'UTC',
      category: '',
      thumbnailUrl: '',
    },
  });

  // Watch schedule type to show/hide fields
  const scheduleType = useWatch({
    control: form.control,
    name: 'scheduleType',
  });

  const onSubmit = async (data: ProgramFormValues) => {
    setIsSubmitting(true);
    try {
      const payload: CreateProgramRequest = {
        channelId: data.channelId,
        title: data.title,
        description: data.description?.trim() || undefined,
        scheduleType: data.scheduleType as ScheduleType,
        category: data.category?.trim() || undefined,
        timezone: data.timezone || 'UTC',
        thumbnailUrl: data.thumbnailUrl?.trim() || undefined,
      };

      // Add fields based on schedule type
      if (data.scheduleType === 'daily' || data.scheduleType === 'weekly') {
        payload.startTimeOfDay = data.startTimeOfDay;
        payload.endTimeOfDay = data.endTimeOfDay;
        
        // Optional effective date range
        if (data.startTime) {
          payload.startTime = new Date(data.startTime).toISOString();
        }
        if (data.endTime) {
          payload.endTime = new Date(data.endTime).toISOString();
        }
      }

      if (data.scheduleType === 'weekly') {
        payload.daysOfWeek = data.daysOfWeek;
      }

      if (data.scheduleType === 'once') {
        payload.startTime = new Date(data.startTime!).toISOString();
        payload.endTime = new Date(data.endTime!).toISOString();
      }

      const response = await programService.createProgram(payload);
      
      if (response.success) {
        toast.success('Program created successfully!');
        form.reset();
        setIsOpen(false);
        
        queryClient.invalidateQueries({ queryKey: ['programs'] });
        onSuccess?.();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create program. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDayOfWeek = (day: number) => {
    const current = form.getValues('daysOfWeek') || [];
    if (current.includes(day)) {
      form.setValue('daysOfWeek', current.filter(d => d !== day));
    } else {
      form.setValue('daysOfWeek', [...current, day].sort());
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-[#0000FF] hover:bg-[#0000CC] text-white"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Program
      </Button>
    );
  }

  return (
    <div 
      className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-xl mb-6"
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-black">Create New Program</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setIsOpen(false);
            form.reset();
          }}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Channel Selection */}
          <FormField
            control={form.control}
            name="channelId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Channel *</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select a channel</option>
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

          {/* Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Title *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Morning Show"
                    className="bg-white border-gray-300"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
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
                    placeholder="Enter program description..."
                    className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Schedule Type Selection */}
          <FormField
            control={form.control}
            name="scheduleType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Schedule Type *</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => field.onChange('daily')}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                        field.value === 'daily'
                          ? 'border-[#0000FF] bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Repeat className={`w-6 h-6 mb-2 ${field.value === 'daily' ? 'text-[#0000FF]' : 'text-gray-500'}`} />
                      <span className={`text-sm font-medium ${field.value === 'daily' ? 'text-[#0000FF]' : 'text-gray-700'}`}>
                        Daily
                      </span>
                      <span className="text-xs text-gray-500 mt-1">Every day</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => field.onChange('weekly')}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                        field.value === 'weekly'
                          ? 'border-[#0000FF] bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Calendar className={`w-6 h-6 mb-2 ${field.value === 'weekly' ? 'text-[#0000FF]' : 'text-gray-500'}`} />
                      <span className={`text-sm font-medium ${field.value === 'weekly' ? 'text-[#0000FF]' : 'text-gray-700'}`}>
                        Weekly
                      </span>
                      <span className="text-xs text-gray-500 mt-1">Specific days</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => field.onChange('once')}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                        field.value === 'once'
                          ? 'border-[#0000FF] bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Clock className={`w-6 h-6 mb-2 ${field.value === 'once' ? 'text-[#0000FF]' : 'text-gray-500'}`} />
                      <span className={`text-sm font-medium ${field.value === 'once' ? 'text-[#0000FF]' : 'text-gray-700'}`}>
                        Special
                      </span>
                      <span className="text-xs text-gray-500 mt-1">One-time event</span>
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Time of Day (for daily/weekly) */}
          {(scheduleType === 'daily' || scheduleType === 'weekly') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTimeOfDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">Start Time *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="time"
                        className="bg-white border-gray-300"
                      />
                    </FormControl>
                    <FormDescription>Time the program starts each day</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTimeOfDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">End Time *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="time"
                        className="bg-white border-gray-300"
                      />
                    </FormControl>
                    <FormDescription>Time the program ends each day</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Days of Week (for weekly) */}
          {scheduleType === 'weekly' && (
            <FormField
              control={form.control}
              name="daysOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Days of Week *</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDayOfWeek(day.value)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            field.value?.includes(day.value)
                              ? 'bg-[#0000FF] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {day.label.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormDescription>Select which days this program airs</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Specific Date/Time (for once) */}
          {scheduleType === 'once' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">Start Date & Time *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="datetime-local"
                        className="bg-white border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">End Date & Time *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="datetime-local"
                        className="bg-white border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Optional: Effective Date Range for recurring schedules */}
          {(scheduleType === 'daily' || scheduleType === 'weekly') && (
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Effective Date Range (Optional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black">Starts From</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          className="bg-white border-gray-300"
                        />
                      </FormControl>
                      <FormDescription>Leave empty to start immediately</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black">Ends On</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          className="bg-white border-gray-300"
                        />
                      </FormControl>
                      <FormDescription>Leave empty for indefinite</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Category and Timezone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Category</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., News, Sports, Entertainment"
                      className="bg-white border-gray-300"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Timezone</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Europe/Paris">Paris (CET)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Africa/Lagos">Lagos (WAT)</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Thumbnail URL */}
          <FormField
            control={form.control}
            name="thumbnailUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Thumbnail URL</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="https://example.com/thumbnail.jpg"
                    className="bg-white border-gray-300"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                form.reset();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#0000FF] hover:bg-[#0000CC] text-white"
            >
              {isSubmitting ? 'Creating...' : 'Create Program'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CreateProgramForm;
