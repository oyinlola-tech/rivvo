import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { statusApi, Status } from '../api/status';
import { useAuth } from '../contexts/AuthContext';
import { MobileNav } from '../components/MobileNav';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export function StatusPage() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [myStatuses, setMyStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingStatus, setViewingStatus] = useState<Status | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    try {
      setLoading(true);
      const [allStatuses, myStatusData] = await Promise.all([
        statusApi.getStatuses(),
        statusApi.getMyStatuses(),
      ]);
      setStatuses(allStatuses);
      setMyStatuses(myStatusData);
    } catch (error: any) {
      toast.error('Failed to load statuses');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStatus = async (status: Status) => {
    setViewingStatus(status);
    setCurrentIndex(0);
    if (!status.viewed) {
      await statusApi.viewStatus(status.id);
    }
  };

  const closeStatusView = () => {
    setViewingStatus(null);
  };

  const groupedStatuses = statuses.reduce((acc, status) => {
    const userId = status.userId;
    if (!acc[userId]) {
      acc[userId] = [];
    }
    acc[userId].push(status);
    return acc;
  }, {} as Record<string, Status[]>);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <h2 className="text-2xl text-foreground">Status</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20 md:pb-4">
        {/* My Status */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm text-muted-foreground uppercase tracking-wider mb-3">My Status</h3>
          <div className="flex items-center gap-3 cursor-pointer hover:bg-muted p-3 rounded-lg transition-colors">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-foreground flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <p className="text-foreground">Add Status</p>
              <p className="text-sm text-muted-foreground">Tap to add status update</p>
            </div>
          </div>
          {myStatuses.length > 0 && (
            <div className="mt-3">
              {myStatuses.map(status => (
                <div key={status.id} className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors cursor-pointer">
                  <div className="w-14 h-14 rounded-full ring-2 ring-primary p-0.5">
                    <div className="w-full h-full rounded-full bg-primary/20 overflow-hidden">
                      {status.type === 'image' && <img src={status.content} alt="" className="w-full h-full object-cover" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground">My Status</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(status.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{status.viewCount} views</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Updates */}
        <div className="p-4">
          <h3 className="text-sm text-muted-foreground uppercase tracking-wider mb-3">Recent Updates</h3>
          {Object.entries(groupedStatuses).map(([userId, userStatuses]) => {
            const latestStatus = userStatuses[0];
            const hasUnviewed = userStatuses.some(s => !s.viewed);
            return (
              <div
                key={userId}
                onClick={() => handleViewStatus(latestStatus)}
                className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors cursor-pointer"
              >
                <div className={`w-14 h-14 rounded-full ${hasUnviewed ? 'ring-2 ring-primary' : 'ring-2 ring-muted'} p-0.5`}>
                  <div className="w-full h-full rounded-full bg-primary/20 overflow-hidden">
                    {latestStatus.userAvatar && (
                      <img src={latestStatus.userAvatar} alt={latestStatus.userName} className="w-full h-full object-cover" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <p className={hasUnviewed ? 'text-foreground' : 'text-muted-foreground'}>{latestStatus.userName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(latestStatus.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Viewer */}
      {viewingStatus && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 overflow-hidden">
                  {viewingStatus.userAvatar && (
                    <img src={viewingStatus.userAvatar} alt={viewingStatus.userName} className="w-full h-full object-cover" />
                  )}
                </div>
                <div>
                  <p className="text-white">{viewingStatus.userName}</p>
                  <p className="text-xs text-white/70">
                    {formatDistanceToNow(new Date(viewingStatus.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <button onClick={closeStatusView} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 1 }).map((_, idx) => (
                <div key={idx} className={`flex-1 h-0.5 rounded ${idx === currentIndex ? 'bg-white' : 'bg-white/30'}`} />
              ))}
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            {viewingStatus.type === 'image' && (
              <img src={viewingStatus.content} alt="" className="max-w-full max-h-full object-contain" />
            )}
            {viewingStatus.type === 'text' && (
              <div className="text-center p-8" style={{ backgroundColor: viewingStatus.backgroundColor }}>
                <p className="text-2xl text-white">{viewingStatus.content}</p>
              </div>
            )}
          </div>

          {viewingStatus.caption && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
              <p className="text-white text-center">{viewingStatus.caption}</p>
            </div>
          )}
        </div>
      )}

      <MobileNav />
    </div>
  );
}
