import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, Video, Eye, Edit, Lock, Globe, EyeOff, Play, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { videoService } from '@/services/api/video.service';
import MainLayout from '@/components/layout/MainLayout';
import Loader from '@/components/common/Loader';
import EditVideoForm from '@/components/videos/EditVideoForm';
import { formatDate, formatDateTime } from '@/utils/helpers';
import { ROUTES } from '@/utils/constants';

const VideoDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['video', id],
    queryFn: async () => {
      if (!id) throw new Error('Video ID is required');
      const response = await videoService.getVideoById(id);
      return response.data;
    },
    enabled: !!id,
  });

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="w-4 h-4" />;
      case 'unlisted':
        return <EyeOff className="w-4 h-4" />;
      case 'private':
        return <Lock className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'bg-green-100 text-green-800';
      case 'unlisted':
        return 'bg-yellow-100 text-yellow-800';
      case 'private':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
          <Video className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-black mb-2">Video Not Found</h2>
          <p className="text-gray-600 mb-6">The video you're looking for doesn't exist or has been removed.</p>
          <Button
            onClick={() => navigate(ROUTES.VIDEOS)}
            className="bg-[#0000FF] hover:bg-[#0000CC] text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Videos
          </Button>
        </div>
      </MainLayout>
    );
  }

  const video = data;

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-black">{video.title}</h1>
        <Button
          onClick={() => setIsEditing(!isEditing)}
          className="bg-[#0000FF] hover:bg-[#0000CC] text-white"
        >
          <Edit className="w-4 h-4 mr-2" />
          {isEditing ? 'Cancel Edit' : 'Edit Video'}
        </Button>
      </div>

        {isEditing ? (
          <EditVideoForm
            video={video}
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
              {video.thumbnailUrl && (
                <div className="h-64 bg-gradient-to-r from-[#0000FF] to-[#0000CC] relative overflow-hidden">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6">
                  {!video.thumbnailUrl && (
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-[#0000FF]/10 flex items-center justify-center border-4 border-white shadow-lg">
                        <Video className="w-12 h-12 md:w-16 md:h-16 text-[#0000FF]" />
                      </div>
                    </div>
                  )}

                  <div className="flex-1">
                    <h1 className="text-3xl md:text-4xl font-bold text-black mb-2">
                      {video.title}
                    </h1>
                    <div className="flex items-center gap-3 flex-wrap mb-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getVisibilityColor(video.visibility)}`}
                      >
                        {getVisibilityIcon(video.visibility)}
                        {video.visibility}
                      </span>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          video.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {video.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {video.isFeatured && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Star className="w-3 h-3" />
                          Featured
                        </span>
                      )}
                    </div>

                    {video.description && (
                      <p className="text-gray-700 text-base leading-relaxed mb-6">
                        {video.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <Play className="w-4 h-4" />
                          <span className="text-sm">Duration</span>
                        </div>
                        <p className="text-lg font-bold text-black">{formatDuration(video.durationSeconds)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <Eye className="w-4 h-4" />
                          <span className="text-sm">Views</span>
                        </div>
                        <p className="text-lg font-bold text-black">{video.viewCount.toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Published</div>
                        <p className="text-sm font-semibold text-black">
                          {video.publishedAt ? formatDate(video.publishedAt) : '-'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Created</div>
                        <p className="text-sm font-semibold text-black">{formatDate(video.createdAt)}</p>
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
              <h2 className="text-xl font-semibold text-black mb-6">Video Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Video ID</label>
                  <p className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded">
                    {video.id}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Channel</label>
                  <p className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded">
                    {typeof video.channelId === 'object' ? video.channelId.name : video.channelId}
                  </p>
                </div>

                {video.programId && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1 block">Program</label>
                    <p className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded">
                      {typeof video.programId === 'object' ? video.programId.title : video.programId}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Playback URL</label>
                  <a
                    href={video.playbackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#0000FF] hover:underline break-all block bg-gray-50 px-3 py-2 rounded"
                  >
                    {video.playbackUrl}
                  </a>
                </div>

                {video.thumbnailUrl && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1 block">Thumbnail URL</label>
                    <a
                      href={video.thumbnailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#0000FF] hover:underline break-all block bg-gray-50 px-3 py-2 rounded"
                    >
                      {video.thumbnailUrl}
                    </a>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Visibility</label>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${getVisibilityColor(video.visibility)}`}
                  >
                    {getVisibilityIcon(video.visibility)}
                    {video.visibility}
                  </span>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Status</label>
                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                      video.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {video.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Created At</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                    {formatDateTime(video.createdAt)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Updated At</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                    {formatDateTime(video.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
    </MainLayout>
  );
};

export default VideoDetail;
