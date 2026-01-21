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
import { userService } from '@/services/api/user.service';
import { UpdateUserRequest, User } from '@/types/api.types';
import { useQueryClient } from '@tanstack/react-query';

const userSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').min(2, 'Full name must be at least 2 characters'),
  roles: z.array(z.enum(['user', 'admin'])).min(1, 'At least one role is required'),
  isActive: z.boolean(),
  isEmailVerified: z.boolean(),
});

type UserFormValues = z.infer<typeof userSchema>;

interface EditUserFormProps {
  user: User;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const EditUserForm = ({ user, onSuccess, onCancel }: EditUserFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      fullName: user.fullName,
      roles: user.roles as ('user' | 'admin')[],
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
    },
  });

  const onSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    try {
      const payload: UpdateUserRequest = {
        fullName: data.fullName,
        roles: data.roles,
        isActive: data.isActive,
        isEmailVerified: data.isEmailVerified,
      };

      const response = await userService.updateUser(user.id, payload);
      
      if (response.success) {
        toast.success('User updated successfully!');
        
        queryClient.invalidateQueries({ queryKey: ['user', user.id] });
        queryClient.invalidateQueries({ queryKey: ['users'] });
        
        onSuccess?.();
      }
    } catch (error: any) {
      if (error.statusCode === 404) {
        toast.error('User not found');
      } else {
        toast.error(error.message || 'Failed to update user. Please try again.');
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
        <h2 className="text-xl font-semibold text-black">Edit User</h2>
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
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Full Name *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., John Doe"
                    className="bg-white border-gray-300"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Email (cannot be changed)</p>
            <p className="text-base font-medium text-black">{user.email}</p>
          </div>

          <FormField
            control={form.control}
            name="roles"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Roles *</FormLabel>
                <FormControl>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.value?.includes('user')}
                        onChange={(e) => {
                          const currentRoles = field.value || [];
                          if (e.target.checked) {
                            field.onChange([...currentRoles, 'user']);
                          } else {
                            field.onChange(currentRoles.filter(r => r !== 'user'));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-[#0000FF] focus:ring-[#0000FF]"
                      />
                      <span className="text-sm text-gray-700">User</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.value?.includes('admin')}
                        onChange={(e) => {
                          const currentRoles = field.value || [];
                          if (e.target.checked) {
                            field.onChange([...currentRoles, 'admin']);
                          } else {
                            field.onChange(currentRoles.filter(r => r !== 'admin'));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-[#0000FF] focus:ring-[#0000FF]"
                      />
                      <span className="text-sm text-gray-700">Admin</span>
                    </label>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-4 bg-white">
                  <div className="space-y-0.5">
                    <FormLabel className="text-black">Active Status</FormLabel>
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

            <FormField
              control={form.control}
              name="isEmailVerified"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-4 bg-white">
                  <div className="space-y-0.5">
                    <FormLabel className="text-black">Email Verified</FormLabel>
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
              {isSubmitting ? 'Updating...' : 'Update User'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EditUserForm;
