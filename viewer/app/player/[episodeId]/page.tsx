'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getFeed, unlockEpisode } from '@/lib/api';
import type { FeedItem } from '@/lib/types';
import VideoPlayer from '@/components/organisms/VideoPlayer';
import UnlockModal from '@/components/organisms/UnlockModal';

export default function PlayerPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { token, coins, setCoins, isLoading } = useAuth();

    const episodeId = params.episodeId as string;
    const seriesId = searchParams.get('seriesId');

    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [currentItem, setCurrentItem] = useState<FeedItem | null>(null);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [isLoadingFeed, setIsLoadingFeed] = useState(true);

    const loadFeed = useCallback(async () => {
        if (!token) return;

        const res = await getFeed(token);
        if (res.ok && res.data.items) {
            setFeed(res.data.items);

            // Find current episode
            const item = res.data.items.find(i => i.episode.id === episodeId);
            if (item) {
                setCurrentItem(item);
                setCoins(item.viewer.coins);

                // Check if locked
                if (!item.viewer.unlocked) {
                    setShowUnlockModal(true);
                }
            }
        }
        setIsLoadingFeed(false);
    }, [token, episodeId, setCoins]);

    useEffect(() => {
        if (!isLoading && token) {
            loadFeed();
        }
    }, [isLoading, token, loadFeed]);

    const handleBack = () => {
        router.push('/');
    };

    const handleNext = () => {
        if (!currentItem || !seriesId) return;

        // Find episodes in same series
        const seriesEps = feed
            .filter(i => i.series.id === seriesId)
            .sort((a, b) => a.episode.episodeNumber - b.episode.episodeNumber);

        const currentIdx = seriesEps.findIndex(i => i.episode.id === episodeId);
        if (currentIdx >= 0 && currentIdx < seriesEps.length - 1) {
            const nextEp = seriesEps[currentIdx + 1];
            router.push(`/player/${nextEp.episode.id}?seriesId=${seriesId}`);
        } else {
            alert('No more episodes!');
        }
    };

    const handleVideoEnded = () => {
        handleNext();
    };

    const handleUnlockAd = async () => {
        if (!token || !currentItem) return;

        const res = await unlockEpisode(token, currentItem.episode.id, 'ad');
        if (res.ok) {
            if (res.data.coins !== undefined) {
                setCoins(res.data.coins);
            }
            // Refresh to get updated state
            await loadFeed();
            setShowUnlockModal(false);
        } else {
            alert('Unlock failed');
        }
    };

    const handleUnlockCoins = async () => {
        if (!token || !currentItem) return;

        const res = await unlockEpisode(token, currentItem.episode.id, 'coins');
        if (res.ok) {
            // Update coins from response
            if (res.data.coins !== undefined) {
                setCoins(res.data.coins);
            }
            // Refresh to get updated unlock state
            await loadFeed();
            setShowUnlockModal(false);
        } else {
            throw new Error((res.data as any)?.error || 'Unlock failed');
        }
    };

    const handleCancelUnlock = () => {
        router.push('/');
    };

    if (isLoading || isLoadingFeed) {
        return (
            <div className="player-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ color: 'white' }}>Loading...</div>
            </div>
        );
    }

    if (!currentItem) {
        return (
            <div className="player-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ color: 'white' }}>Episode not found</div>
                <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleBack}>
                    Go Back
                </button>
            </div>
        );
    }

    // Show unlock modal if locked
    if (showUnlockModal && !currentItem.viewer.unlocked) {
        return (
            <div className="player-screen">
                <UnlockModal
                    episodeCost={currentItem.episode.coinCost || currentItem.series.defaultCoinCost}
                    userCoins={coins}
                    onUnlockAd={handleUnlockAd}
                    onUnlockCoins={handleUnlockCoins}
                    onCancel={handleCancelUnlock}
                />
            </div>
        );
    }

    // Show video player
    if (!currentItem.episode.videoUrl) {
        return (
            <div className="player-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ color: 'white' }}>Video not available</div>
                <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleBack}>
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <VideoPlayer
            videoUrl={currentItem.episode.videoUrl}
            seriesTitle={currentItem.series.title}
            episodeNumber={currentItem.episode.episodeNumber}
            onBack={handleBack}
            onNext={handleNext}
            onEnded={handleVideoEnded}
        />
    );
}
