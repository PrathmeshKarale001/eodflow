"use client";

import { useRef, useState } from "react";

interface VoicePlayerProps {
  src: string;
  durationSec: number;
}

export function VoicePlayer({ src, durationSec }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(pct);
  };

  const handleEnded = () => {
    setPlaying(false);
    setProgress(0);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2 bg-card brutalist-border px-3 py-2">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        preload="metadata"
      />

      <button
        onClick={togglePlay}
        className="flex h-6 w-6 items-center justify-center bg-primary text-on-primary text-xs flex-shrink-0 hover:bg-primary/80 transition-colors"
      >
        <span className="material-symbols-outlined text-sm">
          {playing ? "pause" : "play_arrow"}
        </span>
      </button>

      {/* Progress bar */}
      <div className="flex-1 h-1 bg-surface-container-high relative">
        <div
          className="absolute inset-y-0 left-0 bg-primary transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      <span className="font-mono text-[9px] text-on-surface/50 tabular-nums flex-shrink-0">
        {formatTime(durationSec)}
      </span>
    </div>
  );
}
