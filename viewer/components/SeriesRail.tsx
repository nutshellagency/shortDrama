'use client';

import type { FeedItem } from '@/lib/types';
import EpisodeCard from './EpisodeCard';

interface SeriesRailProps {
    title: string;
    items: FeedItem[];
    onEpisodeClick: (seriesId: string, episodeId: string) => void;
}

export default function SeriesRail({ title, items, onEpisodeClick }: SeriesRailProps) {
    return (
        <div className="rail-container">
            <div className="rail-header">
                <h2 className="rail-title">{title}</h2>
                <span className="text-secondary" style={{ fontSize: '12px' }}>More &gt;</span>
            </div>
            <div className="rail-scroll">
                {items.map((item) => (
                    <EpisodeCard
                        key={item.episode.id}
                        episode={item.episode}
                        unlocked={item.viewer.unlocked}
                        onClick={() => onEpisodeClick(item.series.id, item.episode.id)}
                    />
                ))}
            </div>
        </div>
    );
}
