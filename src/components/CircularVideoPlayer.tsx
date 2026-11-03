import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';

interface CircularVideoPlayerProps {
  src?: string;
  duration?: number;
  citizenName?: string;
}

export const CircularVideoPlayer: React.FC<CircularVideoPlayerProps> = ({
  src,
  duration = 25,
  citizenName,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      // Simulated video note playback if no media file url
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
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration || duration;
      setCurrentTime(cur);
      setProgress((cur / dur) * 100);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // SVG circle circumference for 240px diameter (r = 114)
  const radius = 114;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-2xl text-white shadow-inner relative overflow-hidden">
      {/* Background ambient blur */}
      <div className="absolute inset-0 bg-radial from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Telegram Video Note Badge */}
      <div className="flex items-center gap-2 mb-4 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-medium text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Telegram Kruglyash (Video Note)</span>
      </div>

      {/* Circular Frame Container */}
      <div className="relative w-64 h-64 flex items-center justify-center cursor-pointer group" onClick={togglePlay}>
        {/* SVG Progress Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 256 256">
          {/* Track */}
          <circle
            cx="128"
            cy="128"
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="5"
          />
          {/* Animated Progress */}
          <circle
            cx="128"
            cy="128"
            r={radius}
            fill="none"
            stroke="#10b981"
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-200"
          />
        </svg>

        {/* Circular Video or Animated Camera Simulator */}
        <div className="w-56 h-56 rounded-full overflow-hidden bg-slate-950 relative flex items-center justify-center shadow-2xl border-2 border-white/20">
          {src ? (
            <video
              ref={videoRef}
              src={src}
              className="w-full h-full object-cover"
              playsInline
              muted={isMuted}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
            />
          ) : (
            <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 p-4 text-center">
              {/* Courtyard / Street Simulation Silhouette */}
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_40%,rgba(16,185,129,0.25),transparent_70%)]" />
              
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mb-2 z-10">
                <span className="text-2xl">📹</span>
              </div>
              <div className="z-10 text-xs text-slate-300 font-medium">
                {citizenName || "Fuqaro arizasi"}
              </div>
              <div className="z-10 text-[11px] text-slate-400 mt-1">
                Kruglyash video yozuvi ({duration} soniya)
              </div>
            </div>
          )}

          {/* Central Play/Pause Overlay */}
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${
              isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg transition-transform active:scale-95">
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-1" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Control Strip */}
      <div className="mt-4 flex items-center justify-between w-64 px-2 text-xs text-slate-400">
        <span className="font-mono tabular-nums">{formatTime(currentTime)}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (videoRef.current) {
                videoRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              } else {
                setIsMuted(!isMuted);
              }
            }}
            className="hover:text-white transition-colors"
            title={isMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
        <span className="font-mono tabular-nums">{formatTime(duration)}</span>
      </div>
    </div>
  );
};
