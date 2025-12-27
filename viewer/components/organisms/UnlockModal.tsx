'use client';

import { useState, useRef, useEffect } from 'react';
import { CoinsIcon } from '@/components/atoms/Icons';

interface UnlockModalProps {
    episodeCost: number;
    userCoins: number;
    onUnlockAd: () => Promise<void>;
    onUnlockCoins: () => Promise<void>;
    onCancel: () => void;
}

// Ad configuration - v2.1 for cache bust
const AD_CONFIG = {
    // Primary: Google AdSense (placeholder - requires actual implementation)
    adsenseEnabled: false, // Set to true when AdSense is configured
    adsenseAdUnitId: '', // Your AdSense video ad unit ID

    // Fallback: Mock ad from local public folder or Supabase
    // Using absolute path /MockAd.mp4 to ensure it works from any page level (e.g. /player/[id])
    fallbackAdUrl: '/MockAd.mp4', 

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
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
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

    const toggleMute = () => {
        const adVideo = adVideoRef.current;
        if (adVideo) {
            adVideo.muted = !adVideo.muted;
            setIsMuted(adVideo.muted);
        }
    };

    const handleWatchAd = async () => {
        setShowingAd(true);
        setAdError(null);
        setCanSkip(false);
        // The actual video loading will now happen in a useEffect watcher below
    };

    // New Watcher: Wait for showingAd to mount the video element, then play
    useEffect(() => {
        if (!showingAd) return;

        const startPlayback = async () => {
            // Give the browser a tiny moment to mount the video element
            await new Promise(resolve => setTimeout(resolve, 150));

            const adVideo = adVideoRef.current;
            if (!adVideo) {
                console.error('[Ad] Video element ref not found after render');
                setAdError('Video player initialization failed. Please try again.');
                return;
            }

            setIsLoading(true);
            setAdError(null);

            // Use the configured fallback URL (Supabase or Local)
            const adUrl = AD_CONFIG.fallbackAdUrl;
            console.log('[Ad] Attempting to play ad from:', adUrl);
            
            // Set source and reset state
            adVideo.src = adUrl;
            adVideo.load();

            try {
                // Wait for the video to be ready to play
                await new Promise<void>((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Ad load timeout')), 15000);
                    
                    const onReady = () => {
                        clearTimeout(timeout);
                        setIsLoading(false);
                        setAdDuration(Math.ceil(adVideo.duration));
                        setAdTimeLeft(Math.ceil(adVideo.duration));
                        resolve();
                    };

                    adVideo.oncanplay = onReady;
                    adVideo.onloadedmetadata = onReady;
                    
                    adVideo.onerror = () => {
                        clearTimeout(timeout);
                        setIsLoading(false);
                        reject(new Error('Failed to load ad video source. Check your connection or storage.'));
                    };
                });

                // Start playback - try unmuted first, then muted if blocked
                try {
                    adVideo.muted = false;
                    setIsMuted(false);
                    await adVideo.play();
                } catch (playError) {
                    console.warn('[Ad] Unmuted playback blocked, trying muted...');
                    adVideo.muted = true;
                    setIsMuted(true);
                    await adVideo.play();
                }

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

            } catch (error: any) {
                console.error('[Ad] Playback failed:', error);
                if (timerRef.current) clearInterval(timerRef.current);
                setAdError(error.message || 'Ad failed to play. Please try again.');
                // Don't auto-close, let user see error or try again
            }
        };

        startPlayback();
    }, [showingAd]);

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
                    autoPlay
                    muted={false}
                    preload="metadata"
                    style={{ 
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw', 
                        height: '100vh', 
                        display: 'block', 
                        objectFit: 'contain',
                        backgroundColor: '#111',
                        zIndex: 290
                    }}
                />
                <div className="ad-ui">
                    {adError && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: '#ff4444',
                            textAlign: 'center',
                            zIndex: 30,
                            background: 'rgba(0,0,0,0.8)',
                            padding: '20px',
                            borderRadius: '10px',
                            width: '80%'
                        }}>
                            <p style={{ marginBottom: '15px' }}>{adError}</p>
                            <button 
                                className="btn btn-primary btn-sm" 
                                onClick={handleCancelAd}
                                style={{ width: 'auto', padding: '8px 20px' }}
                            >
                                Close
                            </button>
                        </div>
                    )}
                    {isLoading && !adError && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: '#fff',
                            textAlign: 'center',
                            zIndex: 20
                        }}>
                            <div className="animate-spin" style={{
                                width: '40px',
                                height: '40px',
                                border: '4px solid rgba(255,255,255,0.3)',
                                borderTop: '4px solid #fff',
                                borderRadius: '50%',
                                margin: '0 auto 10px'
                            }}></div>
                            <p>Loading Ad...</p>
                        </div>
                    )}
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
                    <button 
                        className="ad-mute-btn" 
                        onClick={toggleMute}
                        style={{
                            position: 'absolute',
                            bottom: '20px',
                            right: '20px',
                            background: 'rgba(0,0,0,0.6)',
                            border: '1px solid #fff',
                            color: '#fff',
                            padding: '8px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            zIndex: 10
                        }}
                    >
                        {isMuted ? '🔇 Unmute' : '🔊 Mute'}
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
                <span>Watch Ad (+{AD_CONFIG.rewardAmount} <CoinsIcon size={14} className="inline mb-0.5" />)</span>
                <span>Free</span>
            </button>

            <button
                className="unlock-btn coins"
                onClick={handleUseCoins}
                disabled={isProcessing || userCoins < episodeCost}
            >
                <span>Use Coins</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {episodeCost} <CoinsIcon size={14} className="text-[var(--coin-gold)]" />
                </span>
            </button>

            <div className="unlock-balance">Your balance: {userCoins} <span style={{ color: 'var(--coin-gold)' }}>●</span></div>

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
