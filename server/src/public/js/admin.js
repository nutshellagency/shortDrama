const log = (obj) => {
    const el = document.getElementById('log');
    el.textContent = (typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2)) + "\n\n" + el.textContent;
};
const api = (path, opts = {}) => fetch(path, opts).then(async r => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }));
const getToken = () => localStorage.getItem('adminToken');
const setToken = (t) => { localStorage.setItem('adminToken', t); document.getElementById('tokenState').textContent = t ? 'set' : 'not logged in'; };
setToken(getToken());

async function adminLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const res = await api('/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
    log(res);
    if (res.ok) setToken(res.data.token);
}

async function createSeries() {
    const title = document.getElementById('seriesTitle').value;
    const language = document.getElementById('seriesLang').value;
    const genres = document.getElementById('seriesGenres').value.split(',').map(s => s.trim()).filter(Boolean);
    const description = document.getElementById('seriesDesc').value;
    const freeEpisodes = Number(document.getElementById('seriesFree').value || 3);
    const episodeDurationSec = Number(document.getElementById('seriesEpSec').value || 180);
    const defaultCoinCost = Number(document.getElementById('seriesCoinCost').value || 5);
    const res = await api('/admin/series', { method: 'POST', headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + getToken() }, body: JSON.stringify({ title, language, genres, description, freeEpisodes, episodeDurationSec, defaultCoinCost }) });
    log(res);
    if (res.ok) {
        document.getElementById('seriesIdState').textContent = res.data.id;
        localStorage.setItem('seriesId', res.data.id);
    }
}

async function uploadRaw() {
    const f = document.getElementById('rawFile').files[0];
    if (!f) return alert('Choose a video file first');
    const fd = new FormData();
    fd.append('file', f, f.name);
    const res = await fetch('/admin/upload-file', { method: 'POST', headers: { 'authorization': 'Bearer ' + getToken() }, body: fd });
    const data = await res.json().catch(() => ({}));
    log({ ok: res.ok, status: res.status, data });
    if (!res.ok) return alert('Upload failed: ' + (data.error || res.status));
    document.getElementById('rawKeyState').textContent = data.key;
    if (data.sizeBytes) document.getElementById('rawKeyState').textContent = data.key + ' (' + Math.round(data.sizeBytes / 1024 / 1024) + 'MB)';
    localStorage.setItem('rawKey', data.key);
    if (data.sizeBytes && Number(data.sizeBytes) < 10 * 1024 * 1024) {
        alert('Warning: upload seems too small (' + Math.round(data.sizeBytes / 1024 / 1024) + 'MB). Re-upload your full video.');
    }
}

async function ensureSeries() {
    let seriesId = localStorage.getItem('seriesId') || document.getElementById('seriesIdState').textContent;
    if (seriesId && seriesId !== '-') return seriesId;
    const title = document.getElementById('seriesTitle').value || 'Demo Series';
    const language = document.getElementById('seriesLang').value || 'ur';
    const freeEpisodes = Number(document.getElementById('autoFree').value || 3);
    const episodeDurationSec = Number(document.getElementById('autoEpSec').value || 180);
    const defaultCoinCost = Number(document.getElementById('autoCoinCost').value || 5);
    const res = await api('/admin/series', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + getToken() },
        body: JSON.stringify({ title, language, genres: [], description: 'POC series', freeEpisodes, episodeDurationSec, defaultCoinCost })
    });
    log(res);
    if (!res.ok) throw new Error('Create series failed');
    seriesId = res.data.id;
    document.getElementById('seriesIdState').textContent = seriesId;
    localStorage.setItem('seriesId', seriesId);
    return seriesId;
}

async function generateEpisodes() {
    const rawKey = (localStorage.getItem('rawKey') || '').trim();
    if (!rawKey || rawKey === '-') return alert('Upload a video first');
    const seriesId = await ensureSeries();
    const episodeDurationSec = Number(document.getElementById('autoEpSec').value || 180);
    const freeEpisodes = Number(document.getElementById('autoFree').value || 3);
    const defaultCoinCost = Number(document.getElementById('autoCoinCost').value || 5);
    const maxEpisodes = Number(document.getElementById('autoMaxEps').value || 3);
    const res = await api('/admin/series/' + seriesId + '/auto-split', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + getToken() },
        body: JSON.stringify({ rawKey, episodeDurationSec, freeEpisodes, defaultCoinCost, maxEpisodes })
    });
    log(res);
    if (!res.ok) return alert('Generate failed: ' + (res.data.error || res.status) + (res.data.hint ? (' | ' + res.data.hint) : ''));
    document.getElementById('jobIdState').textContent = res.data.jobId;
    localStorage.setItem('jobId', res.data.jobId);
    pollJob();
}

async function pollJob() {
    const jobId = localStorage.getItem('jobId') || document.getElementById('jobIdState').textContent;
    if (!jobId || jobId === '-') return;
    const res = await api('/admin/jobs/' + jobId + '/status', { headers: { 'authorization': 'Bearer ' + getToken() } });
    if (res.ok) {
        // If the user is watching a queued split job but another split job is actually processing, follow it.
        if (res.data.activeSplitJob && res.data.activeSplitJob.id && res.data.job.status === 'PENDING') {
            const activeId = res.data.activeSplitJob.id;
            localStorage.setItem('jobId', activeId);
            document.getElementById('jobIdState').textContent = activeId;
        }
        const j = res.data.job;
        document.getElementById('jobState').textContent = j.status + ' | ' + (j.progressPct ?? 0) + '% | ' + (j.stage || '-') + ' | ' + (j.lastHeartbeat || '-');
        const prog = document.getElementById('jobProg');
        if (prog) prog.value = (j.progressPct ?? 0);
        if (j.status === 'SUCCEEDED') {
            await loadEpisodes();
            return;
        }
    }
    setTimeout(pollJob, 1500);
}

async function loadEpisodes() {
    const seriesId = localStorage.getItem('seriesId') || document.getElementById('seriesIdState').textContent;
    if (!seriesId || seriesId === '-') return;
    const res = await api('/admin/series/' + seriesId + '/episodes', { headers: { 'authorization': 'Bearer ' + getToken() } });
    log(res);
    if (!res.ok) return;
    const eps = res.data.episodes || [];
    document.getElementById('episodes').textContent = eps.map(e => {
        const hasVideo = e.videoKey ? 'video' : '-';
        return 'Ep ' + e.episodeNumber + ' | ' + e.status + ' | ' + e.lockType + (e.lockType === 'COINS' ? ('(' + e.coinCost + ')') : '') + ' | ' + hasVideo + ' | ' + (e.durationSec ?? '-') + 's';
    }).join('\n');
}

async function createEpisode() {
    const seriesId = localStorage.getItem('seriesId') || document.getElementById('seriesIdState').textContent;
    const rawKey = localStorage.getItem('rawKey') || document.getElementById('rawKeyState').textContent;
    if (!rawKey || rawKey === '-') return alert('Upload raw video first (rawKey is missing).');
    const episodeNumber = Number(document.getElementById('episodeNumber').value);
    const lockType = document.getElementById('lockType').value;
    const coinCost = Number(document.getElementById('coinCost').value);
    const res = await api('/admin/episodes', { method: 'POST', headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + getToken() }, body: JSON.stringify({ seriesId, episodeNumber, rawKey, lockType, coinCost }) });
    log(res);
    if (res.ok) {
        document.getElementById('episodeIdState').textContent = res.data.id;
        localStorage.setItem('episodeId', res.data.id);
    }
}

async function triggerAi() {
    const episodeId = localStorage.getItem('episodeId') || document.getElementById('episodeIdState').textContent;
    const res = await api('/admin/trigger-ai', { method: 'POST', headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + getToken() }, body: JSON.stringify({ episodeId }) });
    log(res);
    if (res.ok) {
        document.getElementById('jobIdState').textContent = res.data.id;
        localStorage.setItem('jobId', res.data.id);
    } else {
        alert('Trigger AI failed: ' + (res.data.error || 'unknown') + (res.data.hint ? (' | ' + res.data.hint) : ''));
    }
}

async function publish() {
    const episodeId = localStorage.getItem('episodeId') || document.getElementById('episodeIdState').textContent;
    const res = await api('/admin/episodes/' + episodeId + '/publish', { method: 'POST', headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + getToken() }, body: JSON.stringify({ published: true }) });
    log(res);
    if (!res.ok) alert('Publish failed: ' + (res.data.error || 'unknown') + (res.data.episodeStatus ? (' (episodeStatus=' + res.data.episodeStatus + ', jobStatus=' + res.data.jobStatus + ')') : ''));
}

async function refreshStatus() {
    const episodeId = localStorage.getItem('episodeId') || document.getElementById('episodeIdState').textContent;
    if (!episodeId || episodeId === '-') return alert('No episodeId yet');
    const res = await api('/admin/episodes/' + episodeId + '/status', { headers: { 'authorization': 'Bearer ' + getToken() } });
    log(res);
    if (res.ok) {
        const j = res.data.job;
        alert(
            'Episode: ' + res.data.episode.status +
            (j ? (' | Job: ' + j.status + ' | ' + (j.progressPct ?? 0) + '% | stage=' + (j.stage || '-') + ' |hb=' + (j.lastHeartbeat || '-')) : '')
        );
    }
}

async function retryAi() {
    const episodeId = localStorage.getItem('episodeId') || document.getElementById('episodeIdState').textContent;
    if (!episodeId || episodeId === '-') return alert('No episodeId yet');
    const res = await api('/admin/episodes/' + episodeId + '/retry-ai', { method: 'POST', headers: { 'authorization': 'Bearer ' + getToken() } });
    log(res);
    if (res.ok) alert('Requeued AI job: ' + res.data.id);
}

async function seedDemo() {
    const seriesId = localStorage.getItem('seriesId') || document.getElementById('seriesIdState').textContent;
    if (!seriesId || seriesId === '-') return alert('No seriesId yet');
    const totalEpisodes = Number(document.getElementById('seedTotal').value || 10);
    const freeEpisodes = Number(document.getElementById('seedFree').value || 4);
    const coinCost = Number(document.getElementById('seedCoinCost').value || 5);
    const res = await api('/admin/series/' + seriesId + '/seed-demo', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + getToken() },
        body: JSON.stringify({ totalEpisodes, freeEpisodes, coinCost })
    });
    log(res);
    if (!res.ok) return alert('Seed failed: ' + (res.data.error || res.status) + (res.data.hint ? (' | ' + res.data.hint) : ''));
    alert('Seeded episodes. Created=' + res.data.created + ' Updated=' + res.data.updated);
}
