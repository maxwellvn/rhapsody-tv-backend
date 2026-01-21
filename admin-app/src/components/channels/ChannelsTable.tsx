import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/utils/helpers';
import { channelService } from '@/services/api/channel.service';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Radio, ExternalLink, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import Loader from '@/components/common/Loader';
import { ROUTES } from '@/utils/constants';

const ChannelsTable = () => {
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['channels', page, limit],
    queryFn: async () => {
      const response = await channelService.getChannels({ page, limit });
      return response.data;
    },
  });

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await channelService.deleteChannel(id);
      toast.success('Channel deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete channel');
    } finally {
      setDeletingId(null);
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
          Failed to load channels. Please try again later.
        </p>
      </div>
    );
  }

  const channels = data?.channels || [];
  const total = data?.total ?? 0;
  const totalPages = data?.pages ?? 1;

  if (channels.length === 0) {
    return (
      <div 
        className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl border border-white/50 shadow-xl"
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
        }}
      >
        <div className="text-center py-8">
          <Radio className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">No channels found</p>
          <p className="text-gray-500 text-sm">Create your first channel to get started</p>
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
              <TableHead className="text-black font-semibold">Channel</TableHead>
              <TableHead className="text-black font-semibold">Slug</TableHead>
              <TableHead className="text-black font-semibold">Status</TableHead>
              <TableHead className="text-black font-semibold">Videos</TableHead>
              <TableHead className="text-black font-semibold">Subscribers</TableHead>
              <TableHead className="text-black font-semibold">Created</TableHead>
              <TableHead className="text-black font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.map((channel) => (
              <TableRow 
                key={channel.id} 
                className="border-gray-100 hover:bg-gray-50/50 transition-colors"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    {channel.logoUrl ? (
                      <img
                        src={channel.logoUrl}
                        alt={channel.name}
                        className="w-10 h-10 rounded-lg object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#0000FF]/10 flex items-center justify-center">
                        <Radio className="w-5 h-5 text-[#0000FF]" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-black">{channel.name}</p>
                      {channel.description && (
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {channel.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                    {channel.slug}
                  </code>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      channel.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {channel.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="text-gray-700">
                  {channel.videoCount}
                </TableCell>
                <TableCell className="text-gray-700">
                  {channel.subscriberCount}
                </TableCell>
                <TableCell className="text-gray-600 text-sm">
                  {formatDate(channel.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {channel.websiteUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(channel.websiteUrl, '_blank');
                        }}
                        className="h-8 w-8"
                        title="Visit website"
                      >
                        <ExternalLink className="h-4 w-4 text-gray-600" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(ROUTES.CHANNEL_DETAIL(channel.id));
                      }}
                      className="h-8 w-8"
                      title="View details"
                    >
                      <Eye className="h-4 w-4 text-gray-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(channel.id, channel.name)}
                      disabled={deletingId === channel.id}
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete channel"
                    >
                      {deletingId === channel.id ? (
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

export default ChannelsTable;
