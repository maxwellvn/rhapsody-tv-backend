import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { X, Save, Repeat, Calendar, Clock } from 'lucide-react';
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
import { UpdateProgramRequest, Program, ScheduleType, DAYS_OF_WEEK } from '@/types/api.types';
import { useQueryClient } from '@tanstack/react-query';

const programSchema = z.object({
  title: z.string().min(1, 'Title is required').min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  scheduleType: z.enum(['daily', 'weekly', 'once']),
  startTimeOfDay: z.string().optional(),
  endTimeOfDay: z.string().optional(),
  daysOfWeek: z.array(z.number()).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timezone: z.string().optional(),
  category: z.string().optional(),
  thumbnailUrl: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.scheduleType === 'daily' || data.scheduleType === 'weekly') {
    if (!data.startTimeOfDay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start time is required',
        path: ['startTimeOfDay'],
      });
    }
    if (!data.endTimeOfDay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End time is required',
        path: ['endTimeOfDay'],
      });
    }
  }

  if (data.scheduleType === 'weekly') {
    if (!data.daysOfWeek || data.daysOfWeek.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select at least one day',
        path: ['daysOfWeek'],
      });
    }
  }

  if (data.scheduleType === 'once') {
    if (!data.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start date/time is required',
        path: ['startTime'],
      });
    }
    if (!data.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date/time is required',
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

interface EditProgramFormProps {
  program: Program;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const EditProgramForm = ({ program, onSuccess, onCancel }: EditProgramFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Convert ISO dates to datetime-local format
  const formatDateForInput = (isoDate?: string) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDateOnlyForInput = (isoDate?: string) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      title: program.title,
      description: program.description || '',
      scheduleType: program.scheduleType || 'once',
      startTimeOfDay: program.startTimeOfDay || '',
      endTimeOfDay: program.endTimeOfDay || '',
      daysOfWeek: program.daysOfWeek || [],
      startTime: program.scheduleType === 'once' 
        ? formatDateForInput(program.startTime)
        : formatDateOnlyForInput(program.startTime),
      endTime: program.scheduleType === 'once'
        ? formatDateForInput(program.endTime)
        : formatDateOnlyForInput(program.endTime),
      timezone: program.timezone || 'UTC',
      category: program.category || '',
      thumbnailUrl: program.thumbnailUrl || '',
    },
  });

  const scheduleType = useWatch({
    control: form.control,
    name: 'scheduleType',
  });

  const toggleDayOfWeek = (day: number) => {
    const current = form.getValues('daysOfWeek') || [];
    if (current.includes(day)) {
      form.setValue('daysOfWeek', current.filter(d => d !== day));
    } else {
      form.setValue('daysOfWeek', [...current, day].sort());
    }
  };

  const onSubmit = async (data: ProgramFormValues) => {
    setIsSubmitting(true);
    try {
      const payload: UpdateProgramRequest = {
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

      const response = await programService.updateProgram(program.id, payload);
      
      if (response.success) {
        toast.success('Program updated successfully!');
        
        queryClient.invalidateQueries({ queryKey: ['program', program.id] });
        queryClient.invalidateQueries({ queryKey: ['programs'] });
        
        onSuccess?.();
      }
    } catch (error: any) {
      if (error.statusCode === 404) {
        toast.error('Program not found');
      } else {
        toast.error(error.message || 'Failed to update program. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getChannelName = () => {
    if (typeof program.channelId === 'object') {
      return program.channelId.name;
    }
    return program.channelId;
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
        <h2 className="text-xl font-semibold text-black">Edit Program</h2>
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
          {/* Channel (read-only) */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Channel (cannot be changed)</p>
            <p className="text-base font-medium text-black">{getChannelName()}</p>
          </div>

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

          {/* Schedule Type */}
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
              {isSubmitting ? 'Updating...' : 'Update Program'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EditProgramForm;
