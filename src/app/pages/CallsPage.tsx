import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { callsApi, Call } from '../api/calls';
import { MobileNav } from '../components/MobileNav';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCalls();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadCalls();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const loadCalls = async () => {
    try {
      setLoading(true);
      const { calls: callsData } = await callsApi.getCallHistory();
      setCalls(callsData);
    } catch (error: any) {
      toast.error('Failed to load call history');
    } finally {
      setLoading(false);
    }
  };

  const getCallIcon = (call: Call) => {
    if (call.status === 'missed') {
      return <PhoneMissed className="w-5 h-5 text-destructive" />;
    }
    if (call.status === 'declined') {
      return <PhoneMissed className="w-5 h-5 text-destructive" />;
    }
    return call.type === 'video' ? (
      <Video className="w-5 h-5 text-[var(--online-indicator)]" />
    ) : (
      <Phone className="w-5 h-5 text-[var(--online-indicator)]" />
    );
  };

  const getCallDirection = (call: Call, userId: string) => {
    if (call.callerId === userId) {
      return <PhoneOutgoing className="w-4 h-4 text-muted-foreground" />;
    }
    return <PhoneIncoming className="w-4 h-4 text-muted-foreground" />;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <h2 className="text-2xl text-foreground">Calls</h2>
      </div>

      {/* Call List */}
      <div className="flex-1 overflow-y-auto pb-20 md:pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Phone className="w-16 h-16 mb-4 opacity-50" />
            <p>No call history</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {calls.map((call) => (
              <div key={call.id} className="flex items-center gap-3 p-4 hover:bg-muted transition-colors">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {call.callerAvatar || call.receiverAvatar ? (
                    <img
                      src={call.callerAvatar || call.receiverAvatar}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-primary text-lg">
                      {(call.callerName || call.receiverName)?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getCallDirection(call, 'current-user-id')}
                    <p className={`truncate ${call.status === 'missed' ? 'text-destructive' : 'text-foreground'}`}>
                      {call.callerName === 'You' ? call.receiverName : call.callerName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {call.status === 'missed' || call.status === 'declined'
                        ? call.status.charAt(0).toUpperCase() + call.status.slice(1)
                        : call.duration
                        ? formatDuration(call.duration)
                        : 'No answer'}
                    </span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {getCallIcon(call)}
                  <button
                    onClick={() => navigate(`/call/${call.type}/${call.id}`)}
                    className="p-2 hover:bg-muted rounded-full transition-colors"
                  >
                    {call.type === 'video' ? (
                      <Video className="w-5 h-5 text-primary" />
                    ) : (
                      <Phone className="w-5 h-5 text-primary" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
