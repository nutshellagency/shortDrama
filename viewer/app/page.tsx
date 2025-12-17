'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getFeed } from '@/lib/api';
import type { FeedItem } from '@/lib/types';
import Header from '@/components/organisms/Header';
import BottomNav from '@/components/organisms/BottomNav';
import HeroBanner from '@/components/organisms/HeroBanner';
import SeriesRail from '@/components/organisms/SeriesRail';

export default function HomePage() {
    const router = useRouter();
    const { token, isLoading, setCoins } = useAuth();
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [isLoadingFeed, setIsLoadingFeed] = useState(true);

    const loadFeed = useCallback(async () => {
        if (!token) return;

        const res = await getFeed(token);
        if (res.ok && res.data.items) {
            setFeed(res.data.items);
            // Update coins from first item
            if (res.data.items.length > 0) {
                setCoins(res.data.items[0].viewer.coins);
            }
        }
        setIsLoadingFeed(false);
    }, [token, setCoins]);

    useEffect(() => {
        if (!isLoading && token) {
            loadFeed();
        }
    }, [isLoading, token, loadFeed]);

    const handleEpisodeClick = (seriesId: string, episodeId: string) => {
        router.push(`/player/${episodeId}?seriesId=${seriesId}`);
    };

    // Group episodes by series
    const seriesMap = new Map<string, { series: FeedItem['series']; episodes: FeedItem[] }>();
    feed.forEach((item) => {
        if (!seriesMap.has(item.series.id)) {
            seriesMap.set(item.series.id, { series: item.series, episodes: [] });
        }
        seriesMap.get(item.series.id)!.episodes.push(item);
    });
    const seriesList = Array.from(seriesMap.values());

    if (isLoading || isLoadingFeed) {
        return (
            <div className="screen">
                <Header />
                <div className="loading-container">Loading...</div>
                <BottomNav />
            </div>
        );
    }

    if (feed.length === 0) {
        return (
            <div className="screen">
                <Header />
                <div className="filter-scroll">
                    <div className="filter-chip active">Featured</div>
                    <div className="filter-chip">Romance</div>
                    <div className="filter-chip">Revenge</div>
                    <div className="filter-chip">CEO</div>
                </div>
                <div className="empty-state">No content available.</div>
                <BottomNav />
            </div>
        );
    }

    const heroSeries = seriesList[0];

    return (
        <div className="screen">
            <Header />

            <div className="filter-scroll">
                <div className="filter-chip active">Featured</div>
                <div className="filter-chip">Romance</div>
                <div className="filter-chip">Revenge</div>
                <div className="filter-chip">CEO</div>
                <div className="filter-chip">Historical</div>
            </div>

            <HeroBanner
                series={heroSeries.series}
                episode={heroSeries.episodes[0].episode}
                onPlay={() => handleEpisodeClick(heroSeries.series.id, heroSeries.episodes[0].episode.id)}
            />

            {seriesList.map((s) => (
                <SeriesRail
                    key={s.series.id}
                    title={s.series.title}
                    items={s.episodes}
                    onEpisodeClick={handleEpisodeClick}
                />
            ))}

            <BottomNav />
        </div>
    );
}
