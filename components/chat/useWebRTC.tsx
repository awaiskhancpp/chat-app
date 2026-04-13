"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type CallState = "idle" | "calling" | "receiving" | "in-call";

export interface CallSignal {
  type: "offer" | "answer" | "ice-candidate" | "call-request" | "call-accept" | "call-reject" | "call-end";
  from: string;
  fromName: string;
  to?: string;
  callType?: "video" | "audio";
  payload?: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useWebRTC(
  currentUser: { id: string; name: string | null; email: string },
  onCallEnd: (summary: string) => void
) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<"video" | "audio">("video");
  const [incomingCall, setIncomingCall] = useState<CallSignal | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);

  const callIdRef = useRef<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const remoteUserRef = useRef<string | null>(null);

  const displayName = currentUser.name ?? currentUser.email.split("@")[0];

  const sendSignal = useCallback((signal: CallSignal) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "webrtc-signal",
      payload: signal,
    });
  }, []);

  const getMedia = useCallback(async (type: "video" | "audio") => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: type === "video",
      audio: true,
    });
    setLocalStream(stream);
    return stream;
  }, []);

  const createPeerConnection = useCallback((stream: MediaStream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({
          type: "ice-candidate",
          from: currentUser.id,
          fromName: displayName,
          payload: e.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };

    pcRef.current = pc;
    return pc;
  }, [currentUser.id, displayName, sendSignal]);


  const startCall = useCallback(async (type: "video" | "audio") => {
    setCallType(type);
    setCallState("calling");

    // Insert call log row
    const { data } = await supabase
      .from("calls")
      .insert({
        caller_id: currentUser.id,
        caller_name: displayName,
        call_type: type,
        status: "missed", // default — updated later
      })
      .select()
      .single();

    if (data) callIdRef.current = data.id;

    sendSignal({
      type: "call-request",
      from: currentUser.id,
      fromName: displayName,
      callType: type,
    });
  }, [currentUser.id, displayName, sendSignal, supabase]);

const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    remoteUserRef.current = incomingCall.from;
    setCallState("in-call");
    setCallType(incomingCall.callType ?? "video");

    const stream = await getMedia(incomingCall.callType ?? "video");
    createPeerConnection(stream);

    sendSignal({
      type: "call-accept",
      from: currentUser.id,
      fromName: displayName,
    });

    // Update call log to answered
    await supabase
      .from("calls")
      .update({ status: "answered", receiver_id: currentUser.id })
      .eq("caller_id", incomingCall.from)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1);

    setIncomingCall(null);
  }, [incomingCall, getMedia, createPeerConnection, currentUser.id, displayName, sendSignal, supabase]);

  const rejectCall = useCallback(() => {
    sendSignal({
      type: "call-reject",
      from: currentUser.id,
      fromName: displayName,
    });

    // Update call log to rejected
    supabase
      .from("calls")
      .update({ status: "rejected", receiver_id: currentUser.id, ended_at: new Date().toISOString() })
      .eq("caller_id", incomingCall?.from ?? "")
      .is("ended_at", null)
      .limit(1)
      .then(() => {});

    setIncomingCall(null);
    setCallState("idle");
  }, [currentUser.id, displayName, incomingCall, sendSignal, supabase]);

  const endCall = useCallback(() => {
    sendSignal({
      type: "call-end",
      from: currentUser.id,
      fromName: displayName,
    });

    if (callIdRef.current) {
      supabase
        .from("calls")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", callIdRef.current)
        .then(() => {
          // fetch the call row to get duration
          supabase
            .from("calls")
            .select("*")
            .eq("id", callIdRef.current!)
            .single()
            .then(({ data: call }: { data: { call_type: string; started_at: string; ended_at: string } | null }) => {
              if (!call) return;
              const secs = Math.floor(
                (new Date(call.ended_at).getTime() - new Date(call.started_at).getTime()) / 1000
              );
              const mins = Math.floor(secs / 60);
              const s = secs % 60;
              const duration = mins > 0 ? `${mins}m ${s}s` : `${s}s`;
              const icon = call.call_type === "video" ? "📹" : "🎙️";
              onCallEnd(`${icon} ${call.call_type === "video" ? "Video" : "Audio"} call ended · ${duration}`);
            });
        });
      callIdRef.current = null;
    }

    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    remoteUserRef.current = null;
  }, [currentUser.id, displayName, localStream, onCallEnd, sendSignal, supabase]);

  const toggleMute = useCallback(() => {
    localStream?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((m) => !m);
  }, [localStream]);

  const toggleCam = useCallback(() => {
    localStream?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsCamOff((c) => !c);
  }, [localStream]);

  // Supabase realtime signaling channel
  // Presence + Broadcast signaling
  useEffect(() => {
    const channel = supabase.channel("webrtc-signaling", {
      config: { presence: { key: currentUser.id } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const others = Object.keys(state).filter((k) => k !== currentUser.id);
        setOnlineUsers(others.length);
      })
      .on("presence", { event: "join" }, ({ key }) => {
        if (key !== currentUser.id) setOnlineUsers((n) => n + 1);
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        if (key !== currentUser.id) setOnlineUsers((n) => Math.max(0, n - 1));
      })
      .on("broadcast", { event: "webrtc-signal" }, async ({ payload }: { payload: CallSignal }) => {
        if (payload.from === currentUser.id) return;

        if (payload.type === "call-request") {
          setIncomingCall(payload);
          setCallState("receiving");
        }
        if (payload.type === "call-accept") {
          remoteUserRef.current = payload.from;
          const stream = await getMedia(callType);
          const pc = createPeerConnection(stream);
          setCallState("in-call");
          // Caller creates the offer now that receiver accepted
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal({ type: "offer", from: currentUser.id, fromName: displayName, payload: offer });
        }
        if (payload.type === "offer" && pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.payload as RTCSessionDescriptionInit));
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          sendSignal({ type: "answer", from: currentUser.id, fromName: displayName, payload: answer });
        }
        if (payload.type === "answer" && pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.payload as RTCSessionDescriptionInit));
        }
        if (payload.type === "ice-candidate" && pcRef.current) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.payload as RTCIceCandidateInit));
          } catch {}
        }
        if (payload.type === "call-reject") {
          pcRef.current?.close();
          pcRef.current = null;
          localStream?.getTracks().forEach((t) => t.stop());
          setLocalStream(null);
          setCallState("idle");
          setIncomingCall(null);
        }
        if (payload.type === "call-end") {
          if (callIdRef.current) {
            supabase
              .from("calls")
              .select("*")
              .eq("id", callIdRef.current)
              .single()
              .then(({ data: call }: { data: { call_type: string; started_at: string; ended_at: string } | null }) => {
                if (!call) return;
                const secs = Math.floor(
                  (new Date(call.ended_at ?? new Date()).getTime() - new Date(call.started_at).getTime()) / 1000
                );
                const mins = Math.floor(secs / 60);
                const s = secs % 60;
                const duration = mins > 0 ? `${mins}m ${s}s` : `${s}s`;
                const icon = call.call_type === "video" ? "📹" : "🎙️";
                onCallEnd(`${icon} ${call.call_type === "video" ? "Video" : "Audio"} call ended · ${duration}`);
              });
            callIdRef.current = null;
          }
          pcRef.current?.close();
          pcRef.current = null;
          localStream?.getTracks().forEach((t) => t.stop());
          setLocalStream(null);
          setRemoteStream(null);
          setCallState("idle");
          setIncomingCall(null);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: currentUser.id,
            name: displayName,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [currentUser.id, displayName, callType, getMedia, createPeerConnection, localStream, sendSignal, supabase, onCallEnd]);

  return {
    callState, callType, incomingCall, remoteStream, localStream,
    isMuted, isCamOff, onlineUsers,
    startCall, acceptCall, rejectCall, endCall, toggleMute, toggleCam,
  };
}