document.addEventListener('DOMContentLoaded', () => {
    // --- API & State --- (Reused from original)
    const api = (path, opts = {}) => fetch(path, opts).then(async r => ({
        ok: r.ok,
        status: r.status,
        data: await r.json().catch(() => ({}))
    }));

    let token = localStorage.getItem('userToken');
    let feed = [];
    let currentUser = { coins: 0 };
    let currentSeriesId = null;
    let currentEpisodeId = null;

    const authHeaders = () => token ? { authorization: 'Bearer ' + token } : {};

    // --- UI Helpers ---
    const getEl = (id) => document.getElementById(id);
    const show = (el) => el.classList.remove('hidden');
    const hide = (el) => el.classList.add('hidden');

    // --- Init ---
    async function init() {
        if (!token) {
            const res = await api('/auth/guest', { method: 'POST' });
            if (res.ok) {
                token = res.data.token;
                localStorage.setItem('userToken', token);
            }
        }
        await loadFeed();
        setupNavigation();
    }

    // --- Navigation ---
    function setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                navItems.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Simple routing for MVP
                if (idx === 0) { // Home
                    show(getEl('home-screen'));
                    hide(getEl('player-screen'));
                    hide(getEl('explore-screen'));
                    hide(getEl('unlock-modal')); // Ensure modal is closed
                    // Stop video if playing
                    const v = getEl('v');
                    if (v) v.pause();
                } else if (idx === 1) { // Explore
                    show(getEl('explore-screen'));
                    hide(getEl('home-screen'));
                    hide(getEl('player-screen'));
                    hide(getEl('unlock-modal'));
                    const v = getEl('v');
                    if (v) v.pause();
                    loadSeasons();
                } else {
                    // Placeholder for other tabs
                    // alert('Tab ' + (idx + 1) + ' coming soon!');
                }
            });
        });

        // Search/Notif mocks
        // getEl('btn-search')?.addEventListener('click', () => alert('Search coming soon'));
    }

    // --- Home Feed Rendering ---
    async function loadFeed() {
        const res = await api('/feed/home', { headers: authHeaders() });
        if (!res.ok) return; // Handle error

        feed = res.data.items || [];
        // Update User State (coins) - assumed to be part of the first item's viewer info or separate
        if (feed.length > 0) {
            currentUser.coins = feed[0].viewer.coins;
            updateCoinDisplay();
        }

        renderHome(feed);
    }

    function updateCoinDisplay() {
        const el = getEl('header-coins');
        if (el) el.textContent = currentUser.coins;
    }

    function renderHome(items) {
        const container = getEl('home-content');
        container.innerHTML = '';

        if (items.length === 0) {
            container.innerHTML = '<div style="padding:20px; text-align:center;">No content available.</div>';
            return;
        }

        // Group by Series
        const seriesMap = {};
        items.forEach(item => {
            if (!seriesMap[item.series.id]) {
                seriesMap[item.series.id] = { ...item.series, episodes: [] };
            }
            seriesMap[item.series.id].episodes.push(item);
        });

        // 1. Hero Banner (First Series)
        const seriesList = Object.values(seriesMap);
        const heroSeries = seriesList[0];

        // Use the first episode's thumbnail for the hero raw logic
        // Ideally we'd have a specific series poster, but using episode thumb is fine for POC
        const heroImg = heroSeries.episodes[0].episode.thumbnailUrl || '';

        const hero = document.createElement('div');
        hero.className = 'hero-banner';
        hero.style.backgroundImage = `url('${heroImg}')`;
        hero.innerHTML = `
            <div class="hero-overlay">
                <div class="hero-tags">
                    <span class="tag new">New Release</span>
                    <span class="tag hot">Trending</span>
                </div>
                <h1 class="hero-title">${heroSeries.title}</h1>
                <div class="hero-actions">
                    <button class="btn btn-primary" onclick="playEpisode('${heroSeries.id}', '${heroSeries.episodes[0].episode.id}')">
                        ▶ Watch Ep 1
                    </button>
                    <button class="btn" style="background:rgba(255,255,255,0.2); color:white;">+ My List</button>
                </div>
            </div>
        `;
        container.appendChild(hero);

        // 2. Content Rails
        seriesList.forEach(s => {
            const rail = document.createElement('div');
            rail.className = 'rail-container';
            rail.innerHTML = `
                <div class="rail-header">
                    <h2 class="rail-title">${s.title}</h2>
                    <span class="text-secondary" style="font-size:12px;">More ></span>
                </div>
                <div class="rail-scroll">
                    ${s.episodes.map(epItem => `
                        <div class="series-card" onclick="playEpisode('${s.id}', '${epItem.episode.id}')">
                            <div class="poster-wrapper">
                                <img src="${epItem.episode.thumbnailUrl}" class="poster-img" loading="lazy" />
                                ${!epItem.viewer.unlocked ? '<div style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.6);border-radius:4px;padding:2px;"><span style="font-size:10px;">🔒</span></div>' : ''}
                            </div>
                            <h3 class="series-title">Ep ${epItem.episode.episodeNumber}</h3>
                            <span class="series-meta">${formatTime(epItem.episode.durationSec)}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            container.appendChild(rail);
        });
    }

    function formatTime(sec) {
        if (!sec) return '';
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' + s : s}`;
    }

    // --- Player Logic ---
    window.playEpisode = (sid, eid) => {
        const item = feed.find(i => i.series.id === sid && i.episode.id === eid);
        if (!item) return;

        currentSeriesId = sid;
        currentEpisodeId = eid;

        // Reset UI
        const playerScreen = getEl('player-screen');
        const video = getEl('v');
        const playerUI = getEl('player-ui');
        const unlockModal = getEl('unlock-modal');

        getEl('player-series-title').textContent = item.series.title;
        getEl('player-ep-title').textContent = `Episode ${item.episode.episodeNumber}`;

        // Check Lock Status
        if (!item.viewer.unlocked) {
            // Show Unlock Modal
            show(playerScreen);
            video.src = ''; // Clear video
            hide(playerUI); // Hide controls
            unlockModal.classList.add('active');

            // Setup Unlock Buttons
            getEl('modal-cost').textContent = item.episode.coinCost || item.series.defaultCoinCost;

            getEl('btn-unlock-ad').onclick = () => doUnlock(item, 'ad');
            getEl('btn-unlock-coins').onclick = () => doUnlock(item, 'coins');
            getEl('btn-unlock-cancel').onclick = () => {
                hide(playerScreen);
                unlockModal.classList.remove('active');
            };
        } else {
            // Play Video
            show(playerScreen);
            unlockModal.classList.remove('active');
            show(playerUI);

            video.src = item.episode.videoUrl;
            video.play().catch(e => console.log('Autoplay prevented', e));
        }

        // Setup Player Controls
        setupPlayerControls(video);
    };

    function setupPlayerControls(video) {
        const ui = getEl('player-ui');
        const playIcon = getEl('play-icon');
        const progressFill = getEl('progress-fill');

        // Toggle Play/Pause on tap
        ui.onclick = (e) => {
            if (e.target.tagName === 'BUTTON') return; // Ignore button clicks
            if (video.paused) {
                video.play();
                hide(playIcon);
            } else {
                video.pause();
                show(playIcon);
            }
        };

        // Back Button
        getEl('btn-back').onclick = () => {
            video.pause();
            hide(getEl('player-screen'));
            show(getEl('home-screen'));
            loadFeed(); // Refresh to update progress/locks
        };

        // Progress Update
        video.ontimeupdate = () => {
            if (video.duration) {
                const pct = (video.currentTime / video.duration) * 100;
                progressFill.style.width = pct + '%';
            }
        };

        // Video End -> Next Episode logic (Mock)
        video.onended = () => {
            // In a real app, find next episode and play
            getEl('btn-next-ep').click();
        };

        // Next Episode Button
        getEl('btn-next-ep').onclick = (e) => {
            e.stopPropagation();
            // Find next episode in the same series
            const currentItem = feed.find(i => i.episode.id === currentEpisodeId);
            if (!currentItem) return;

            // Assuming feed is flat list of all episodes, filter by series
            const seriesEps = feed.filter(i => i.series.id === currentSeriesId)
                .sort((a, b) => a.episode.episodeNumber - b.episode.episodeNumber);

            const currentIdx = seriesEps.findIndex(i => i.episode.id === currentEpisodeId);
            if (currentIdx >= 0 && currentIdx < seriesEps.length - 1) {
                const nextEp = seriesEps[currentIdx + 1];
                playEpisode(nextEp.series.id, nextEp.episode.id);
            } else {
                alert('No more episodes!');
            }
        };
    }

    async function loadSeasons() {
        const res = await api('/feed/series', { headers: authHeaders() });
        if (!res.ok) return;

        const container = getEl('explore-content');
        container.innerHTML = '';

        if (!res.data.items || res.data.items.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">No series found.</div>';
            return;
        }

        res.data.items.forEach(s => {
            const card = document.createElement('div');
            card.className = 'series-card vertical'; // Reuse or add css
            // quick inline style for grid layout
            card.style.width = '100%';

            card.innerHTML = `
                <div class="poster-wrapper" style="aspect-ratio: 3/4; border-radius:8px; overflow:hidden;">
                    <img src="${s.coverUrl || ''}" style="width:100%; height:100%; object-fit:cover;" loading="lazy" />
                </div>
                <h3 class="series-title" style="margin-top:8px;">${s.title}</h3>
                <span class="series-meta">${s.genres.join(', ') || 'Drama'}</span>
            `;
            // For now, clicking a series just goes to home (or we could start playing likely)
            // MVP: Just alert or go home
            card.onclick = () => {
                // Ideally filter home or open series detail
                alert('Series detail coming soon: ' + s.title);
            };
            container.appendChild(card);
        });
    }

    async function doUnlock(item, method) {
        if (method === 'ad') {
            // 1. Show Ad Overlay
            const overlay = getEl('ad-overlay');
            const adVideo = getEl('ad-video');
            const timer = getEl('ad-timer');

            show(overlay);
            // Dynamic ad URL from local MinIO
            adVideo.src = 'http://localhost:9000/shortdrama-processed/ads/MockAd.mp4';
            adVideo.currentTime = 0;

            // disable main player controls if needed, but overlay covers it.

            // 2. Play Ad
            try {
                await adVideo.play();
            } catch (e) {
                console.error('Ad playback failed:', e);
                alert('Ad failed to play. Please try again or use coins to unlock.');
                hide(overlay);
                // Do NOT unlock if ad fails - user must retry or use coins
                return;
            }

            // Timer update
            const interval = setInterval(() => {
                const rem = Math.ceil(adVideo.duration - adVideo.currentTime);
                timer.textContent = rem > 0 ? rem : '';
            }, 500);

            // 3. On End -> Call API
            adVideo.onended = () => {
                clearInterval(interval);
                finishUnlock();
            };

            async function finishUnlock() {
                // Show unlocking state in overlay instead of hiding it immediately
                const adLabel = overlay.querySelector('.ad-label');
                if (adLabel) adLabel.textContent = 'Ad complete. Unlocking episode...';

                // Call API
                const res = await api(`/episode/${item.episode.id}/unlock`, {
                    method: 'POST',
                    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ method: 'ad' })
                });

                if (res.ok) {
                    // Update coins locally if returned
                    if (res.data.coins !== undefined) {
                        currentUser.coins = res.data.coins;
                        updateCoinDisplay();
                    }
                    // Refresh feed to get new URLs/status
                    await loadFeed();

                    // Re-trigger play
                    playEpisode(item.series.id, item.episode.id);

                    // Now hide overlay
                    hide(overlay);
                    if (adLabel) adLabel.textContent = 'Ad · Reward in progress'; // Reset label
                } else {
                    alert('Unlock failed: ' + (res.data?.error || 'Unknown error'));
                    hide(overlay); // Hide on error so user can retry
                }
            }

        } else {
            // Coins method
            const btnId = 'btn-unlock-coins';
            const originalText = getEl(btnId).innerHTML;
            getEl(btnId).textContent = 'Unlocking...';

            const res = await api(`/episode/${item.episode.id}/unlock`, {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ method: 'coins' })
            });

            if (res.ok) {
                // Deduct coins locally (or refresh)
                await loadFeed(); // This will update coins from server state
                playEpisode(item.series.id, item.episode.id);
            } else {
                alert('Unlock failed: ' + (res.data?.error || 'Unknown error'));
                getEl(btnId).innerHTML = originalText;
            }
        }
    }

    // Start
    init();
});