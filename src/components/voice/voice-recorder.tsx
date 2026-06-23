"use client";

import { useState, useRef, useCallback } from "react";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, durationSec: number) => void;
  maxDurationSec?: number;
}

export function VoiceRecorder({
  onRecordingComplete,
  maxDurationSec = 120,
}: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef(0);

  const startRecording = useCallback(async () => {
    setError(null);
    chunks.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: recorder.mimeType });
        const duration = Math.round((Date.now() - startTime.current) / 1000);
        onRecordingComplete(blob, duration);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.current = recorder;
      startTime.current = Date.now();
      recorder.start(1000); // collect every second
      setRecording(true);
      setElapsed(0);

      timer.current = setInterval(() => {
        const secs = Math.round((Date.now() - startTime.current) / 1000);
        setElapsed(secs);
        if (secs >= maxDurationSec) {
          stopRecording();
        }
      }, 500);
    } catch {
      setError("Microphone access denied");
    }
  }, [maxDurationSec, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
    }
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    setRecording(false);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="font-mono text-[11px] text-error">{error}</span>
      )}

      {recording ? (
        <>
          {/* Recording indicator */}
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-error animate-pulse" />
            <span className="font-mono text-[10px] text-error tabular-nums">
              {formatTime(elapsed)}
            </span>
          </div>

          <button
            onClick={stopRecording}
            className="flex h-8 items-center gap-1 px-3 bg-error text-on-primary font-headline text-[11px] uppercase tracking-widest brutalist-border hover:bg-error/80 transition-colors"
          >
            <span className="material-symbols-outlined text-xs">stop</span>
            STOP
          </button>
        </>
      ) : (
        <button
          onClick={startRecording}
          className="flex h-8 w-8 items-center justify-center bg-card text-card-text brutalist-border hover:bg-card-muted transition-colors"
          title="Record voice note"
        >
          <span className="material-symbols-outlined text-sm">mic</span>
        </button>
      )}
    </div>
  );
}
