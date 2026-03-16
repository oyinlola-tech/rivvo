import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuth } from "./AuthContext";

type CallUser = {
  id: string;
  name: string;
  avatar?: string | null;
  isVerifiedBadge?: boolean;
  isModerator?: boolean;
  isAdmin?: boolean;
};

type OutgoingCall = {
  callId: string;
  type: "audio" | "video";
  toUser: CallUser;
  roomUrl: string;
  status: "calling" | "ringing";
};

type IncomingCall = {
  callId: string;
  type: "audio" | "video";
  fromUser: CallUser;
};

type CallContextValue = {
  outgoingCall: OutgoingCall | null;
  incomingCall: IncomingCall | null;
  missedToast: { id: string; text: string } | null;
  outgoingSecondsLeft: number | null;
  startCall: (user: CallUser, type: "audio" | "video") => Promise<void>;
  cancelCall: () => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
};

const CallContext = createContext<CallContextValue | null>(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within CallProvider");
  }
  return context;
};

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [outgoingCall, setOutgoingCall] = useState<OutgoingCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [missedToast, setMissedToast] = useState<{ id: string; text: string } | null>(null);
  const [outgoingSecondsLeft, setOutgoingSecondsLeft] = useState<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const ringbackRef = useRef<{ stop: () => void } | null>(null);
  const ringtoneRef = useRef<{ stop: () => void } | null>(null);
  const countdownRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const clearTimeoutIfAny = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const ensureAudioContext = async () => {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContextCtor();
    }
    if (audioCtxRef.current.state === "suspended") {
      try {
        await audioCtxRef.current.resume();
      } catch {
        return null;
      }
    }
    return audioCtxRef.current;
  };

  const emitIfConnected = (socket: ReturnType<typeof getSocket>, event: string, payload: any) => {
    if (socket.connected) {
      socket.emit(event, payload);
      return;
    }
    socket.once("connect", () => socket.emit(event, payload));
  };

  const playTone = (pattern: number[]) => {
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state !== "running") return null;
    const gain = ctx.createGain();
    gain.gain.value = 0.08;
    gain.connect(ctx.destination);
    let running = true;
    let index = 0;

    const tick = () => {
      if (!running) return;
      const duration = pattern[index % pattern.length];
      const oscillator = ctx.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = 440;
      oscillator.connect(gain);
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration / 1000);
      index += 1;
      window.setTimeout(tick, duration);
    };

    tick();

    return {
      stop: () => {
        running = false;
        // keep context for later reuse
      },
    };
  };

  const startCall = async (peer: CallUser, type: "audio" | "video") => {
    if (!peer?.id) return;
    await ensureAudioContext();
    clearTimeoutIfAny();
    const response = await api.initiateCall(peer.id, type);
    if (!response.success || !response.data?.callId || !response.data?.roomUrl) {
      return;
    }
    setOutgoingCall({
      callId: response.data.callId,
      type: response.data.type || type,
      toUser: peer,
      roomUrl: response.data.roomUrl,
      status: "calling",
    });
    setOutgoingSecondsLeft(30);
    countdownRef.current = window.setInterval(() => {
      setOutgoingSecondsLeft((prev) => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);
    ringbackRef.current?.stop();
    ringbackRef.current = playTone([800, 800, 800, 800]);
    timeoutRef.current = window.setTimeout(async () => {
      if (response.data?.callId) {
        await api.updateCallStatus(response.data.callId, "missed");
      }
      setMissedToast({
        id: response.data.callId,
        text: `Missed ${type === "video" ? "video" : "voice"} call`,
      });
      setOutgoingCall(null);
      setOutgoingSecondsLeft(null);
      ringbackRef.current?.stop();
      clearTimeoutIfAny();
    }, 30000);
  };

  const cancelCall = async () => {
    if (!outgoingCall) return;
    await ensureAudioContext();
    const token = localStorage.getItem("authToken");
    const socket = getSocket(token);
    emitIfConnected(socket, "call:cancel", {
      callId: outgoingCall.callId,
      toUserId: outgoingCall.toUser.id,
    });
    await api.updateCallStatus(outgoingCall.callId, "missed");
    setOutgoingCall(null);
    setOutgoingSecondsLeft(null);
    ringbackRef.current?.stop();
    clearTimeoutIfAny();
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    await ensureAudioContext();
    const token = localStorage.getItem("authToken");
    const socket = getSocket(token);
    emitIfConnected(socket, "call:accept", {
      callId: incomingCall.callId,
      toUserId: incomingCall.fromUser.id,
    });
    setIncomingCall(null);
    ringtoneRef.current?.stop();
    clearTimeoutIfAny();
    navigate(`/call/room/${incomingCall.callId}?type=${incomingCall.type}`);
  };

  const declineCall = async () => {
    if (!incomingCall) return;
    await ensureAudioContext();
    const token = localStorage.getItem("authToken");
    const socket = getSocket(token);
    emitIfConnected(socket, "call:decline", {
      callId: incomingCall.callId,
      toUserId: incomingCall.fromUser.id,
    });
    await api.updateCallStatus(incomingCall.callId, "missed");
    setIncomingCall(null);
    ringtoneRef.current?.stop();
    clearTimeoutIfAny();
  };

  useEffect(() => {
    if (!user?.id) return;
    const token = localStorage.getItem("authToken");
    const socket = getSocket(token);

    const handleIncoming = (payload: any) => {
      if (outgoingCall || incomingCall) {
        emitIfConnected(socket, "call:decline", {
          callId: payload.callId,
          toUserId: payload.fromUser?.id || payload.fromUserId,
        });
        return;
      }
      const fromUser = payload.fromUser || {
        id: payload.fromUserId,
        name: "Unknown",
        avatar: null,
      };
      setIncomingCall({
        callId: payload.callId,
        type: payload.type === "video" ? "video" : "audio",
        fromUser,
      });
      ringtoneRef.current?.stop();
      // Only start ringtone after a user gesture unlocks audio context.
      emitIfConnected(socket, "call:ringing", { callId: payload.callId, toUserId: fromUser.id });
    };

    const handleAccepted = (payload: any) => {
      if (!outgoingCall || payload.callId !== outgoingCall.callId) return;
      setOutgoingCall(null);
      setOutgoingSecondsLeft(null);
      ringbackRef.current?.stop();
      clearTimeoutIfAny();
      navigate(`/call/room/${payload.callId}?type=${outgoingCall.type}`);
    };

    const handleDeclined = (payload: any) => {
      if (!outgoingCall || payload.callId !== outgoingCall.callId) return;
      setOutgoingCall(null);
      setOutgoingSecondsLeft(null);
      ringbackRef.current?.stop();
      clearTimeoutIfAny();
    };

    const handleCancelled = (payload: any) => {
      if (!incomingCall || payload.callId !== incomingCall.callId) return;
      setIncomingCall(null);
      ringtoneRef.current?.stop();
      clearTimeoutIfAny();
    };

    const handleRinging = (payload: any) => {
      if (!outgoingCall || payload.callId !== outgoingCall.callId) return;
      setOutgoingCall((prev) => (prev ? { ...prev, status: "ringing" } : prev));
    };

    socket.on("incoming_call", handleIncoming);
    socket.on("call:accepted", handleAccepted);
    socket.on("call:declined", handleDeclined);
    socket.on("call:cancelled", handleCancelled);
    socket.on("call:ringing", handleRinging);

    return () => {
      socket.off("incoming_call", handleIncoming);
      socket.off("call:accepted", handleAccepted);
      socket.off("call:declined", handleDeclined);
      socket.off("call:cancelled", handleCancelled);
      socket.off("call:ringing", handleRinging);
    };
  }, [user?.id, outgoingCall, incomingCall, navigate]);

  const value: CallContextValue = {
    outgoingCall,
    incomingCall,
    missedToast,
    outgoingSecondsLeft,
    startCall,
    cancelCall,
    acceptCall,
    declineCall,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};
