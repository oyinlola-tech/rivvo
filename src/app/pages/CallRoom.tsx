import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
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

  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnectionEntry>>(new Map());
  const peerNamesRef = useRef<Map<string, string>>(new Map());

  const localName = useMemo(() => user?.name || "Guest", [user]);
  const authToken = useMemo(() => localStorage.getItem("authToken"), []);

  const { videoRef: localVideoRef } = useVideoStream(localStream, true);

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

  const leaveCall = () => {
    socketRef.current?.emit("call:leave");
    if (window.opener) {
      window.close();
    } else {
      window.location.assign("/calls");
    }
  };

  const totalParticipants = 1 + remoteStreams.length;

  return (
    <div className="min-h-[100dvh] bg-[#111b21] text-white">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Call Room</h1>
            <p className="text-sm text-gray-300">
              {callScope ? `${callScope} call` : "Call"} - {callType} -{" "}
              {totalParticipants}/{MAX_PARTICIPANTS} participants
            </p>
          </div>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition"
              onClick={toggleMic}
            >
              {micEnabled ? "Mute mic" : "Unmute mic"}
            </button>
            <button
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition disabled:opacity-40"
              onClick={toggleCamera}
              disabled={callType !== "video"}
            >
              {cameraEnabled ? "Stop video" : "Start video"}
            </button>
            <button
              className="px-4 py-2 rounded-full bg-red-500 hover:bg-red-600 transition"
              onClick={leaveCall}
            >
              Leave call
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {!error && status && (
          <div className="text-sm text-gray-300">{status}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-2xl p-4 flex flex-col gap-2">
            <div className="text-xs uppercase tracking-wide text-gray-400">You</div>
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video
                ref={localVideoRef}
                className="w-full aspect-video object-cover"
                autoPlay
                playsInline
                muted
              />
              {callType === "audio" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm">
                  Audio only
                </div>
              )}
              {!cameraEnabled && callType === "video" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm">
                  Camera off
                </div>
              )}
            </div>
            <div className="text-sm">{localName}</div>
          </div>

          {remoteStreams.map((peer) => (
            <RemoteTile key={peer.peerId} peerId={peer.peerId} name={peer.name} stream={peer.stream} />
          ))}
        </div>
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


