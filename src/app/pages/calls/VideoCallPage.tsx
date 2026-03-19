import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2 } from 'lucide-react';
import { callsApi } from '../../api/calls';
import { toast } from 'sonner';

export function VideoCallPage() {
  const { callId } = useParams();
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<'ringing' | 'ongoing' | 'ended'>('ringing');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (callStatus === 'ongoing') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [callStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCallStatus('ongoing');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    try {
      if (callId) {
        await callsApi.endCall(callId);
      }
      toast.success('Call ended');
      navigate('/calls');
    } catch (error: any) {
      toast.error('Failed to end call');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Main Video Area */}
      <div className="flex-1 relative bg-gray-900">
        {/* Remote Video */}
        <div className="w-full h-full flex items-center justify-center">
          {isVideoOff ? (
            <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-6xl">👤</span>
            </div>
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white">
              <p>Remote Video Stream</p>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-32 h-40 md:w-48 md:h-64 bg-gray-700 rounded-lg overflow-hidden shadow-lg">
          {isVideoOff ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <VideoOff className="w-8 h-8 text-white" />
            </div>
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white text-sm">
              <p>Your Video</p>
            </div>
          )}
        </div>

        {/* Call Info */}
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg">
          <p className="text-white text-sm">Contact Name</p>
          <p className="text-white/70 text-xs">
            {callStatus === 'ringing' ? 'Calling...' : formatDuration(callDuration)}
          </p>
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
          <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-4 rounded-full ${isMuted ? 'bg-white/30' : 'bg-white/10'} backdrop-blur-sm hover:bg-white/20 transition-colors`}
            >
              {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
            </button>

            <button
              onClick={handleEndCall}
              className="p-6 bg-destructive rounded-full hover:opacity-90 transition-opacity"
            >
              <PhoneOff className="w-8 h-8 text-white" />
            </button>

            <button
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={`p-4 rounded-full ${isVideoOff ? 'bg-white/30' : 'bg-white/10'} backdrop-blur-sm hover:bg-white/20 transition-colors`}
            >
              {isVideoOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-4 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-6 h-6 text-white" /> : <Maximize2 className="w-6 h-6 text-white" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
