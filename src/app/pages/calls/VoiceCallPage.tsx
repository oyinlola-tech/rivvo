import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { callsApi } from '../../api/calls';
import { toast } from 'sonner';

export function VoiceCallPage() {
  const { callId } = useParams();
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<'ringing' | 'ongoing' | 'ended'>('ringing');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'ongoing') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
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

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary to-primary-foreground flex flex-col items-center justify-between p-8 text-white z-50">
      {/* Top Section */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
          <span className="text-6xl">👤</span>
        </div>
        <h2 className="text-3xl mb-2">Contact Name</h2>
        <p className="text-xl text-white/80">
          {callStatus === 'ringing' ? 'Calling...' : formatDuration(callDuration)}
        </p>
      </div>

      {/* Controls */}
      <div className="w-full max-w-md mb-8">
        <div className="flex items-center justify-center gap-6 mb-8">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full ${isMuted ? 'bg-white/30' : 'bg-white/10'} backdrop-blur-sm hover:bg-white/20 transition-colors`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <button
            onClick={() => setIsSpeaker(!isSpeaker)}
            className={`p-4 rounded-full ${isSpeaker ? 'bg-white/30' : 'bg-white/10'} backdrop-blur-sm hover:bg-white/20 transition-colors`}
          >
            {isSpeaker ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleEndCall}
            className="p-6 bg-destructive rounded-full hover:opacity-90 transition-opacity"
          >
            <PhoneOff className="w-8 h-8" />
          </button>
        </div>
      </div>
    </div>
  );
}
