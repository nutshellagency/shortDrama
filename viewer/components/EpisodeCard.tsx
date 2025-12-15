'use client';

import type { Episode } from '@/lib/types';

interface EpisodeCardProps {
    episode: Episode;
    unlocked: boolean;
    onClick: () => void;
}

function formatTime(sec: number | undefined): string {
    if (!sec) return '';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' + s : s}`;
}

export default function EpisodeCard({ episode, unlocked, onClick }: EpisodeCardProps) {
    return (
        <div className="series-card" onClick={onClick}>
            <div className="poster-wrapper">
                {episode.thumbnailUrl && (
                    <img
                        src={episode.thumbnailUrl}
                        alt={`Episode ${episode.episodeNumber}`}
                        className="poster-img"
                        loading="lazy"
                    />
                )}
                {!unlocked && (
                    <div className="lock-badge">
                        <span>🔒</span>
                    </div>
                )}
            </div>
            <h3 className="series-title">Ep {episode.episodeNumber}</h3>
            <span className="series-meta">{formatTime(episode.durationSec)}</span>
        </div>
    );
}
