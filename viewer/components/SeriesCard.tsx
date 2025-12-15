'use client';

import type { SeriesListItem } from '@/lib/types';

interface SeriesCardProps {
    series: SeriesListItem;
    onClick: () => void;
}

export default function SeriesCard({ series, onClick }: SeriesCardProps) {
    return (
        <div className="series-card" onClick={onClick}>
            <div className="poster-wrapper" style={{ aspectRatio: '3/4', borderRadius: '8px', overflow: 'hidden' }}>
                {series.coverUrl && (
                    <img
                        src={series.coverUrl}
                        alt={series.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                    />
                )}
            </div>
            <h3 className="series-title" style={{ marginTop: '8px' }}>{series.title}</h3>
            <span className="series-meta">{series.genres.join(', ') || 'Drama'}</span>
        </div>
    );
}
