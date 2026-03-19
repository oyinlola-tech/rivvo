import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { statusApi, Status } from '../api/status';
import { MobileNav } from '../components/MobileNav';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export function StatusPage() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [myStatuses, setMyStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingStatuses, setViewingStatuses] = useState<Status[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusColor, setStatusColor] = useState('#0f172a');

  useEffect(() => {
    loadStatuses();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadStatuses();
    }, 8000);
    return () => clearInterval(interval);
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

  const closeStatusView = () => {
    setViewingStatuses([]);
  };

  const handleCreateStatus = async () => {
    if (!statusText.trim()) {
      toast.error('Enter a status');
      return;
    }
    try {
      await statusApi.createStatus('text', statusText.trim(), undefined, statusColor);
      toast.success('Status posted');
      setShowCreate(false);
      setStatusText('');
      await loadStatuses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to post status');
    }
  };

  const groupedStatuses = statuses.reduce((acc, status) => {
    const userId = status.userId;
    if (!acc[userId]) {
      acc[userId] = [];
    }
    acc[userId].push(status);
    return acc;
  }, {} as Record<string, Status[]>);

  Object.values(groupedStatuses).forEach((group) => {
    group.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  const currentStatus = viewingStatuses[currentIndex];

  useEffect(() => {
    if (!currentStatus || currentStatus.viewed) return;
    statusApi.viewStatus(currentStatus.id).catch(() => {});
    setStatuses((prev) =>
      prev.map((status) =>
        status.id === currentStatus.id ? { ...status, viewed: true } : status
      )
    );
    setViewingStatuses((prev) =>
      prev.map((status) =>
        status.id === currentStatus.id ? { ...status, viewed: true } : status
      )
    );
  }, [currentStatus?.id]);

  const handleNext = () => {
    if (currentIndex < viewingStatuses.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      closeStatusView();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

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
          <div
            className="flex items-center gap-3 cursor-pointer hover:bg-muted p-3 rounded-lg transition-colors"
            onClick={() => setShowCreate(true)}
          >
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
            const statusCount = userStatuses.length;
            return (
              <div
                key={userId}
                onClick={() => {
                  setViewingStatuses(userStatuses);
                  setCurrentIndex(0);
                }}
                className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors cursor-pointer"
              >
                <div className={`relative w-14 h-14 rounded-full ${hasUnviewed ? 'ring-2 ring-primary' : 'ring-2 ring-muted'} p-0.5`}>
                  <div className="w-full h-full rounded-full bg-primary/20 overflow-hidden">
                    {latestStatus.userAvatar && (
                      <img src={latestStatus.userAvatar} alt={latestStatus.userName} className="w-full h-full object-cover" />
                    )}
                  </div>
                  {statusCount > 1 && (
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] text-white flex items-center justify-center">
                      {statusCount}
                    </div>
                  )}
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
      {currentStatus && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 overflow-hidden">
                  {currentStatus.userAvatar && (
                    <img src={currentStatus.userAvatar} alt={currentStatus.userName} className="w-full h-full object-cover" />
                  )}
                </div>
                <div>
                  <p className="text-white">{currentStatus.userName}</p>
                  <p className="text-xs text-white/70">
                    {formatDistanceToNow(new Date(currentStatus.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <button onClick={closeStatusView} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="flex gap-1">
              {viewingStatuses.map((_, idx) => (
                <div
                  key={idx}
                  className={`flex-1 h-0.5 rounded ${idx === currentIndex ? 'bg-white' : 'bg-white/30'}`}
                />
              ))}
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            {currentStatus.type === 'image' && (
              <img src={currentStatus.content} alt="" className="max-w-full max-h-full object-contain" />
            )}
            {currentStatus.type === 'video' && (
              <video src={currentStatus.content} controls className="max-w-full max-h-full object-contain" />
            )}
            {currentStatus.type === 'text' && (
              <div className="text-center p-8" style={{ backgroundColor: currentStatus.backgroundColor }}>
                <p className="text-2xl text-white">{currentStatus.content}</p>
              </div>
            )}
          </div>

          {currentStatus.caption && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
              <p className="text-white text-center">{currentStatus.caption}</p>
            </div>
          )}

          <button
            onClick={handlePrev}
            className="absolute left-0 top-0 bottom-0 w-1/3"
            aria-label="Previous status"
          />
          <button
            onClick={handleNext}
            className="absolute right-0 top-0 bottom-0 w-1/3"
            aria-label="Next status"
          />
        </div>
      )}

      <MobileNav />

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg text-foreground">Create status</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-2 rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <textarea
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full min-h-[120px] px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
            <div className="flex items-center gap-2">
              {['#0f172a', '#1e40af', '#16a34a', '#c026d3', '#ea580c'].map((color) => (
                <button
                  key={color}
                  onClick={() => setStatusColor(color)}
                  className={`h-7 w-7 rounded-full border ${statusColor === color ? 'ring-2 ring-primary' : 'border-border'}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Set color ${color}`}
                />
              ))}
            </div>
            <button
              onClick={handleCreateStatus}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Post status
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
