'use client';

import type { Series, Episode } from '@/lib/types';
import Button from '@/components/atoms/Button';
import { PlayIcon } from '@/components/atoms/Icons';

interface HeroBannerProps {
    series: Series;
    episode: Episode;
    onPlay: () => void;
}

export default function HeroBanner({ series, episode, onPlay }: HeroBannerProps) {
    const bgImage = episode.thumbnailUrl || '';

    return (
        <div
            className="hero-wrapper"
            style={{ backgroundImage: `url('${bgImage}')` }}
        >
            <div className="hero-gradient">

                <div className="hero-tags-row">
                    <span className="hero-tag" style={{ background: 'var(--accent-primary)', color: 'white' }}>
                        Top 10
                    </span>
                    <span className="hero-tag" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                        New Release
                    </span>
                </div>

                <h1 className="hero-title-lg">
                    {series.title}
                </h1>

                <p className="hero-desc">
                    {series.description || "Experience the drama, romance, and suspense in this trending series."}
                </p>

                <div className="hero-btns">
                    <Button
                        variant="primary"
                        size="md"
                        onClick={onPlay}
                        icon={<PlayIcon size={16} fill={true} />}
                        style={{ paddingLeft: '32px', paddingRight: '32px' }}
                    >
                        Watch Now
                    </Button>
                    <Button
                        variant="secondary"
                        size="md"
                        style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    >
                        + My List
                    </Button>
                </div>
            </div>
        </div>
    );
}
