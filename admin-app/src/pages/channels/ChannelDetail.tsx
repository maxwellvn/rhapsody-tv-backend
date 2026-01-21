import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, ExternalLink, Radio, Calendar, Users, Video, Globe, CheckCircle2, XCircle, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { channelService } from '@/services/api/channel.service';
import MainLayout from '@/components/layout/MainLayout';
import Loader from '@/components/common/Loader';
import EditChannelForm from '@/components/channels/EditChannelForm';
import { formatDate, formatDateTime } from '@/utils/helpers';
import { ROUTES } from '@/utils/constants';

const ChannelDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['channel', id],
    queryFn: async () => {
      if (!id) throw new Error('Channel ID is required');
      const response = await channelService.getChannelById(id);
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
          <h2 className="text-2xl font-bold text-black mb-2">Channel Not Found</h2>
          <p className="text-gray-600 mb-6">The channel you're looking for doesn't exist or has been removed.</p>
          <Button
            onClick={() => navigate(ROUTES.CHANNELS)}
            className="bg-[#0000FF] hover:bg-[#0000CC] text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Channels
          </Button>
        </div>
      </MainLayout>
    );
  }

  const channel = data;

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-black">{channel.name}</h1>
        <Button
          onClick={() => setIsEditing(!isEditing)}
          className="bg-[#0000FF] hover:bg-[#0000CC] text-white"
        >
          <Edit className="w-4 h-4 mr-2" />
          {isEditing ? 'Cancel Edit' : 'Edit Channel'}
        </Button>
      </div>

        {/* Edit Form */}
        {isEditing ? (
          <div className="mb-6">
            <EditChannelForm
              channel={channel}
              onSuccess={() => {
                setIsEditing(false);
              }}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        ) : (
          <>
            {/* Channel Header */}
        <div 
          className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/50 shadow-xl overflow-hidden mb-6"
          style={{
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
          }}
        >
          {/* Cover Image */}
          {channel.coverImageUrl && (
            <div className="h-48 md:h-64 bg-gradient-to-r from-[#0000FF] to-[#0000CC] relative overflow-hidden">
              <img
                src={channel.coverImageUrl}
                alt={`${channel.name} cover`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Channel Info */}
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                {channel.logoUrl ? (
                  <img
                    src={channel.logoUrl}
                    alt={channel.name}
                    className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-4 border-white shadow-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-[#0000FF]/10 flex items-center justify-center border-4 border-white shadow-lg">
                    <Radio className="w-12 h-12 md:w-16 md:h-16 text-[#0000FF]" />
                  </div>
                )}
              </div>

              {/* Channel Details */}
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-black mb-2">
                      {channel.name}
                    </h1>
                    <div className="flex items-center gap-3 flex-wrap">
                      <code className="text-sm bg-gray-100 px-3 py-1 rounded text-gray-700 font-mono">
                        {channel.slug}
                      </code>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                          channel.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {channel.isActive ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            Inactive
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {channel.websiteUrl && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(channel.websiteUrl, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      Visit Website
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {channel.description && (
                  <p className="text-gray-700 text-base leading-relaxed mb-6">
                    {channel.description}
                  </p>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <Video className="w-4 h-4" />
                      <span className="text-sm">Videos</span>
                    </div>
                    <p className="text-2xl font-bold text-black">{channel.videoCount}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Subscribers</span>
                    </div>
                    <p className="text-2xl font-bold text-black">{channel.subscriberCount}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Created</span>
                    </div>
                    <p className="text-sm font-semibold text-black">{formatDate(channel.createdAt)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Updated</span>
                    </div>
                    <p className="text-sm font-semibold text-black">{formatDate(channel.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Details Card */}
        <div 
          className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/50 shadow-xl p-6 md:p-8"
          style={{
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
          }}
        >
          <h2 className="text-xl font-semibold text-black mb-6">Channel Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Channel ID</label>
              <p className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded">
                {channel.id}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Slug</label>
              <p className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded">
                {channel.slug}
              </p>
            </div>

            {channel.logoUrl && (
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Logo URL</label>
                <a
                  href={channel.logoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#0000FF] hover:underline break-all block bg-gray-50 px-3 py-2 rounded"
                >
                  {channel.logoUrl}
                </a>
              </div>
            )}

            {channel.coverImageUrl && (
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Cover Image URL</label>
                <a
                  href={channel.coverImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#0000FF] hover:underline break-all block bg-gray-50 px-3 py-2 rounded"
                >
                  {channel.coverImageUrl}
                </a>
              </div>
            )}

            {channel.websiteUrl && (
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Website URL</label>
                <a
                  href={channel.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#0000FF] hover:underline break-all block bg-gray-50 px-3 py-2 rounded"
                >
                  {channel.websiteUrl}
                </a>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Status</label>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                  channel.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {channel.isActive ? (
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
              <label className="text-sm font-medium text-gray-600 mb-1 block">Created At</label>
              <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                {formatDateTime(channel.createdAt)}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Updated At</label>
              <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                {formatDateTime(channel.updatedAt)}
              </p>
            </div>
          </div>
        </div>
          </>
        )}
    </MainLayout>
  );
};

export default ChannelDetail;
