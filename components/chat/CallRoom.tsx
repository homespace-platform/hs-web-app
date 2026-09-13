"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";
import { toast } from "sonner";
import { useChatDemo } from "@/components/chat/ChatDemoProvider";
import chatService from "@/services/chat.service";
import type { ChatCallEndSignal, ChatCallMode } from "@/types/chat-api.type";

type CallStatus = "connecting" | "waiting" | "connected" | "ended" | "error";

export default function CallRoom({
  conversationId,
  callId,
  mode,
  participantName,
}: {
  conversationId: string;
  callId: string;
  mode: ChatCallMode;
  participantName: string;
}) {
  const { endCall } = useChatDemo();
  const [status, setStatus] = useState<CallStatus>("connecting");
  const [muted, setMuted] = useState(false);
  const [videoMode, setVideoMode] = useState(mode === "video");
  const [cameraEnabled, setCameraEnabled] = useState(mode === "video");
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const microphoneRef = useRef<IMicrophoneAudioTrack | null>(null);
  const cameraRef = useRef<ICameraVideoTrack | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  const leaveAgora = useCallback(async () => {
    microphoneRef.current?.stop();
    microphoneRef.current?.close();
    cameraRef.current?.stop();
    cameraRef.current?.close();
    microphoneRef.current = null;
    cameraRef.current = null;
    const client = clientRef.current;
    clientRef.current = null;
    if (client) await client.leave().catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const connect = async () => {
      try {
        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
        if (cancelled) return;

        const microphone = await AgoraRTC.createMicrophoneAudioTrack();
        microphoneRef.current = microphone;
        const camera =
          mode === "video" ? await AgoraRTC.createCameraVideoTrack() : null;
        cameraRef.current = camera;
        if (cancelled) {
          microphone.close();
          camera?.close();
          return;
        }

        const credentials = await chatService.createCallToken(
          conversationId,
          callId,
        );
        if (cancelled) {
          microphone.close();
          camera?.close();
          return;
        }

        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;
        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (cancelled) return;
          if (mediaType === "audio") user.audioTrack?.play();
          if (mediaType === "video") {
            setVideoMode(true);
            if (remoteVideoRef.current) user.videoTrack?.play(remoteVideoRef.current);
          }
          setStatus("connected");
        });
        client.on("user-left", () => {
          if (!cancelled) {
            setStatus("ended");
            void leaveAgora();
          }
        });

        await client.join(
          credentials.appId,
          credentials.channel,
          credentials.token,
          credentials.uid,
        );
        if (cancelled) {
          await client.leave();
          return;
        }

        if (cancelled) {
          microphone.close();
          camera?.close();
          await client.leave();
          return;
        }

        if (camera && localVideoRef.current) camera.play(localVideoRef.current);
        await client.publish(camera ? [microphone, camera] : [microphone]);
        setStatus((current) => (current === "connected" ? current : "waiting"));
      } catch {
        if (!cancelled) {
          setStatus("error");
          endCall(conversationId, callId);
          void leaveAgora();
        }
      }
    };

    const handleCallEnded = (event: Event) => {
      const call = (event as CustomEvent<ChatCallEndSignal>).detail;
      if (call.callId !== callId) return;
      setStatus("ended");
      void leaveAgora();
    };
    const handlePageHide = () => endCall(conversationId, callId);

    window.addEventListener("hs:call-ended", handleCallEnded);
    window.addEventListener("pagehide", handlePageHide);
    void connect();

    return () => {
      cancelled = true;
      window.removeEventListener("hs:call-ended", handleCallEnded);
      window.removeEventListener("pagehide", handlePageHide);
      void leaveAgora();
    };
  }, [callId, conversationId, endCall, leaveAgora, mode]);

  useEffect(() => {
    if (!videoMode || !cameraEnabled || !cameraRef.current || !localVideoRef.current) {
      return;
    }
    cameraRef.current.play(localVideoRef.current);
  }, [cameraEnabled, videoMode]);

  useEffect(() => {
    if (status !== "ended") return;
    const closeTimer = window.setTimeout(() => window.close(), 5_000);
    return () => window.clearTimeout(closeTimer);
  }, [status]);

  const hangUp = async () => {
    endCall(conversationId, callId);
    await leaveAgora();
    setStatus("ended");
  };

  const toggleMute = async () => {
    const microphone = microphoneRef.current;
    if (!microphone) return;
    await microphone.setMuted(!muted);
    setMuted((current) => !current);
  };

  const toggleCamera = async () => {
    const camera = cameraRef.current;
    if (!camera) {
      const client = clientRef.current;
      if (!client) return;
      try {
        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
        const nextCamera = await AgoraRTC.createCameraVideoTrack();
        cameraRef.current = nextCamera;
        if (localVideoRef.current) nextCamera.play(localVideoRef.current);
        await client.publish(nextCamera);
        setVideoMode(true);
        setCameraEnabled(true);
      } catch {
        cameraRef.current?.close();
        cameraRef.current = null;
        toast.error("Không thể bật camera");
      }
      return;
    }
    await camera.setMuted(cameraEnabled);
    setCameraEnabled((current) => !current);
  };

  const statusText = {
    connecting: "Đang kết nối...",
    waiting: "Đang chờ người bên kia...",
    connected: "Đã kết nối",
    ended: "Cuộc gọi đã kết thúc",
    error:
      "Không thể bắt đầu cuộc gọi. Kiểm tra cấu hình Agora và quyền thiết bị.",
  }[status];

  return (
    <main className="relative flex min-h-screen w-full flex-col overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1e3a8a_0%,#020617_55%)]" />

      <div
        ref={remoteVideoRef}
        className={`absolute inset-0 ${videoMode ? "" : "hidden"}`}
      >
        {status !== "connected" && (
          <div className="flex h-full items-center justify-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-4xl font-bold backdrop-blur">
              {participantName.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {!videoMode && (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white/10 text-5xl font-bold ring-4 ring-white/10">
            {participantName.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-2xl font-semibold">{participantName}</h1>
        </div>
      )}

      {videoMode && (
        <div
          ref={localVideoRef}
          className={`absolute right-4 top-4 z-20 h-36 w-28 overflow-hidden rounded-2xl border border-white/20 bg-slate-900 shadow-2xl sm:h-48 sm:w-36 ${
            cameraEnabled ? "" : "opacity-30"
          }`}
        />
      )}

      <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-5 bg-linear-to-t from-black/90 to-transparent px-4 pb-8 pt-24">
        {videoMode && (
          <h1 className="text-xl font-semibold">{participantName}</h1>
        )}
        <p className="text-sm text-white/70">{statusText}</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => void toggleMute()}
            disabled={status === "error" || status === "ended"}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-40"
            aria-label={muted ? "Bật microphone" : "Tắt microphone"}
          >
            {muted ? <MicOff /> : <Mic />}
          </button>
          <button
            type="button"
            onClick={() => void toggleCamera()}
            disabled={status === "error" || status === "ended"}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-40"
            aria-label={cameraEnabled ? "Tắt camera" : "Bật camera"}
          >
            {cameraEnabled ? <Video /> : <VideoOff />}
          </button>
          <button
            type="button"
            onClick={() => void hangUp()}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 hover:bg-red-500"
            aria-label="Kết thúc cuộc gọi"
          >
            <PhoneOff />
          </button>
        </div>
      </div>
    </main>
  );
}
