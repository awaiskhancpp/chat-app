"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff , PhoneCall} from "lucide-react";

interface Props {
  callState: "calling" | "receiving" | "in-call";
  callType: "video" | "audio";
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  incomingName?: string;
  isMuted: boolean;
  isCamOff: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleCam: () => void;
}

export default function CallModal({
  callState, callType, localStream, remoteStream,
  incomingName, isMuted, isCamOff,
  onAccept, onReject, onEnd, onToggleMute, onToggleCam,
}: Props) {
  const [callDuration, setCallDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);
  useEffect(()=>{
    if(callState !== "in-call")return 
    const interval = setInterval(() => {
    setCallDuration(prev => prev + 1)
  }, 1000)

  return () => clearInterval(interval)

  },[callState])
  useEffect(() => {
  if (callState !== "in-call") {
    setCallDuration(0)
  }
}, [callState])
  const formatTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-wa-panel">

        {(callState === "receiving" || callState === "calling") && (
          <div className="flex flex-col items-center gap-4 p-10">
            <div className="animate-pulse text-5xl" aria-hidden>
              {callState === "receiving" ? "\u260E" : "\u2026"}
            </div>
            <p className="text-sm text-wa-text2">
              {callState === "receiving" ? `Incoming ${callType} call` : "Calling..."}
            </p>
            <p className="text-xl font-bold text-wa-text">
              {incomingName ?? "Waiting for answer"}
            </p>
            <div className="mt-2 flex gap-4">
              {callState === "receiving" && (
                <button type="button" onClick={onAccept}
                  className="rounded-full bg-wa-green px-6 py-2 font-semibold text-white">
                  Accept
                </button>
              )}
              <button type="button" onClick={callState === "receiving" ? onReject : onEnd}
                className="rounded-full bg-wa-danger px-6 py-2 font-semibold text-white">
                {callState === "receiving" ? "Decline" : <PhoneOff/>}
              </button>
            </div>
          </div>
        )}

        {callState === "in-call" && (
          <>
            {callType === "video" ? (
              <div className="relative h-[300px] w-full bg-black">
                <video ref={remoteVideoRef} autoPlay playsInline
                  className="h-full w-full object-cover" />
                <video ref={localVideoRef} autoPlay playsInline muted
                  className="absolute bottom-2 right-2 h-[75px] w-[100px] rounded-lg border-2 border-wa-green object-cover" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 p-10">
                <div className="text-5xl" aria-hidden>
                < PhoneCall/>
                </div>
                <p className="text-wa-text2">Audio call in progress</p>
                <p className="text-2xl font-bold text-white/80">{formatTime(callDuration)}</p>
                <audio ref={remoteVideoRef as any} autoPlay />
              </div>
            )}

            <div className="flex items-center justify-center gap-4 bg-wa-panel2 p-4">
              <button type="button" onClick={onToggleMute}
                className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold ${
                  isMuted ? "bg-wa-green text-white" : "bg-wa-panel text-wa-text"
                }`}>
                {isMuted ? <MicOff/> : <Mic/>}
              </button>
              {callType === "video" && (
                <button type="button" onClick={onToggleCam}
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold ${
                    isCamOff ? "bg-wa-green text-white" : "bg-wa-panel text-wa-text"
                  }`}>
                  {isCamOff ? <VideoOff/> : <Video/>}
                </button>
              )}
              <button type="button" onClick={onEnd}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-wa-danger text-xl font-bold text-white">
                <PhoneOff/>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
