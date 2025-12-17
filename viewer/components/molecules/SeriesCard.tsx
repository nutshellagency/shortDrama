'use client';

import type { SeriesListItem } from '@/lib/types';
import { PlayIcon } from '@/components/atoms/Icons';

interface SeriesCardProps {
    series: SeriesListItem;
    onClick: () => void;
}

export default function SeriesCard({ series, onClick }: SeriesCardProps) {
    return (
        <div className="card-container series-card-root" onClick={onClick}>
            <div className="poster-box">
                {series.coverUrl ? (
                    <img
                        src={series.coverUrl}
                        alt={series.title}
                        loading="lazy"
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                        <PlayIcon size={32} fill={false} />
                    </div>
                )}

                <div className="poster-overlay">
                    <div className="poster-overlay-icon">
                        <PlayIcon size={24} fill={true} />
                    </div>
                </div>
            </div>

            <div className="card-meta">
                <h3 className="card-title">{series.title}</h3>
                <div className="card-sub">
                    <span className="badge-outline">
                        {series.genres[0] || 'Drama'}
                    </span>
                    <span style={{ fontSize: '10px' }}>
                        {series.id.slice(0, 4)}
                    </span>
                </div>
            </div>
        </div>
    );
}
