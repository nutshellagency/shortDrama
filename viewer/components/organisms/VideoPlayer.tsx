'use client';

import { useRef, useState, useEffect } from 'react';

interface VideoPlayerProps {
    videoUrl: string;
    seriesTitle: string;
    episodeNumber: number;
    onBack: () => void;
    onNext: () => void;
    onEnded: () => void;
}

export default function VideoPlayer({
    videoUrl,
    seriesTitle,
    episodeNumber,
    onBack,
    onNext,
    onEnded,
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showPlayIcon, setShowPlayIcon] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        setError(null);
        setIsLoading(true);
        setShowPlayIcon(true);

        // Log the URL for debugging
        console.log('[VideoPlayer] Loading video:', videoUrl);

        const handleCanPlay = () => {
            console.log('[VideoPlayer] Video can play');
            setIsLoading(false);
            // Try to autoplay
            video.play()
                .then(() => {
                    setIsPlaying(true);
                    setShowPlayIcon(false);
                })
                .catch((e) => {
                    console.log('[VideoPlayer] Autoplay blocked:', e.message);
                    setShowPlayIcon(true);
                });
        };

        const handleError = () => {
            const videoError = video.error;
            let errorMsg = 'Unknown error';
            if (videoError) {
                switch (videoError.code) {
                    case MediaError.MEDIA_ERR_ABORTED:
                        errorMsg = 'Video loading aborted';
                        break;
                    case MediaError.MEDIA_ERR_NETWORK:
                        errorMsg = 'Network error while loading video';
                        break;
                    case MediaError.MEDIA_ERR_DECODE:
                        errorMsg = 'Video decode error';
                        break;
                    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                        errorMsg = 'Video format not supported or CORS blocked';
                        break;
                    default:
                        errorMsg = videoError.message || 'Failed to load video';
                }
            }
            console.error('[VideoPlayer] Error:', errorMsg, videoUrl);
            setError(errorMsg);
            setIsLoading(false);
        };

        const handleLoadStart = () => {
            console.log('[VideoPlayer] Load started');
            setIsLoading(true);
        };

        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('error', handleError);
        video.addEventListener('loadstart', handleLoadStart);

        // Set the source
        video.src = videoUrl;
        video.load();

        return () => {
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
            video.removeEventListener('loadstart', handleLoadStart);
        };
    }, [videoUrl]);

    const handleVideoClick = () => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play()
                .then(() => {
                    setIsPlaying(true);
                    setShowPlayIcon(false);
                })
                .catch((e) => {
                    console.error('[VideoPlayer] Play failed:', e);
                });
        } else {
            video.pause();
            setIsPlaying(false);
            setShowPlayIcon(true);
        }
    };

    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video || !video.duration) return;
        setProgress((video.currentTime / video.duration) * 100);
    };

    const handleVideoEnded = () => {
        onEnded();
    };

    return (
        <div className="player-screen">
            <video
                ref={videoRef}
                className="player-video"
                playsInline
                loop={false}
                crossOrigin="anonymous"
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
            />

            <div className="player-controls" onClick={handleVideoClick}>
                <div className="controls-top">
                    <button
                        className="btn btn-icon"
                        onClick={(e) => { e.stopPropagation(); onBack(); }}
                    >
                        ←
                    </button>
                    <button className="btn btn-icon" onClick={(e) => e.stopPropagation()}>
                        ⋮
                    </button>
                </div>

                <div className="controls-center">
                    {isLoading && !error && (
                        <div className="loading-indicator" style={{
                            color: 'white',
                            fontSize: '16px',
                            background: 'rgba(0,0,0,0.5)',
                            padding: '12px 20px',
                            borderRadius: '8px'
                        }}>
                            Loading...
                        </div>
                    )}
                    {error && (
                        <div style={{
                            color: '#ff6464',
                            fontSize: '14px',
                            background: 'rgba(0,0,0,0.7)',
                            padding: '16px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            maxWidth: '80%'
                        }}>
                            <div style={{ marginBottom: '8px' }}>⚠️ {error}</div>
                            <div style={{ fontSize: '12px', color: '#888', wordBreak: 'break-all' }}>
                                {videoUrl.substring(0, 60)}...
                            </div>
                        </div>
                    )}
                    {showPlayIcon && !isLoading && !error && (
                        <div className="play-btn-lg">▶</div>
                    )}
                </div>

                <div className="controls-bottom">
                    <div className="episode-info">
                        <div className="ep-title">{seriesTitle}</div>
                        <div className="ep-desc">Episode {episodeNumber}</div>
                    </div>

                    <div className="progress-container">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>

                    <div className="action-row">
                        <button className="btn btn-icon" onClick={(e) => e.stopPropagation()}>💬</button>
                        <button
                            className="btn-next-ep"
                            onClick={(e) => { e.stopPropagation(); onNext(); }}
                        >
                            Next Episode ↓
                        </button>
                        <button className="btn btn-icon" onClick={(e) => e.stopPropagation()}>🔗</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
