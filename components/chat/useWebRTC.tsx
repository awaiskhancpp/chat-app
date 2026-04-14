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

const BROADCAST_EVENT = "webrtc-signal";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function pairChannelName(userA: string, userB: string) {
  return `webrtc-pair-${[userA, userB].sort().join(":")}`;
}

function inboxChannelName(userId: string) {
  return `call-inbox-${userId}`;
}

/**
 * WebRTC + Supabase Realtime:
 * - `call-inbox-{userId}` (broadcast): ring / cancel / reject so the callee does not need that chat open.
 * - `webrtc-pair-{sorted ids}` (broadcast): offer / answer / ICE / accept / end while both are in the call flow.
 */
export function useWebRTC(
  currentUser: { id: string; name: string | null; email: string },
  onCallEnd: (summary: string) => void
) {
  const onCallEndRef = useRef(onCallEnd);
  useEffect(() => {
    onCallEndRef.current = onCallEnd;
  }, [onCallEnd]);
  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<"video" | "audio">("video");
  const [incomingCall, setIncomingCall] = useState<CallSignal | null>(null);
  const [signalingPeerId, setSignalingPeerId] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  const callIdRef = useRef<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const supabase = createClient();
  const pairChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const remoteUserRef = useRef<string | null>(null);
  const callTypeRef = useRef<"video" | "audio">("video");
  const callStateRef = useRef<CallState>("idle");

  const displayName = currentUser.name ?? currentUser.email.split("@")[0];

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    callTypeRef.current = callType;
  }, [callType]);

  const sendOnPair = useCallback((signal: CallSignal) => {
    pairChannelRef.current?.send({
      type: "broadcast",
      event: BROADCAST_EVENT,
      payload: signal,
    });
  }, []);

  /** Deliver ring / cancel / reject to one user’s personal Realtime channel (always subscribed in this hook). */
  const sendToInbox = useCallback((targetUserId: string, signal: CallSignal) => {
    const ch = supabase.channel(inboxChannelName(targetUserId), {
      config: { broadcast: { self: false } },
    });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ch.send({
          type: "broadcast",
          event: BROADCAST_EVENT,
          payload: signal,
        });
        setTimeout(() => {
          supabase.removeChannel(ch);
        }, 800);
      }
    });
  }, [supabase]);

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
      if (e.candidate && remoteUserRef.current) {
        sendOnPair({
          type: "ice-candidate",
          from: currentUser.id,
          fromName: displayName,
          to: remoteUserRef.current,
          payload: e.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };

    pcRef.current = pc;
    return pc;
  }, [currentUser.id, displayName, sendOnPair]);

  const startCall = useCallback(async (targetUserId: string, type: "video" | "audio") => {
    if (targetUserId === currentUser.id) return;

    setCallType(type);
    callTypeRef.current = type;
    setCallState("calling");
    remoteUserRef.current = targetUserId;
    setSignalingPeerId(targetUserId);

    const { data } = await supabase
      .from("calls")
      .insert({
        caller_id: currentUser.id,
        caller_name: displayName,
        call_type: type,
        status: "missed",
      })
      .select()
      .single();

    if (data) callIdRef.current = data.id;

    sendToInbox(targetUserId, {
      type: "call-request",
      from: currentUser.id,
      fromName: displayName,
      to: targetUserId,
      callType: type,
    });
  }, [currentUser.id, displayName, sendToInbox, supabase]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const peerId = incomingCall.from;
    remoteUserRef.current = peerId;
    setSignalingPeerId(peerId);
    setCallState("in-call");
    setCallType(incomingCall.callType ?? "video");
    callTypeRef.current = incomingCall.callType ?? "video";

    const stream = await getMedia(incomingCall.callType ?? "video");
    createPeerConnection(stream);

    sendOnPair({
      type: "call-accept",
      from: currentUser.id,
      fromName: displayName,
      to: peerId,
    });

    await supabase
      .from("calls")
      .update({ status: "answered", receiver_id: currentUser.id })
      .eq("caller_id", peerId)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1);

    setIncomingCall(null);
  }, [incomingCall, getMedia, createPeerConnection, currentUser.id, displayName, sendOnPair, supabase]);

  const rejectCall = useCallback(() => {
    const peer = incomingCall?.from;
    if (peer) {
      sendToInbox(peer, {
        type: "call-reject",
        from: currentUser.id,
        fromName: displayName,
        to: peer,
      });
      sendOnPair({
        type: "call-reject",
        from: currentUser.id,
        fromName: displayName,
        to: peer,
      });
    }

    supabase
      .from("calls")
      .update({ status: "rejected", receiver_id: currentUser.id, ended_at: new Date().toISOString() })
      .eq("caller_id", peer ?? "")
      .is("ended_at", null)
      .limit(1)
      .then(() => {});

    setIncomingCall(null);
    setCallState("idle");
    setSignalingPeerId(null);
    remoteUserRef.current = null;
  }, [currentUser.id, displayName, incomingCall, sendOnPair, sendToInbox, supabase]);

  const endCall = useCallback(() => {
    const peer = remoteUserRef.current ?? signalingPeerId;
    const state = callStateRef.current;

    if (peer) {
      if (state === "calling") {
        sendToInbox(peer, {
          type: "call-end",
          from: currentUser.id,
          fromName: displayName,
          to: peer,
        });
      } else {
        sendOnPair({
          type: "call-end",
          from: currentUser.id,
          fromName: displayName,
          to: peer,
        });
      }
    }

    if (callIdRef.current) {
      supabase
        .from("calls")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", callIdRef.current)
        .then(() => {
          supabase
            .from("calls")
            .select("*")
            .eq("id", callIdRef.current!)
            .single()
            .then(({ data: call }: { data: { call_type: string; started_at: string; ended_at: string } | null }) => {
              callIdRef.current = null;
              if (!call?.ended_at) return;
              const secs = Math.floor(
                (new Date(call.ended_at).getTime() - new Date(call.started_at).getTime()) / 1000
              );
              const mins = Math.floor(secs / 60);
              const s = secs % 60;
              const duration = mins > 0 ? `${mins}m ${s}s` : `${s}s`;
              const kind = call.call_type === "video" ? "Video" : "Audio";
              onCallEndRef.current(`${kind} call ended · ${duration}`);
            });
        });
    } else {
      callIdRef.current = null;
    }

    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setSignalingPeerId(null);
    remoteUserRef.current = null;
    setIncomingCall(null);
  }, [currentUser.id, displayName, sendOnPair, sendToInbox, signalingPeerId, supabase]);

  const toggleMute = useCallback(() => {
    localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((m) => !m);
  }, [localStream]);

  const toggleCam = useCallback(() => {
    localStream?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCamOff((c) => !c);
  }, [localStream]);

  // Personal inbox: incoming call-request + control when peer is not on pair channel yet
  useEffect(() => {
    const inbox = supabase.channel(inboxChannelName(currentUser.id), {
      config: { broadcast: { self: false } },
    });

    inbox.on("broadcast", { event: BROADCAST_EVENT }, ({ payload }: { payload: CallSignal }) => {
      if (!payload || payload.from === currentUser.id) return;
      if (payload.to && payload.to !== currentUser.id) return;

      if (payload.type === "call-request") {
        setIncomingCall(payload);
        setSignalingPeerId(payload.from);
        setCallState("receiving");
        return;
      }

      if (payload.type === "call-reject") {
        pcRef.current?.close();
        pcRef.current = null;
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        setLocalStream(null);
        setRemoteStream(null);
        setCallState("idle");
        setSignalingPeerId(null);
        remoteUserRef.current = null;
        callIdRef.current = null;
        return;
      }

      if (payload.type === "call-end") {
        if (callIdRef.current) {
          supabase
            .from("calls")
            .select("*")
            .eq("id", callIdRef.current)
            .single()
            .then(({ data: call }: { data: { call_type: string; started_at: string; ended_at: string } | null }) => {
              callIdRef.current = null;
              if (!call) return;
              const secs = Math.floor(
                (new Date(call.ended_at ?? new Date()).getTime() - new Date(call.started_at).getTime()) / 1000
              );
              const mins = Math.floor(secs / 60);
              const s = secs % 60;
              const duration = mins > 0 ? `${mins}m ${s}s` : `${s}s`;
              const kind = call.call_type === "video" ? "Video" : "Audio";
              onCallEndRef.current(`${kind} call ended · ${duration}`);
            });
        }
        pcRef.current?.close();
        pcRef.current = null;
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        setLocalStream(null);
        setRemoteStream(null);
        setCallState("idle");
        setSignalingPeerId(null);
        remoteUserRef.current = null;
        setIncomingCall(null);
      }
    });

    inbox.subscribe();

    return () => {
      supabase.removeChannel(inbox);
    };
  }, [currentUser.id, supabase]);

  // Pair channel: SDP / ICE / accept / end while in a session
  useEffect(() => {
    if (!signalingPeerId) {
      pairChannelRef.current = null;
      return;
    }

    const name = pairChannelName(currentUser.id, signalingPeerId);
    const channel = supabase.channel(name, {
      config: { broadcast: { self: false } },
    });
    pairChannelRef.current = channel;

    channel.on("broadcast", { event: BROADCAST_EVENT }, async ({ payload }: { payload: CallSignal }) => {
      if (!payload || payload.from === currentUser.id) return;

      if (payload.type === "call-accept") {
        remoteUserRef.current = payload.from;
        const stream = await getMedia(callTypeRef.current);
        const pc = createPeerConnection(stream);
        setCallState("in-call");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendOnPair({
          type: "offer",
          from: currentUser.id,
          fromName: displayName,
          to: payload.from,
          payload: offer,
        });
        return;
      }

      if (payload.type === "offer" && pcRef.current) {
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(payload.payload as RTCSessionDescriptionInit)
        );
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        sendOnPair({
          type: "answer",
          from: currentUser.id,
          fromName: displayName,
          to: payload.from,
          payload: answer,
        });
        return;
      }

      if (payload.type === "answer" && pcRef.current) {
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(payload.payload as RTCSessionDescriptionInit)
        );
        return;
      }

      if (payload.type === "ice-candidate" && pcRef.current && payload.payload) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.payload as RTCIceCandidateInit));
        } catch {
          /* ignore */
        }
        return;
      }

      if (payload.type === "call-reject") {
        pcRef.current?.close();
        pcRef.current = null;
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        setLocalStream(null);
        setRemoteStream(null);
        setCallState("idle");
        setSignalingPeerId(null);
        remoteUserRef.current = null;
        callIdRef.current = null;
        return;
      }

      if (payload.type === "call-end") {
        if (callIdRef.current) {
          supabase
            .from("calls")
            .select("*")
            .eq("id", callIdRef.current)
            .single()
            .then(({ data: call }: { data: { call_type: string; started_at: string; ended_at: string } | null }) => {
              callIdRef.current = null;
              if (!call) return;
              const secs = Math.floor(
                (new Date(call.ended_at ?? new Date()).getTime() - new Date(call.started_at).getTime()) / 1000
              );
              const mins = Math.floor(secs / 60);
              const s = secs % 60;
              const duration = mins > 0 ? `${mins}m ${s}s` : `${s}s`;
              const kind = call.call_type === "video" ? "Video" : "Audio";
              onCallEndRef.current(`${kind} call ended · ${duration}`);
            });
        }
        pcRef.current?.close();
        pcRef.current = null;
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        setLocalStream(null);
        setRemoteStream(null);
        setCallState("idle");
        setSignalingPeerId(null);
        remoteUserRef.current = null;
        setIncomingCall(null);
      }
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      pairChannelRef.current = null;
    };
  }, [signalingPeerId, currentUser.id, displayName, getMedia, createPeerConnection, sendOnPair, supabase]);

  return {
    callState,
    callType,
    incomingCall,
    remoteStream,
    localStream,
    isMuted,
    isCamOff,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCam,
  };
}
