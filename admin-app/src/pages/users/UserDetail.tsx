import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, Shield, User, CheckCircle2, XCircle, Edit, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { userService } from '@/services/api/user.service';
import MainLayout from '@/components/layout/MainLayout';
import Loader from '@/components/common/Loader';
import EditUserForm from '@/components/users/EditUserForm';
import { ROUTES } from '@/utils/constants';

const UserDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      if (!id) throw new Error('User ID is required');
      const response = await userService.getUserById(id);
      return response.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <Loader />
        </div>
      </MainLayout>
    );
  }

  if (error || !data) {
    return (
      <MainLayout>
        <div 
          className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl border border-white/50 shadow-xl text-center"
          style={{
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
          }}
        >
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-black mb-2">User Not Found</h2>
          <p className="text-gray-600 mb-6">The user you're looking for doesn't exist or has been removed.</p>
          <Button
            onClick={() => navigate(ROUTES.USERS)}
            className="bg-[#0000FF] hover:bg-[#0000CC] text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </div>
      </MainLayout>
    );
  }

  const user = data;

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-black">{user.fullName}</h1>
        <Button
          onClick={() => setIsEditing(!isEditing)}
          className="bg-[#0000FF] hover:bg-[#0000CC] text-white"
        >
          <Edit className="w-4 h-4 mr-2" />
          {isEditing ? 'Cancel Edit' : 'Edit User'}
        </Button>
      </div>

        {isEditing ? (
          <EditUserForm
            user={user}
            onSuccess={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <>
            <div 
              className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/50 shadow-xl overflow-hidden mb-6"
              style={{
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
              }}
            >
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-[#0000FF]/10 flex items-center justify-center border-4 border-white shadow-lg">
                      {user.roles.includes('admin') ? (
                        <Shield className="w-12 h-12 md:w-16 md:h-16 text-[#0000FF]" />
                      ) : (
                        <User className="w-12 h-12 md:w-16 md:h-16 text-[#0000FF]" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <h1 className="text-3xl md:text-4xl font-bold text-black mb-2">
                      {user.fullName}
                    </h1>
                    <div className="flex items-center gap-3 flex-wrap mb-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                            role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {role === 'admin' ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                          {role}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Status</div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Email Verified</div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.isEmailVerified
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {user.isEmailVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div 
              className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/50 shadow-xl p-6 md:p-8"
              style={{
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
              }}
            >
              <h2 className="text-xl font-semibold text-black mb-6">User Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">User ID</label>
                  <p className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded">
                    {user.id}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Email</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                    {user.email}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Full Name</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                    {user.fullName}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Roles</label>
                  <div className="flex gap-2 flex-wrap">
                    {user.roles.map((role) => (
                      <span
                        key={role}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                          role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {role === 'admin' ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Status</label>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                      user.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.isActive ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Inactive
                      </>
                    )}
                  </span>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Email Verification</label>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                      user.isEmailVerified
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {user.isEmailVerified ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Verified
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Unverified
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
    </MainLayout>
  );
};

export default UserDetail;
