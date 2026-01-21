import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '@/utils/helpers';
import { livestreamService } from '@/services/api/livestream.service';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tv, Eye, Trash2, Radio, Square, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import Loader from '@/components/common/Loader';

const LivestreamsTable = () => {
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['livestreams', page, limit],
    queryFn: async () => {
      const response = await livestreamService.getLivestreams({ page, limit });
      return response.data;
    },
  });

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await livestreamService.deleteLivestream(id);
      toast.success('Livestream deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete livestream');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live':
        return <Radio className="w-4 h-4 text-red-600 animate-pulse" />;
      case 'scheduled':
        return <Clock className="w-4 h-4" />;
      case 'ended':
        return <Square className="w-4 h-4" />;
      case 'canceled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
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
      <div className="flex items-center justify-center py-12">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl border border-white/50 shadow-xl">
        <p className="text-red-600 text-center">
          Failed to load livestreams. Please try again later.
        </p>
      </div>
    );
  }

  const livestreams = data?.livestreams || [];
  const total = data?.total ?? 0;
  const totalPages = data?.pages ?? 1;

  if (livestreams.length === 0) {
    return (
      <div 
        className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl border border-white/50 shadow-xl"
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
        }}
      >
        <div className="text-center py-8">
          <Tv className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">No livestreams found</p>
          <p className="text-gray-500 text-sm">Create your first livestream to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/50 shadow-xl overflow-hidden"
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
      }}
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-200">
              <TableHead className="text-black font-semibold">Livestream</TableHead>
              <TableHead className="text-black font-semibold">Channel</TableHead>
              <TableHead className="text-black font-semibold">Status</TableHead>
              <TableHead className="text-black font-semibold">Scheduled Start</TableHead>
              <TableHead className="text-black font-semibold">Chat</TableHead>
              <TableHead className="text-black font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {livestreams.map((livestream) => (
              <TableRow 
                key={livestream.id} 
                className="border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/livestreams/${livestream.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    {livestream.thumbnailUrl ? (
                      <img
                        src={livestream.thumbnailUrl}
                        alt={livestream.title}
                        className="w-16 h-10 rounded object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-10 rounded bg-[#0000FF]/10 flex items-center justify-center">
                        <Tv className="w-5 h-5 text-[#0000FF]" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-black line-clamp-1">{livestream.title}</p>
                      {livestream.description && (
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {livestream.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-gray-700 text-sm">
                  {typeof livestream.channelId === 'object' 
                    ? (livestream.channelId as any).name 
                    : livestream.channelId.slice(0, 8) + '...'}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(livestream.status)}`}
                  >
                    {getStatusIcon(livestream.status)}
                    {livestream.status.charAt(0).toUpperCase() + livestream.status.slice(1)}
                  </span>
                </TableCell>
                <TableCell className="text-gray-700 text-sm">
                  {livestream.scheduledStartAt ? formatDateTime(livestream.scheduledStartAt) : '-'}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      livestream.isChatEnabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {livestream.isChatEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/livestreams/${livestream.id}`);
                      }}
                      className="h-8 w-8"
                      title="View details"
                    >
                      <Eye className="h-4 w-4 text-gray-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(livestream.id, livestream.title);
                      }}
                      disabled={deletingId === livestream.id}
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete livestream"
                    >
                      {deletingId === livestream.id ? (
                        <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-white/40">
        <div className="text-sm text-gray-600">
          Total: <span className="font-semibold text-gray-900">{total}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 mr-1">Rows:</span>
          <select
            value={limit}
            onChange={(e) => {
              setPage(1);
              setLimit(Number(e.target.value));
            }}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>

          <div className="w-px h-6 bg-gray-200 mx-2" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </Button>
          <div className="text-sm text-gray-700 px-2">
            Page <span className="font-semibold">{page}</span> of{' '}
            <span className="font-semibold">{totalPages}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LivestreamsTable;
