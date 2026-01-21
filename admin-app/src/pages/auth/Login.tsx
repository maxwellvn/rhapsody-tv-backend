/* eslint-disable import/no-unresolved */
import Loader from '@/components/common/Loader';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/api/auth.service';
import { ROUTES } from '@/utils/constants';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.login({ email, password });
      
      const { user, accessToken, refreshToken } = response.data;
      
      // Check if user has admin role
      if (!user.roles.includes('admin')) {
        toast.error('Access denied. Admin privileges required.');
        return;
      }
      
      login(user, accessToken, refreshToken);
      toast.success('Login successful!');
      navigate(ROUTES.DASHBOARD);
    } catch (error: any) {
      toast.error(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Form Section */}
        <div className="px-8 py-8">
          {/* Logo and Admin Header */}
          <div className="flex flex-col items-center mb-8">
            <img 
              src="/assets/logo/Logo.png" 
              alt="Rhapsody TV Logo" 
              className="h-16 w-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-black mb-2">Admin</h1>
            <p className="text-gray-600 text-sm">Sign in to your admin account</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-black mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className={`w-full px-4 py-3 bg-white border rounded-lg text-base text-black placeholder:text-gray-400 focus:outline-none transition-all ${
                  focusedField === 'email' 
                    ? 'border-[#0000FF] border-2' 
                    : 'border-gray-300'
                }`}
                placeholder="Enter your email"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-black mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className={`w-full px-4 py-3 pr-12 bg-white border rounded-lg text-base text-black placeholder:text-gray-400 focus:outline-none transition-all ${
                    focusedField === 'password' 
                      ? 'border-[#0000FF] border-2' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <Link
                to="#"
                className="text-sm text-[#0000FF] hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0000FF] hover:bg-[#0000CC] text-white py-3 rounded-lg font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              size="lg"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>

      {/* Full Screen Loader Overlay */}
      {isLoading && <Loader />}
    </div>
  );
};

export default Login;
