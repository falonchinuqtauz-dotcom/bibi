import React, { useState, useRef } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

interface VoiceAudioPlayerProps {
  src?: string;
  duration?: number;
}

export const VoiceAudioPlayer: React.FC<VoiceAudioPlayerProps> = ({
  src,
  duration = 35,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<any>(null);

  // Simulated waveform bar heights
  const bars = [
    30, 45, 60, 25, 80, 65, 40, 90, 75, 50, 85, 95, 60, 40, 70, 55, 30, 65, 80,
    45, 90, 60, 35, 75, 50, 65, 40, 55, 30, 20,
  ];

  const togglePlay = () => {
    if (audioRef.current && src) {
      if (audioRef.current.paused) {
        audioRef.current.play();
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      setIsPlaying((prev) => {
        const next = !prev;
        if (next) {
          timerRef.current = setInterval(() => {
            setCurrentTime((t) => {
              if (t >= duration) {
                clearInterval(timerRef.current);
                setIsPlaying(false);
                return 0;
              }
              const newTime = t + 0.5;
              setProgress((newTime / duration) * 100);
              return newTime;
            });
          }, 500);
        } else {
          if (timerRef.current) clearInterval(timerRef.current);
        }
        return next;
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      const dur = audioRef.current.duration || duration;
      setCurrentTime(cur);
      setProgress((cur / dur) * 100);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-900 rounded-xl text-white border border-slate-800">
      {src && (
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
          }}
        />
      )}

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-11 h-11 shrink-0 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition-all shadow-md active:scale-95"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform Visualization */}
      <div className="flex-1">
        <div className="flex items-center gap-1 h-9 mb-1.5 cursor-pointer">
          {bars.map((h, i) => {
            const barProgress = (i / bars.length) * 100;
            const isPlayed = barProgress <= progress;
            return (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className={`w-1 rounded-full transition-colors duration-150 ${
                  isPlayed ? 'bg-emerald-400' : 'bg-slate-700'
                }`}
              />
            );
          })}
        </div>
        <div className="flex justify-between items-center text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Mic className="w-3 h-3 text-emerald-400" />
            <span>Telegram Ovozli xabar</span>
          </span>
          <span className="font-mono tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};
