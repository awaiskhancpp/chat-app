"use client";

import { useEffect, useRef } from "react";
import styles from "./chat.module.css";

interface CallModalProps {
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
}: CallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className={styles.callOverlay}>
      <div className={styles.callModal}>

        {callState === "receiving" && (
          <div className={styles.incomingCall}>
            <div className={styles.callAvatar}>📞</div>
            <p className={styles.callLabel}>Incoming {callType} call</p>
            <p className={styles.callerName}>{incomingName}</p>
            <div className={styles.callActions}>
              <button className={styles.acceptBtn} onClick={onAccept}>✓ Accept</button>
              <button className={styles.rejectBtn} onClick={onReject}>✕ Decline</button>
            </div>
          </div>
        )}

        {callState === "calling" && (
          <div className={styles.incomingCall}>
            <div className={styles.callAvatar}>📡</div>
            <p className={styles.callLabel}>Calling...</p>
            <p className={styles.callerName}>Waiting for answer</p>
            <div className={styles.callActions}>
              <button className={styles.rejectBtn} onClick={onEnd}>✕ Cancel</button>
            </div>
          </div>
        )}

        {callState === "in-call" && (
          <div className={styles.inCallWrap}>
            {callType === "video" ? (
              <div className={styles.videoWrap}>
                <video ref={remoteVideoRef} className={styles.remoteVideo} autoPlay playsInline />
                <video ref={localVideoRef} className={styles.localVideo} autoPlay playsInline muted />
              </div>
            ) : (
              <div className={styles.audioCallWrap}>
                <div className={styles.callAvatar}>🔊</div>
                <p className={styles.callLabel}>Audio call in progress</p>
                <audio ref={remoteVideoRef as React.RefObject<HTMLAudioElement>} autoPlay />
              </div>
            )}
            <div className={styles.inCallActions}>
              <button className={`${styles.callCtrlBtn} ${isMuted ? styles.ctrlActive : ""}`} onClick={onToggleMute} title={isMuted ? "Unmute" : "Mute"}>
                {isMuted ? "🔇" : "🎙️"}
              </button>
              {callType === "video" && (
                <button className={`${styles.callCtrlBtn} ${isCamOff ? styles.ctrlActive : ""}`} onClick={onToggleCam} title={isCamOff ? "Turn cam on" : "Turn cam off"}>
                  {isCamOff ? "📷" : "📹"}
                </button>
              )}
              <button className={styles.endCallBtn} onClick={onEnd} title="End call">✕</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}