'use client';

import { useState, useRef, useEffect } from 'react';

interface UnlockModalProps {
    episodeCost: number;
    userCoins: number;
    onUnlockAd: () => Promise<void>;
    onUnlockCoins: () => Promise<void>;
    onCancel: () => void;
}

// Ad configuration
const AD_CONFIG = {
    // Primary: Google AdSense (placeholder - requires actual implementation)
    adsenseEnabled: false, // Set to true when AdSense is configured
    adsenseAdUnitId: '', // Your AdSense video ad unit ID

    // Fallback: Mock ad from Supabase Storage
    // Use Supabase public URL if available, otherwise fallback to local
    fallbackAdUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/shortdrama-processed/ads/MockAd.mp4`
        : '/ads/mock-ad.mp4', // Local development fallback

    // Reward amount for watching an ad
    rewardAmount: 5,
};

export default function UnlockModal({
    episodeCost,
    userCoins,
    onUnlockAd,
    onUnlockCoins,
    onCancel,
}: UnlockModalProps) {
    const [showingAd, setShowingAd] = useState(false);
    const [adTimeLeft, setAdTimeLeft] = useState(0);
    const [adDuration, setAdDuration] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [adError, setAdError] = useState<string | null>(null);
    const [canSkip, setCanSkip] = useState(false);
    const adVideoRef = useRef<HTMLVideoElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const handleWatchAd = async () => {
        setShowingAd(true);
        setAdError(null);
        setCanSkip(false);

        const adVideo = adVideoRef.current;
        if (!adVideo) {
            setAdError('Video player not available');
            setShowingAd(false);
            return;
        }

        // Try to load AdSense first, fallback to local ad
        let adUrl = AD_CONFIG.fallbackAdUrl;

        if (AD_CONFIG.adsenseEnabled && AD_CONFIG.adsenseAdUnitId) {
            // TODO: Implement actual AdSense video ad loading
            // For now, we'll use the fallback
            console.log('[Ad] AdSense configured but implementation pending, using fallback');
        }

        // fallbackAdUrl is now a fully qualified URL (Supabase public URL)
        // No need to prepend API server URL
        adVideo.src = adUrl;

        try {
            // Wait for metadata to load to get duration
            await new Promise<void>((resolve, reject) => {
                adVideo.onloadedmetadata = () => {
                    setAdDuration(Math.ceil(adVideo.duration));
                    setAdTimeLeft(Math.ceil(adVideo.duration));
                    resolve();
                };
                adVideo.onerror = () => {
                    reject(new Error('Failed to load ad video'));
                };
                adVideo.load();
            });

            // Start playback
            await adVideo.play();

            // Start countdown timer
            timerRef.current = setInterval(() => {
                if (adVideo) {
                    const remaining = Math.ceil(adVideo.duration - adVideo.currentTime);
                    setAdTimeLeft(remaining > 0 ? remaining : 0);

                    // Allow skip after watching at least 5 seconds or 80% of ad
                    const watchedPct = adVideo.currentTime / adVideo.duration;
                    if (adVideo.currentTime >= 5 || watchedPct >= 0.8) {
                        setCanSkip(true);
                    }
                }
            }, 250);

            // Handle ad completion
            adVideo.onended = async () => {
                if (timerRef.current) clearInterval(timerRef.current);
                await completeAdUnlock();
            };

        } catch (error) {
            console.error('[Ad] Playback failed:', error);
            if (timerRef.current) clearInterval(timerRef.current);
            setAdError('Ad failed to play. Please try again.');
            setShowingAd(false);
            // DO NOT grant unlock if ad fails - user must try again
        }
    };

    const handleSkipAd = async () => {
        if (!canSkip) return;

        const adVideo = adVideoRef.current;
        if (adVideo) {
            adVideo.pause();
        }
        if (timerRef.current) clearInterval(timerRef.current);

        await completeAdUnlock();
    };

    const completeAdUnlock = async () => {
        setIsProcessing(true);
        try {
            await onUnlockAd();
        } catch (error) {
            console.error('[Ad] Unlock failed:', error);
            setAdError('Failed to unlock episode. Please try again.');
        } finally {
            setShowingAd(false);
            setIsProcessing(false);
        }
    };

    const handleCancelAd = () => {
        const adVideo = adVideoRef.current;
        if (adVideo) {
            adVideo.pause();
            adVideo.src = '';
        }
        if (timerRef.current) clearInterval(timerRef.current);
        setShowingAd(false);
        setAdError(null);
    };

    const handleUseCoins = async () => {
        if (userCoins < episodeCost) {
            alert('Not enough coins!');
            return;
        }
        setIsProcessing(true);
        try {
            await onUnlockCoins();
        } catch (error) {
            console.error('[Coins] Unlock failed:', error);
            alert('Failed to unlock episode. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    // Ad playing screen
    if (showingAd) {
        return (
            <div className="ad-overlay">
                <video
                    ref={adVideoRef}
                    className="ad-video"
                    playsInline
                    muted={false}
                    preload="metadata"
                />
                <div className="ad-ui">
                    <div className="ad-header">
                        <div className="ad-label">Ad · Watch to earn {AD_CONFIG.rewardAmount} coins</div>
                        {canSkip ? (
                            <button
                                className="ad-skip-btn"
                                onClick={handleSkipAd}
                                disabled={isProcessing}
                            >
                                Skip Ad →
                            </button>
                        ) : (
                            <div className="ad-timer">
                                {adTimeLeft > 0 ? `${adTimeLeft}s` : ''}
                            </div>
                        )}
                    </div>
                    <button
                        className="ad-cancel-btn"
                        onClick={handleCancelAd}
                        disabled={isProcessing}
                    >
                        ✕
                    </button>
                </div>
                {isProcessing && (
                    <div className="ad-processing">
                        <div>Unlocking episode...</div>
                    </div>
                )}
            </div>
        );
    }

    // Main unlock modal
    return (
        <div className="unlock-modal active">
            <div className="unlock-title">Unlock Episode</div>
            <div className="unlock-subtitle">Watch an ad to unlock + earn coins!</div>

            {adError && (
                <div className="unlock-error">{adError}</div>
            )}

            <button
                className="unlock-btn ad"
                onClick={handleWatchAd}
                disabled={isProcessing}
            >
                <span>Watch Ad (+{AD_CONFIG.rewardAmount} 🟡)</span>
                <span>Free</span>
            </button>

            <button
                className="unlock-btn coins"
                onClick={handleUseCoins}
                disabled={isProcessing || userCoins < episodeCost}
            >
                <span>Use Coins</span>
                <span>{episodeCost} 🟡</span>
            </button>

            <div className="unlock-balance">Your balance: {userCoins} 🟡</div>

            <button
                className="unlock-btn-cancel"
                onClick={onCancel}
                disabled={isProcessing}
            >
                Cancel
            </button>
        </div>
    );
}
