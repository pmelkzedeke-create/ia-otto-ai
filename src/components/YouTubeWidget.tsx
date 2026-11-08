import React, { useState } from 'react';
import { X, Maximize2, Minimize2, Youtube, ThumbsUp, Eye, Sparkles } from 'lucide-react';
import { DraggableWindow } from './DraggableWindow';

export interface YouTubeVideoData {
  videoId: string;
  title: string;
  channel?: string;
  views?: string;
}

interface YouTubeWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  topVideo: YouTubeVideoData | null;
  relatedVideos: YouTubeVideoData[];
  onSelectVideo: (video: YouTubeVideoData) => void;
}

export const YouTubeWidget: React.FC<YouTubeWidgetProps> = ({
  isOpen,
  onClose,
  query,
  topVideo,
  relatedVideos,
  onSelectVideo,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!isOpen || !topVideo) return null;

  return (
    <DraggableWindow
      title={topVideo.title}
      onClose={onClose}
      maxWidth={isExpanded ? 960 : 640}
      minWidth={320}
      headerIcon={<Youtube className="w-3.5 h-3.5 text-red-400" />}
      className={isExpanded ? 'inset-4 md:inset-10' : ''}
    >
      <div className="relative w-full h-full flex flex-col overflow-hidden">
        {/* Video Player Iframe */}
        <div className={`w-full bg-black relative rounded-xl overflow-hidden ${isExpanded ? 'min-h-[480px]' : 'aspect-video'}`}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${topVideo.videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={topVideo.title}
            className="w-full h-full border-0 absolute inset-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Channel & Stats & Related Videos Bar */}
        <div className="px-3 py-2.5 bg-[#0e121a]/95 border-t border-white/10 flex flex-col gap-2 mt-2 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-1">
            <div className="flex items-center gap-2.5 font-mono text-[11px]">
              <span className="text-slate-200 font-semibold">{topVideo.channel || 'Canal Oficial'}</span>
              <span className="flex items-center gap-1 text-slate-400">
                <Eye className="w-3 h-3" />
                {topVideo.views || 'Alta relevância'}
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <ThumbsUp className="w-3 h-3" />
                Destaque OTTO
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer border border-white/15"
            >
              {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              <span>{isExpanded ? 'Restaurar' : 'Expandir'}</span>
            </button>
          </div>

          {/* Related Top Videos Carousel / Quick Switch */}
          {relatedVideos.length > 0 && (
            <div className="pt-1.5 border-t border-slate-800 flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-mono">
              <span className="text-slate-500 text-[10px] uppercase tracking-wider shrink-0">
                Outras opções:
              </span>
              {relatedVideos.map((rv) => (
                <button
                  key={rv.videoId}
                  onClick={() => onSelectVideo(rv)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all truncate max-w-[200px] shrink-0 cursor-pointer"
                  title={rv.title}
                >
                  {rv.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </DraggableWindow>
  );
};
