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

    const handleSeriesClick = (seriesItem: SeriesListItem) => {
        // In a full app, this would navigate to a series detail page
        alert(`Series detail coming soon: ${seriesItem.title}`);
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
