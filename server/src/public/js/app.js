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
                    hide(getEl('unlock-modal')); // Ensure modal is closed
                    // Stop video if playing
                    const v = getEl('v');
                    if (v) v.pause();
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

    async function doUnlock(item, method) {
        const btnId = method === 'ad' ? 'btn-unlock-ad' : 'btn-unlock-coins';
        const originalText = getEl(btnId).innerHTML;
        getEl(btnId).textContent = 'Unlocking...';

        const res = await api(`/episode/${item.episode.id}/unlock`, {
            method: 'POST',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ method })
        });

        if (res.ok) {
            // Refresh feed to get new URLs/status
            await loadFeed();
            // Re-trigger play (now it should be unlocked)
            playEpisode(item.series.id, item.episode.id);
        } else {
            alert('Unlock failed: ' + (res.data?.error || 'Unknown error'));
            getEl(btnId).innerHTML = originalText;
        }
    }

    // Start
    init();
});