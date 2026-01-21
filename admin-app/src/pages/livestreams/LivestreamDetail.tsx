import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, Tv, Edit, Radio, Clock, Square, XCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { livestreamService } from '@/services/api/livestream.service';
import MainLayout from '@/components/layout/MainLayout';
import Loader from '@/components/common/Loader';
import EditLivestreamForm from '@/components/livestreams/EditLivestreamForm';
import { formatDate, formatDateTime } from '@/utils/helpers';
import { ROUTES } from '@/utils/constants';

const LivestreamDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['livestream', id],
    queryFn: async () => {
      if (!id) throw new Error('Livestream ID is required');
      const response = await livestreamService.getLivestreamById(id);
      return response.data;
    },
    enabled: !!id,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live':
        return <Radio className="w-5 h-5 text-red-600 animate-pulse" />;
      case 'scheduled':
        return <Clock className="w-5 h-5" />;
      case 'ended':
        return <Square className="w-5 h-5" />;
      case 'canceled':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ended':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'canceled':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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
          <Tv className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-black mb-2">Livestream Not Found</h2>
          <p className="text-gray-600 mb-6">The livestream you're looking for doesn't exist or has been removed.</p>
          <Button
            onClick={() => navigate(ROUTES.LIVESTREAMS)}
            className="bg-[#0000FF] hover:bg-[#0000CC] text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Livestreams
          </Button>
        </div>
      </MainLayout>
    );
  }

  const livestream = data;

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-black">{livestream.title}</h1>
        <Button
          onClick={() => setIsEditing(!isEditing)}
          className="bg-[#0000FF] hover:bg-[#0000CC] text-white"
        >
          <Edit className="w-4 h-4 mr-2" />
          {isEditing ? 'Cancel Edit' : 'Edit Livestream'}
        </Button>
      </div>

      {isEditing ? (
        <EditLivestreamForm
          livestream={livestream}
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
            {livestream.thumbnailUrl && (
              <div className="h-64 bg-gradient-to-r from-[#0000FF] to-[#0000CC] relative overflow-hidden">
                <img
                  src={livestream.thumbnailUrl}
                  alt={livestream.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6">
                {!livestream.thumbnailUrl && (
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-[#0000FF]/10 flex items-center justify-center border-4 border-white shadow-lg">
                      <Tv className="w-12 h-12 md:w-16 md:h-16 text-[#0000FF]" />
                    </div>
                  </div>
                )}

                <div className="flex-1">
                  <h1 className="text-3xl md:text-4xl font-bold text-black mb-2">
                    {livestream.title}
                  </h1>
                  <div className="flex items-center gap-3 flex-wrap mb-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(livestream.status)}`}
                    >
                      {getStatusIcon(livestream.status)}
                      {livestream.status.charAt(0).toUpperCase() + livestream.status.slice(1)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                        livestream.isChatEnabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Chat {livestream.isChatEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  {livestream.description && (
                    <p className="text-gray-700 text-base leading-relaxed mb-6">
                      {livestream.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Scheduled Start</span>
                      </div>
                      <p className="text-sm font-semibold text-black">
                        {livestream.scheduledStartAt ? formatDateTime(livestream.scheduledStartAt) : '-'}
                      </p>
                    </div>
                    {livestream.startedAt && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <Radio className="w-4 h-4" />
                          <span className="text-sm">Started At</span>
                        </div>
                        <p className="text-sm font-semibold text-black">{formatDateTime(livestream.startedAt)}</p>
                      </div>
                    )}
                    {livestream.endedAt && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <Square className="w-4 h-4" />
                          <span className="text-sm">Ended At</span>
                        </div>
                        <p className="text-sm font-semibold text-black">{formatDateTime(livestream.endedAt)}</p>
                      </div>
                    )}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Created</div>
                      <p className="text-sm font-semibold text-black">{formatDate(livestream.createdAt)}</p>
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
            <h2 className="text-xl font-semibold text-black mb-6">Livestream Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Livestream ID</label>
                <p className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded">
                  {livestream.id}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Channel</label>
                <p className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded">
                  {typeof livestream.channelId === 'object' 
                    ? (livestream.channelId as any).name 
                    : livestream.channelId}
                </p>
              </div>

              {livestream.playbackUrl && (
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Playback URL</label>
                  <a
                    href={livestream.playbackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#0000FF] hover:underline break-all block bg-gray-50 px-3 py-2 rounded"
                  >
                    {livestream.playbackUrl}
                  </a>
                </div>
              )}

              {livestream.rtmpUrl && (
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">RTMP URL</label>
                  <p className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded">
                    {livestream.rtmpUrl}
                  </p>
                </div>
              )}

              {livestream.streamKey && (
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Stream Key</label>
                  <p className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded">
                    {livestream.streamKey}
                  </p>
                </div>
              )}

              {livestream.thumbnailUrl && (
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Thumbnail URL</label>
                  <a
                    href={livestream.thumbnailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#0000FF] hover:underline break-all block bg-gray-50 px-3 py-2 rounded"
                  >
                    {livestream.thumbnailUrl}
                  </a>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Status</label>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(livestream.status)}`}
                >
                  {getStatusIcon(livestream.status)}
                  {livestream.status.charAt(0).toUpperCase() + livestream.status.slice(1)}
                </span>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Chat Enabled</label>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                    livestream.isChatEnabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  {livestream.isChatEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Created At</label>
                <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                  {formatDateTime(livestream.createdAt)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Updated At</label>
                <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                  {formatDateTime(livestream.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </MainLayout>
  );
};

export default LivestreamDetail;
