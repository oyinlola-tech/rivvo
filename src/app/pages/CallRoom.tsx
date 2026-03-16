import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, VolumeX, SwitchCamera } from "lucide-react";
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
  audioSender?: RTCRtpSender;
  videoSender?: RTCRtpSender;
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
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const socketIdRef = useRef<string | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnectionEntry>>(new Map());
  const peerNamesRef = useRef<Map<string, string>>(new Map());
  const makingOfferRef = useRef<Map<string, boolean>>(new Map());
  const politeRef = useRef<Map<string, boolean>>(new Map());

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

  const updateSendersWithStream = (entry: PeerConnectionEntry, stream: MediaStream | null) => {
    const audioTrack = stream?.getAudioTracks()[0] ?? null;
    const videoTrack = stream?.getVideoTracks()[0] ?? null;

    if (entry.audioSender) {
      entry.audioSender.replaceTrack(audioTrack).catch(() => undefined);
    }
    if (entry.videoSender) {
      entry.videoSender.replaceTrack(videoTrack).catch(() => undefined);
    }
  };

  const createPeerConnection = (peerId: string) => {
    const existing = peerConnectionsRef.current.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    const audioTransceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
    const videoTransceiver = pc.addTransceiver("video", {
      direction: callType === "video" ? "sendrecv" : "inactive",
    });
    const entry: PeerConnectionEntry = {
      pc,
      pendingCandidates: [],
      audioSender: audioTransceiver.sender,
      videoSender: videoTransceiver.sender,
    };

    updateSendersWithStream(entry, localStream);
    makingOfferRef.current.set(peerId, false);
    if (!politeRef.current.has(peerId)) {
      const localId = socketIdRef.current;
      politeRef.current.set(peerId, localId ? localId < peerId : true);
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

    pc.onnegotiationneeded = async () => {
      const socket = socketRef.current;
      if (!socket) return;
      if (makingOfferRef.current.get(peerId)) return;
      try {
        makingOfferRef.current.set(peerId, true);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("call:signal", {
          to: peerId,
          data: { type: "offer", sdp: pc.localDescription },
        });
      } catch {
        // ignore negotiation errors
      } finally {
        makingOfferRef.current.set(peerId, false);
      }
    };

    peerConnectionsRef.current.set(peerId, entry);
    return entry;
  };

  const makeOffer = async (peerId: string) => {
    const socket = socketRef.current;
    if (!socket) return;
    const entry = createPeerConnection(peerId);
    const pc = entry.pc;
    if (makingOfferRef.current.get(peerId)) return;
    try {
      makingOfferRef.current.set(peerId, true);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call:signal", {
        to: peerId,
        data: { type: "offer", sdp: pc.localDescription },
      });
    } catch {
      // ignore
    } finally {
      makingOfferRef.current.set(peerId, false);
    }
  };

  const cleanupPeer = (peerId: string) => {
    const entry = peerConnectionsRef.current.get(peerId);
    if (entry) {
      entry.pc.close();
    }
    peerConnectionsRef.current.delete(peerId);
    peerStreamsRef.current.delete(peerId);
    peerNamesRef.current.delete(peerId);
    makingOfferRef.current.delete(peerId);
    politeRef.current.delete(peerId);
    updateRemoteStreams();
  };

  const handleSignal = async (from: string, data: any) => {
    const entry = createPeerConnection(from);
    const pc = entry.pc;

    if (data.type === "offer") {
      const makingOffer = makingOfferRef.current.get(from) || false;
      const polite = politeRef.current.get(from) ?? true;
      const offerCollision = makingOffer || pc.signalingState !== "stable";
      if (offerCollision && !polite) {
        return;
      }
      if (offerCollision) {
        try {
          await pc.setLocalDescription({ type: "rollback" });
        } catch {
          // ignore rollback errors
        }
      }
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
        if (/^[a-f0-9]{32}$/i.test(token)) {
          const response = await api.resolveCallLink(token);
          if (cancelled) return;
          if (response.success && response.data) {
            setCallType(response.data.type === "audio" ? "audio" : "video");
            setCallScope(response.data.scope ?? "group");
          }
          return;
        }
        const response = await api.getCallDetails(token);
        if (cancelled) return;
        if (response.success && response.data) {
          setCallType(response.data.type === "audio" ? "audio" : "video");
          setCallScope("direct");
        }
      } catch {
        // fallback to defaults
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
    socketIdRef.current = socket.id ?? null;
    socket.on("connect", () => {
      socketIdRef.current = socket.id ?? null;
    });

    const handleFull = () => {
      setError(`Room is full (max ${MAX_PARTICIPANTS} participants).`);
    };

    const handlePeers = async (peers: { peerId: string; name: string }[]) => {
      setStatus("Connected");
      for (const peer of peers) {
        peerNamesRef.current.set(peer.peerId, peer.name || "Guest");
        createPeerConnection(peer.peerId);
      }
    };

    const handlePeerJoined = ({
      peerId,
      name,
      shouldOffer,
    }: {
      peerId: string;
      name: string;
      shouldOffer?: boolean;
    }) => {
      peerNamesRef.current.set(peerId, name || "Guest");
      createPeerConnection(peerId);
      if (typeof shouldOffer === "boolean") {
        politeRef.current.set(peerId, !shouldOffer);
      }
      if (shouldOffer) {
        makeOffer(peerId).catch(() => undefined);
      }
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
      socket.off("connect");
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
    peerConnectionsRef.current.forEach((entry) => {
      if (entry.videoSender) {
        const transceiver = entry.pc
          .getTransceivers()
          .find((t) => t.sender === entry.videoSender);
        if (transceiver) {
          transceiver.direction = callType === "video" ? "sendrecv" : "inactive";
        }
      }
      updateSendersWithStream(entry, localStream);
    });
  }, [localStream, callType]);

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
        audio: false,
      });
      const nextVideoTrack = stream.getVideoTracks()[0];
      if (!nextVideoTrack) return;
      const audioTrack = localStream?.getAudioTracks()[0] ?? null;
      const nextStream = new MediaStream([
        ...(audioTrack ? [audioTrack] : []),
        nextVideoTrack,
      ]);
      localStream?.getVideoTracks().forEach((track) => track.stop());
      setLocalStream(nextStream);
      setUsingFrontCamera(!usingFrontCamera);
      setCameraEnabled(true);
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

  const maxParticipants = callScope === "group" ? MAX_PARTICIPANTS : 2;
  const totalParticipants = 1 + remoteStreams.length;

  const primaryPeer = remoteStreams[0];
  const showGrid = remoteStreams.length > 1 && callType === "video";

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (remoteStreams.length > 0) {
      setStatus("Connected");
      setCallStartedAt((prev) => prev ?? Date.now());
    }
  }, [remoteStreams.length]);

  useEffect(() => {
    if (!callStartedAt) return;
    const interval = window.setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [callStartedAt]);

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col">
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold">
            {primaryPeer?.name || "Call"} {callType === "video" ? "video" : "audio"}
          </p>
          <p className="text-xs text-white/70">
            {error ? error : callStartedAt ? formatDuration(callDuration) : status}
          </p>
        </div>
        <div className="text-xs text-white/50">
          {totalParticipants}/{maxParticipants}
        </div>
      </div>

      <div className="flex-1 relative px-4 pb-4">
        {!showGrid && callType === "video" && (
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
            </div>
          </div>
        )}

        {!showGrid && callType === "audio" && (
          <div className="w-full h-full rounded-3xl bg-black/40 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-28 h-28 rounded-full bg-white/10 flex items-center justify-center text-3xl font-semibold">
                {(primaryPeer?.name || localName)[0]}
              </div>
              <p className="text-sm text-white/70">Voice call</p>
            </div>
          </div>
        )}

        {showGrid && (
          <div className="grid grid-cols-2 gap-3 h-full">
            {callType === "video" ? (
              <div className="rounded-2xl overflow-hidden bg-black relative">
                <video
                  ref={localVideoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                {!cameraEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs">
                    Camera off
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden bg-black/40 flex items-center justify-center text-sm text-white/70">
                You
              </div>
            )}
            {remoteStreams.map((peer) => (
              <RemoteTile key={peer.peerId} peerId={peer.peerId} name={peer.name} stream={peer.stream} />
            ))}
          </div>
        )}
      </div>

      <div className="px-6 pb-10 pt-4 flex items-center justify-center gap-5">
        <button
          className={`w-14 h-14 rounded-full flex flex-col items-center justify-center ${
            micEnabled ? "bg-white/10" : "bg-red-500"
          }`}
          onClick={toggleMic}
          aria-label="Toggle mic"
        >
          {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
          <span className="text-[10px] mt-1">{micEnabled ? "Mute" : "Muted"}</span>
        </button>
        <button
          className={`w-14 h-14 rounded-full flex flex-col items-center justify-center bg-white/10 ${
            callType !== "video" ? "opacity-40" : ""
          }`}
          onClick={switchCamera}
          aria-label="Switch camera"
          disabled={callType !== "video"}
        >
          <SwitchCamera size={22} />
          <span className="text-[10px] mt-1">Switch</span>
        </button>
        <button
          className="w-16 h-16 rounded-full bg-red-500 flex flex-col items-center justify-center"
          onClick={leaveCall}
          aria-label="End call"
        >
          <PhoneOff size={24} />
          <span className="text-[10px] mt-1">End</span>
        </button>
        <button
          className={`w-14 h-14 rounded-full flex flex-col items-center justify-center ${
            speakerEnabled ? "bg-white/10" : "bg-red-500"
          }`}
          onClick={toggleSpeaker}
          aria-label="Toggle speaker"
        >
          {speakerEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
          <span className="text-[10px] mt-1">Speaker</span>
        </button>
        <button
          className={`w-14 h-14 rounded-full flex flex-col items-center justify-center ${
            cameraEnabled ? "bg-white/10" : "bg-red-500"
          } ${callType !== "video" ? "opacity-40" : ""}`}
          onClick={toggleCamera}
          disabled={callType !== "video"}
          aria-label="Toggle camera"
        >
          {cameraEnabled ? <Video size={22} /> : <VideoOff size={22} />}
          <span className="text-[10px] mt-1">Video</span>
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
        {hasVideo ? (
          <video
            ref={videoRef}
            className="w-full aspect-video object-cover"
            autoPlay
            playsInline
          />
        ) : (
          <div className="w-full aspect-video flex items-center justify-center bg-black/70 text-sm">
            Audio only
          </div>
        )}
      </div>
      <div className="text-sm">{name || peerId}</div>
    </div>
  );
}




