'use client';

import type { Episode } from '@/lib/types';
import { LockIcon, PlayIcon } from '@/components/atoms/Icons';

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
        <div className="card-container" onClick={onClick} style={{ minWidth: '140px' }}>
            <div className="poster-box ep-poster">
                {episode.thumbnailUrl ? (
                    <img
                        src={episode.thumbnailUrl}
                        alt={`Episode ${episode.episodeNumber}`}
                        loading="lazy"
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                        <PlayIcon size={24} />
                    </div>
                )}

                {/* Overlays */}
                {!unlocked && (
                    <div className="locked-overlay">
                        <LockIcon size={12} />
                    </div>
                )}

                <div className="poster-overlay">
                    {/* Optional: Add play icon on hover for episodes too */}
                </div>

                <div className="ep-duration">
                    {formatTime(episode.durationSec)}
                </div>
            </div>

            <div className="card-meta" style={{ padding: '0 4px' }}>
                <h3 className="card-title">
                    Episode {episode.episodeNumber}
                </h3>
            </div>
        </div>
    );
}
