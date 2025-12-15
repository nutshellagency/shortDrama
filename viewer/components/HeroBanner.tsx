'use client';

import type { Series, Episode } from '@/lib/types';

interface HeroBannerProps {
    series: Series;
    episode: Episode;
    onPlay: () => void;
}

export default function HeroBanner({ series, episode, onPlay }: HeroBannerProps) {
    const bgImage = episode.thumbnailUrl || '';

    return (
        <div
            className="hero-banner"
            style={{ backgroundImage: `url('${bgImage}')` }}
        >
            <div className="hero-overlay">
                <div className="hero-tags">
                    <span className="tag new">New Release</span>
                    <span className="tag hot">Trending</span>
                </div>
                <h1 className="hero-title">{series.title}</h1>
                <div className="hero-actions">
                    <button className="btn btn-primary" onClick={onPlay}>
                        ▶ Watch Ep 1
                    </button>
                    <button
                        className="btn"
                        style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                    >
                        + My List
                    </button>
                </div>
            </div>
        </div>
    );
}
