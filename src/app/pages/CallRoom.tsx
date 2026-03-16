import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";`nimport { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, VolumeX, SwitchCamera } from "lucide-react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuth } from "../contexts/AuthContext";

type CallType = "audio" | "video";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const MAX_PARTICIPANTS = 10;

type PeerConnectionEntry = {
  pc: RTCPeerConnection;
  pendingCandidates: RTCIceCandidateInit[];
};

function useVideoStream(stream: MediaStream | null, muted: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
  }, [stream]);

  return { videoRef, muted };
}

export default function CallRoom() {
  const { token } = useParams();
  const { user } = useAuth();
  const [callType, setCallType] = useState<CallType>("video");
  const [callScope, setCallScope] = useState<"direct" | "group" | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    { peerId: string; stream: MediaStream; name: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Preparing media...");
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [joined, setJoined] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [usingFrontCamera, setUsingFrontCamera] = useState(true);

  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnectionEntry>>(new Map());
  const peerNamesRef = useRef<Map<string, string>>(new Map());

  const localName = useMemo(() => user?.name || "Guest", [user]);
  const authToken = useMemo(() => localStorage.getItem("authToken"), []);

  const { videoRef: localVideoRef } = useVideoStream(localStream, true);
  const primaryStream = remoteStreams[0]?.stream ?? null;
  const { videoRef: primaryVideoRef } = useVideoStream(primaryStream, false);

  const updateRemoteStreams = () => {
    const next = Array.from(peerConnectionsRef.current.entries()).flatMap(([peerId]) => {
      const stream = peerStreamsRef.current.get(peerId);
      if (!stream) return [];
      const name = peerNamesRef.current.get(peerId) || "Guest";
      return [{ peerId, stream, name }];
    });
    setRemoteStreams(next);
  };

  const peerStreamsRef = useRef<Map<string, MediaStream>>(new Map());

  const createPeerConnection = (peerId: string) => {
    const existing = peerConnectionsRef.current.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    const entry: PeerConnectionEntry = { pc, pendingCandidates: [] };

    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("call:signal", {
          to: peerId,
          data: { type: "candidate", candidate: event.candidate.toJSON() },
        });
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      peerStreamsRef.current.set(peerId, stream);
      updateRemoteStreams();
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        cleanupPeer(peerId);
      }
    };

    peerConnectionsRef.current.set(peerId, entry);
    return entry;
  };

  const cleanupPeer = (peerId: string) => {
    const entry = peerConnectionsRef.current.get(peerId);
    if (entry) {
      entry.pc.close();
    }
    peerConnectionsRef.current.delete(peerId);
    peerStreamsRef.current.delete(peerId);
    peerNamesRef.current.delete(peerId);
    updateRemoteStreams();
  };

  const handleSignal = async (from: string, data: any) => {
    const entry = createPeerConnection(from);
    const pc = entry.pc;

    if (data.type === "offer") {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current?.emit("call:signal", {
        to: from,
        data: { type: "answer", sdp: pc.localDescription },
      });
    } else if (data.type === "answer") {
      if (!pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      }
    } else if (data.type === "candidate") {
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } else {
        entry.pendingCandidates.push(data.candidate);
      }
    }

    if (pc.remoteDescription && entry.pendingCandidates.length) {
      const pending = [...entry.pendingCandidates];
      entry.pendingCandidates = [];
      await Promise.all(
        pending.map((candidate) => pc.addIceCandidate(new RTCIceCandidate(candidate)))
      );
    }
  };

  useEffect(() => {
    if (!token) {
      setError("Missing call token.");
      return;
    }

    let cancelled = false;

    const loadCallInfo = async () => {
      try {
        const response = await api.resolveCallLink(token);
        if (cancelled) return;
        if (response.success && response.data) {
          setCallType(response.data.type === "audio" ? "audio" : "video");
          setCallScope(response.data.scope ?? null);
        }
      } catch {
        // Non-call-link tokens (direct calls) are supported; default to video.
      }
    };

    loadCallInfo();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const startMedia = async () => {
      setStatus("Requesting media access...");
      try {
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: callType === "video",
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) return;
        setLocalStream(stream);
        setMicEnabled(true);
        setCameraEnabled(callType === "video");
        setStatus("Connecting...");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to access camera or microphone."
          );
        }
      }
    };

    startMedia();

    return () => {
      cancelled = true;
    };
  }, [callType, token]);

  useEffect(() => {
    if (!token || !localStream || joined) return;

    const socket = getSocket(authToken);
    socketRef.current = socket;

    const handleFull = () => {
      setError(`Room is full (max ${MAX_PARTICIPANTS} participants).`);
    };

    const handlePeers = async (peers: { peerId: string; name: string }[]) => {
      setStatus("Connected");
      for (const peer of peers) {
        peerNamesRef.current.set(peer.peerId, peer.name || "Guest");
        const entry = createPeerConnection(peer.peerId);
        const offer = await entry.pc.createOffer();
        await entry.pc.setLocalDescription(offer);
        socket.emit("call:signal", {
          to: peer.peerId,
          data: { type: "offer", sdp: entry.pc.localDescription },
        });
      }
    };

    const handlePeerJoined = ({ peerId, name }: { peerId: string; name: string }) => {
      peerNamesRef.current.set(peerId, name || "Guest");
      updateRemoteStreams();
    };

    const handlePeerLeft = ({ peerId }: { peerId: string }) => {
      cleanupPeer(peerId);
    };

    const handleSignalEvent = ({ from, data }: { from: string; data: any }) => {
      handleSignal(from, data).catch(() => undefined);
    };

    socket.on("call:full", handleFull);
    socket.on("call:peers", handlePeers);
    socket.on("call:peer-joined", handlePeerJoined);
    socket.on("call:peer-left", handlePeerLeft);
    socket.on("call:signal", handleSignalEvent);

    socket.emit("call:join", { roomId: token, name: localName });
    setStatus("Waiting for others...");
    setJoined(true);

    return () => {
      socket.off("call:full", handleFull);
      socket.off("call:peers", handlePeers);
      socket.off("call:peer-joined", handlePeerJoined);
      socket.off("call:peer-left", handlePeerLeft);
      socket.off("call:signal", handleSignalEvent);
      socket.emit("call:leave");
      setJoined(false);
    };
  }, [authToken, localName, localStream, joined, token]);

  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach((track) => track.stop());
      peerConnectionsRef.current.forEach((entry) => entry.pc.close());
      peerConnectionsRef.current.clear();
      peerStreamsRef.current.clear();
      peerNamesRef.current.clear();
    };
  }, [localStream]);

  const toggleMic = () => {
    if (!localStream) return;
    const next = !micEnabled;
    localStream.getAudioTracks().forEach((track) => (track.enabled = next));
    setMicEnabled(next);
  };

  const toggleCamera = () => {
    if (!localStream || callType !== "video") return;
    const next = !cameraEnabled;
    localStream.getVideoTracks().forEach((track) => (track.enabled = next));
    setCameraEnabled(next);
  };

  const toggleSpeaker = async () => {
    setSpeakerEnabled((prev) => !prev);
    if ("setSinkId" in HTMLMediaElement.prototype) {
      const sinkId = speakerEnabled ? "default" : "communications";
      const elements = document.querySelectorAll("video, audio");
      await Promise.all(
        Array.from(elements).map(async (el) => {
          const media = el as HTMLMediaElement;
          if (typeof (media as any).setSinkId === "function") {
            try {
              await (media as any).setSinkId(sinkId);
            } catch {
              // ignore
            }
          }
        })
      );
    }
  };

  const switchCamera = async () => {
    if (callType !== "video") return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((device) => device.kind === "videoinput");
      if (videoInputs.length < 2) return;
      const nextFacingMode = usingFrontCamera ? "environment" : "user";
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacingMode },
        audio: true,
      });
      localStream?.getTracks().forEach((track) => track.stop());
      setLocalStream(stream);
      setUsingFrontCamera(!usingFrontCamera);
    } catch {
      // ignore
    }
  };

  const leaveCall = () => {
    socketRef.current?.emit("call:leave");
    if (token) {
      api.updateCallStatus(token, "completed").catch(() => undefined);
    }
    if (window.opener) {
      window.close();
    } else {
      window.location.assign("/calls");
    }
  };

  const totalParticipants = 1 + remoteStreams.length;

  const primaryPeer = remoteStreams[0];
  const showGrid = remoteStreams.length > 1;

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col">
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold">
            {callScope ? `${callScope} call` : "Call"} {callType === "video" ? "video" : "audio"}
          </p>
          <p className="text-xs text-white/70">{error ? error : status}</p>
        </div>
        <div className="text-xs text-white/50">
          {totalParticipants}/{MAX_PARTICIPANTS}
        </div>
      </div>

      <div className="flex-1 relative px-4 pb-4">
        {!showGrid && (
          <div className="w-full h-full rounded-3xl overflow-hidden bg-black relative">
            {primaryPeer ? (
              <video
                ref={primaryVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/60">
                Waiting for participant...
              </div>
            )}
            <div className="absolute bottom-4 right-4 w-28 h-40 rounded-2xl overflow-hidden bg-black shadow-xl border border-white/10">
              <video
                ref={localVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              {!cameraEnabled && callType === "video" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs">
                  Camera off
                </div>
              )}
              {callType === "audio" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs">
                  Audio
                </div>
              )}
            </div>
          </div>
        )}

        {showGrid && (
          <div className="grid grid-cols-2 gap-3 h-full">
            <div className="rounded-2xl overflow-hidden bg-black relative">
              <video
                ref={localVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              {!cameraEnabled && callType === "video" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs">
                  Camera off
                </div>
              )}
            </div>
            {remoteStreams.map((peer) => (
              <RemoteTile key={peer.peerId} peerId={peer.peerId} name={peer.name} stream={peer.stream} />
            ))}
          </div>
        )}
      </div>

      <div className="px-6 pb-8 pt-4 flex items-center justify-center gap-6">
        <button
          className={`w-14 h-14 rounded-full flex items-center justify-center ${
            micEnabled ? "bg-white/10" : "bg-red-500"
          }`}
          onClick={toggleMic}
          aria-label="Toggle mic"
        >
          {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
        </button>
        <button
          className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10"
          onClick={switchCamera}
          aria-label="Switch camera"
        >
          <SwitchCamera size={22} />
        </button>
        <button
          className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center"
          onClick={leaveCall}
          aria-label="End call"
        >
          <PhoneOff size={24} />
        </button>
        <button
          className={`w-14 h-14 rounded-full flex items-center justify-center ${
            speakerEnabled ? "bg-white/10" : "bg-red-500"
          }`}
          onClick={toggleSpeaker}
          aria-label="Toggle speaker"
        >
          {speakerEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
        </button>
        <button
          className={`w-14 h-14 rounded-full flex items-center justify-center ${
            cameraEnabled ? "bg-white/10" : "bg-red-500"
          } ${callType !== "video" ? "opacity-40" : ""}`}
          onClick={toggleCamera}
          disabled={callType !== "video"}
          aria-label="Toggle camera"
        >
          {cameraEnabled ? <Video size={22} /> : <VideoOff size={22} />}
        </button>
      </div>
    </div>
  );
}

function RemoteTile({
  peerId,
  name,
  stream,
}: {
  peerId: string;
  name: string;
  stream: MediaStream;
}) {
  const { videoRef } = useVideoStream(stream, false);
  const hasVideo = stream.getVideoTracks().length > 0;

  return (
    <div className="bg-black/30 rounded-2xl p-4 flex flex-col gap-2">
      <div className="text-xs uppercase tracking-wide text-gray-400">Participant</div>
      <div className="relative rounded-xl overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="w-full aspect-video object-cover"
          autoPlay
          playsInline
        />
        {!hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm">
            Audio only
          </div>
        )}
      </div>
      <div className="text-sm">{name || peerId}</div>
    </div>
  );
}




