'use client';

import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

export const DEMO_VIDEO_URL = 'https://ethglobal.storage/projects/bnr04/video/high.mp4?t=1790452010001';
const VideoContext = createContext<(() => void) | null>(null);

export function DemoVideoProvider({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState('');
  const stop = () => {
    video.current?.pause();
    if (video.current) video.current.currentTime = 0;
  };
  const open = () => {
    setMessage('');
    dialog.current?.showModal();
    // Start during the click gesture so browsers can allow playback with audio.
    void video.current?.play().catch(() => setMessage('Press Play to start the video.'));
  };
  return (
    <VideoContext.Provider value={open}>
      {children}
      <dialog
        ref={dialog}
        className="demo-video-modal"
        aria-labelledby="demo-video-title"
        onClose={stop}
        onCancel={stop}
        onKeyDown={event => event.stopPropagation()}
        onClick={event => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="demo-video-panel">
          <div className="demo-video-heading">
            <h2 id="demo-video-title">Watch Demo / UnSui</h2>
            <button type="button" aria-label="Close video" onClick={() => dialog.current?.close()}>
              <X size={24} />
            </button>
          </div>
          <video
            ref={video}
            src={DEMO_VIDEO_URL}
            controls
            playsInline
            preload="none"
            aria-label="UnSui project presentation video"
            onError={() => setMessage('The video could not load. Try opening it directly below.')}
          />
          <div className="demo-video-footer">
            <span role="status">{message}</span>
            <a href={DEMO_VIDEO_URL} target="_blank" rel="noopener noreferrer">Open video directly ↗</a>
          </div>
        </div>
      </dialog>
    </VideoContext.Provider>
  );
}

export function DemoVideoLink({ children = 'Watch Demo', className, onOpen }: {
  children?: ReactNode;
  className?: string;
  onOpen?: () => void;
}) {
  const open = useContext(VideoContext);
  return (
    <a href={DEMO_VIDEO_URL} className={className} aria-haspopup="dialog" onClick={event => {
      if (!open || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      onOpen?.();
      open();
    }}>{children}</a>
  );
}
