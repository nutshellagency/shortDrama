'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { getSeriesList } from '@/lib/api';
import type { SeriesListItem } from '@/lib/types';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import SeriesCard from '@/components/SeriesCard';

export default function ExplorePage() {
    const { token, isLoading } = useAuth();
    const [series, setSeries] = useState<SeriesListItem[]>([]);
    const [isLoadingSeries, setIsLoadingSeries] = useState(true);

    const loadSeries = useCallback(async () => {
        if (!token) return;

        const res = await getSeriesList(token);
        if (res.ok && res.data.items) {
            setSeries(res.data.items);
        }
        setIsLoadingSeries(false);
    }, [token]);

    useEffect(() => {
        if (!isLoading && token) {
            loadSeries();
        }
    }, [isLoading, token, loadSeries]);

    const handleSeriesClick = async (seriesItem: SeriesListItem) => {
        // Navigate to first episode of the series
        if (!token) return;

        try {
            // Fetch episodes for this series to get the first episode ID
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/feed/episodes?seriesId=${seriesItem.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.items && data.items.length > 0) {
                    // Navigate to first episode
                    const firstEpisode = data.items[0];
                    window.location.href = `/player/${firstEpisode.id}?seriesId=${seriesItem.id}`;
                } else {
                    alert('No episodes available for this series');
                }
            }
        } catch (error) {
            console.error('Error loading series:', error);
            alert('Failed to load series. Please try again.');
        }
    };

    if (isLoading || isLoadingSeries) {
        return (
            <div className="screen">
                <header className="app-header">
                    <div className="app-logo">Explore</div>
                </header>
                <div className="loading-container" style={{ marginTop: 'var(--header-height)' }}>
                    Loading...
                </div>
                <BottomNav />
            </div>
        );
    }

    return (
        <div className="screen" style={{ paddingBottom: '80px' }}>
            <header className="app-header">
                <div className="app-logo">Explore</div>
            </header>

            <div className="explore-grid">
                {series.length === 0 ? (
                    <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                        No series found.
                    </div>
                ) : (
                    series.map((s) => (
                        <SeriesCard
                            key={s.id}
                            series={s}
                            onClick={() => handleSeriesClick(s)}
                        />
                    ))
                )}
            </div>

            <BottomNav />
        </div>
    );
}
