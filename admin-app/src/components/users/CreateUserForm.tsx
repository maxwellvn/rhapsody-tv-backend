/* eslint-disable import/no-unresolved */
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { userService } from '@/services/api/user.service';
import { CreateUserRequest } from '@/types/api.types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const userSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roles: z.array(z.enum(['user', 'admin'])).optional().default(['user']),
});

type UserFormValues = z.infer<typeof userSchema>;

interface CreateUserFormProps {
  onSuccess?: () => void;
}

const CreateUserForm = ({ onSuccess }: CreateUserFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      roles: ['user'],
    },
  });

  const onSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    try {
      const payload: CreateUserRequest = {
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        roles: data.roles,
      };

      const response = await userService.createUser(payload);
      
      if (response.success) {
        toast.success('User created successfully!');
        form.reset();
        setIsOpen(false);
        
        queryClient.invalidateQueries({ queryKey: ['users'] });
        onSuccess?.();
      }
    } catch (error: any) {
      if (error.statusCode === 409) {
        toast.error('A user with this email already exists');
        form.setError('email', { message: 'This email is already taken' });
      } else {
        toast.error(error.message || 'Failed to create user. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-[#0000FF] hover:bg-[#0000CC] text-white"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create User
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
        <h2 className="text-xl font-semibold text-black">Create New User</h2>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Email *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="e.g., john.doe@example.com"
                      className="bg-white border-gray-300"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Password *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder="Minimum 8 characters"
                    className="bg-white border-gray-300"
                  />
                </FormControl>
                <FormDescription className="text-xs text-gray-500">
                  Password must be at least 8 characters
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="roles"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Roles</FormLabel>
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
              {isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CreateUserForm;
