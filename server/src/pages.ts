export function adminHtml() {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ShortDrama Admin</title>
    <style>
      :root { --bg: #0d1117; --card: #161b22; --border: #30363d; --text: #c9d1d9; --accent: #58a6ff; --green: #3fb950; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 24px; }
      h1 { font-size: 1.5rem; margin-bottom: 8px; }
      .container { max-width: 500px; width: 100%; }
      .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
      .card h2 { font-size: 1.1rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
      .card h2 .step { background: var(--accent); color: #000; font-size: 0.75rem; padding: 2px 8px; border-radius: 10px; }
      label { display: block; font-size: 0.85rem; margin-bottom: 4px; opacity: 0.8; }
      input, select { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); margin-bottom: 12px; font-size: 0.95rem; }
      input:focus, select:focus { outline: none; border-color: var(--accent); }
      .row { display: flex; gap: 12px; }
      .row > * { flex: 1; }
      .btn { width: 100%; padding: 12px; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
      .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .btn-primary { background: var(--accent); color: #000; }
      .btn-secondary { background: var(--border); color: var(--text); }
      .source-toggle { display: flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
      .source-toggle button { flex: 1; padding: 10px; background: transparent; border: none; color: var(--text); cursor: pointer; font-size: 0.9rem; }
      .source-toggle button.active { background: var(--accent); color: #000; font-weight: 600; }
      .progress-container { background: var(--bg); border-radius: 8px; height: 24px; overflow: hidden; position: relative; margin-bottom: 8px; }
      .progress-bar { height: 100%; background: linear-gradient(90deg, var(--green), var(--accent)); width: 0%; transition: width 0.3s; }
      .progress-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600; }
      .status-text { font-size: 0.85rem; text-align: center; opacity: 0.8; margin-bottom: 12px; }
      .hidden { display: none !important; }
      .login-section { text-align: center; }
      .login-section input { max-width: 280px; margin: 0 auto 12px; display: block; }
      .episodes-list { max-height: 200px; overflow-y: auto; font-size: 0.8rem; background: var(--bg); padding: 10px; border-radius: 8px; margin-top: 12px; }
      .episodes-list div { padding: 4px 0; border-bottom: 1px solid var(--border); }
      .episodes-list div:last-child { border: none; }
      .ep-free { color: var(--green); }
      .ep-coins { color: #f0b429; }
      /* Series Table */
      .series-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 12px; }
      .series-table th, .series-table td { padding: 10px 8px; text-align: left; border-bottom: 1px solid var(--border); }
      .series-table th { opacity: 0.7; font-weight: 500; }
      .series-table tr:hover { background: rgba(255,255,255,0.03); }
      .btn-sm { padding: 6px 12px; font-size: 0.8rem; width: auto; border-radius: 6px; }
      .btn-danger { background: #da3633; color: #fff; }
      .btn-edit { background: var(--accent); color: #000; }
      .actions { display: flex; gap: 6px; }
      /* Modal */
      .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; }
      .modal { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; }
      .modal h3 { margin-bottom: 16px; }
      .wide-container { max-width: 900px; }
    </style>
  </head>
  <body>
    <h1>🎬 ShortDrama Admin</h1>
    <div class="container">

      <!-- Login Section -->
      <div id="login-section" class="card login-section">
        <h2>Admin Login</h2>
        <input id="email" placeholder="Email" value="admin@local" />
        <input id="password" placeholder="Password" type="password" value="admin" />
        <button class="btn btn-primary" onclick="doLogin()">Login</button>
        <p id="login-error" style="color:#f85149; margin-top:8px;"></p>
      </div>

      <!-- Main Wizard (hidden until logged in) -->
      <div id="wizard" class="hidden">

        <div class="card">
          <h2><span class="step">1</span> Series Details</h2>
          <label>Title</label>
          <input id="seriesTitle" placeholder="My Drama Series" />
          <div class="row">
            <div><label>Language</label><input id="seriesLang" value="ur" /></div>
          </div>
        </div>

        <div class="card">
          <h2><span class="step">2</span> Video Source</h2>
          <div class="source-toggle">
            <button id="src-file-btn" class="active" onclick="setSource('file')">📁 Upload File</button>
            <button id="src-url-btn" onclick="setSource('url')">🔗 Paste URL</button>
          </div>
          <div id="source-file">
            <input type="file" id="videoFile" accept="video/*" />
          </div>
          <div id="source-url" class="hidden">
            <input id="videoUrl" placeholder="https://youtube.com/watch?v=..." />
          </div>
        </div>

        <div class="card">
          <h2><span class="step">3</span> Episode Settings</h2>
          <div class="row">
            <div><label>Episode Length (sec)</label><input id="epDuration" type="number" value="120" /></div>
            <div><label>Max Episodes</label><input id="maxEps" type="number" value="3" /></div>
          </div>
          <div class="row">
            <div><label>Free Episodes</label><input id="freeEps" type="number" value="2" /></div>
            <div><label>Coin Cost</label><input id="coinCost" type="number" value="5" /></div>
          </div>
        </div>

        <div class="card" id="action-card">
          <button class="btn btn-primary" id="btn-process" onclick="startProcess()">🚀 Create & Process Series</button>
        </div>

        <!-- Progress Section (shown during processing) -->
        <div class="card hidden" id="progress-section">
          <h2>Processing...</h2>
          <div class="progress-container">
            <div class="progress-bar" id="progress-bar"></div>
            <div class="progress-text" id="progress-pct">0%</div>
          </div>
          <div class="status-text" id="status-text">Initializing...</div>
          <button class="btn btn-secondary" onclick="window.open('http://localhost:3001','_blank')">Open Viewer App</button>
          <div id="episodes-container" class="hidden">
            <div class="episodes-list" id="episodes-list"></div>
          </div>
        </div>

        <!-- Sync Dashboard -->
        <div class="card">
          <h2>🌍 Live Synchronization</h2>
          <div style="display: flex; gap: 10px; margin-bottom: 12px;">
            <button class="btn btn-primary" onclick="syncPush()" id="btn-sync-push">🚀 Push Local to Live</button>
            <button class="btn btn-secondary" onclick="syncPull()" id="btn-sync-pull">📥 Pull Live to Local</button>
          </div>
          <div id="sync-status" class="status-text" style="text-align: left; font-family: monospace; font-size: 0.75rem; background: #000; padding: 10px; border-radius: 8px; max-height: 150px; overflow-y: auto; display: none;"></div>
        </div>

        <!-- Series Management Table -->
        <div class="card">
          <h2>📋 Manage Series</h2>
          <button class="btn btn-secondary" onclick="loadSeriesList()" style="margin-bottom:12px;">Refresh List</button>
          <div style="overflow-x:auto;">
            <table class="series-table" id="series-table">
              <thead><tr><th>Title</th><th>Lang</th><th>Episodes</th><th>Free</th><th>Cost</th><th>Actions</th></tr></thead>
              <tbody id="series-tbody"><tr><td colspan="6" style="opacity:0.5;">Click Refresh to load...</td></tr></tbody>
            </table>
          </div>
        </div>

      </div>
    </div>

    <!-- Edit Modal -->
    <div id="edit-modal" class="modal-overlay hidden">
      <div class="modal">
        <h3>Edit Series</h3>
        <input type="hidden" id="edit-id" />
        <label>Title</label><input id="edit-title" />
        <label>Language</label><input id="edit-lang" />
        <div class="row">
          <div><label>Free Episodes</label><input id="edit-free" type="number" /></div>
          <div><label>Coin Cost</label><input id="edit-cost" type="number" /></div>
        </div>
        <div class="row" style="margin-top:12px;">
          <button class="btn btn-primary" onclick="saveEdit()">Save</button>
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        </div>
      </div>
    </div>

    <script>
      const API = (path, opts = {}) => fetch(path, opts).then(async r => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }));
      const getToken = () => localStorage.getItem('adminToken');
      const setToken = t => localStorage.setItem('adminToken', t);
      let sourceMode = 'file';
      let currentJobId = null;

      // Check if already logged in
      if (getToken()) showWizard();

      function showWizard() {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('wizard').classList.remove('hidden');
      }

      async function doLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const res = await API('/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
        if (res.ok) { setToken(res.data.token); showWizard(); }
        else { document.getElementById('login-error').textContent = 'Invalid credentials'; }
      }

      function setSource(mode) {
        sourceMode = mode;
        document.getElementById('src-file-btn').classList.toggle('active', mode === 'file');
        document.getElementById('src-url-btn').classList.toggle('active', mode === 'url');
        document.getElementById('source-file').classList.toggle('hidden', mode !== 'file');
        document.getElementById('source-url').classList.toggle('hidden', mode !== 'url');
      }

      async function startProcess() {
        const title = document.getElementById('seriesTitle').value || 'Untitled Series';
        const language = document.getElementById('seriesLang').value || 'ur';
        const epDuration = Number(document.getElementById('epDuration').value) || 120;
        const maxEps = Number(document.getElementById('maxEps').value) || 3;
        const freeEps = Number(document.getElementById('freeEps').value) || 2;
        const coinCost = Number(document.getElementById('coinCost').value) || 5;

        document.getElementById('btn-process').disabled = true;
        document.getElementById('action-card').classList.add('hidden');
        document.getElementById('progress-section').classList.remove('hidden');
        updateProgress(0, 'Starting...');

        try {
          let rawKey = '';

          if (sourceMode === 'file') {
            const file = document.getElementById('videoFile').files[0];
            if (!file) { alert('Please select a video file'); resetUI(); return; }
            updateProgress(5, 'Uploading video...');
            const fd = new FormData(); fd.append('file', file, file.name);
            const uploadRes = await fetch('/admin/upload-file', { method: 'POST', headers: { 'authorization': 'Bearer ' + getToken() }, body: fd });
            const uploadData = await uploadRes.json();
            if (!uploadRes.ok) { alert('Upload failed: ' + (uploadData.error || uploadRes.status)); resetUI(); return; }
            rawKey = uploadData.key;
            updateProgress(20, 'Upload complete. Creating series...');
          } else {
            rawKey = document.getElementById('videoUrl').value.trim();
            if (!rawKey) { alert('Please enter a video URL'); resetUI(); return; }
            updateProgress(10, 'Creating series...');
          }

          // Create series
          const seriesRes = await API('/admin/series', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + getToken() },
            body: JSON.stringify({ title, language, genres: [], description: '', freeEpisodes: freeEps, episodeDurationSec: epDuration, defaultCoinCost: coinCost, maxEpisodes: maxEps })
          });
          if (!seriesRes.ok) { alert('Create series failed: ' + (seriesRes.data.error || seriesRes.status)); resetUI(); return; }
          const seriesId = seriesRes.data.id;
          updateProgress(25, 'Series created. Starting AI processing...');

          // Start auto-split job
          const splitRes = await API('/admin/series/' + seriesId + '/auto-split', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + getToken() },
            body: JSON.stringify({ rawKey, episodeDurationSec: epDuration, freeEpisodes: freeEps, defaultCoinCost: coinCost, maxEpisodes: maxEps })
          });
          if (!splitRes.ok) { alert('Start processing failed: ' + (splitRes.data.error || splitRes.status) + (splitRes.data.hint ? ' - ' + splitRes.data.hint : '')); resetUI(); return; }
          currentJobId = splitRes.data.jobId;
          localStorage.setItem('seriesId', seriesId);
          updateProgress(30, 'Job queued. Waiting for worker...');
          pollJob(seriesId);

        } catch (err) {
          alert('Error: ' + err.message);
          resetUI();
        }
      }

      async function pollJob(seriesId) {
        if (!currentJobId) return;
        try {
          const res = await API('/admin/jobs/' + currentJobId + '/status', { headers: { 'authorization': 'Bearer ' + getToken() } });
          if (!res.ok) { setTimeout(() => pollJob(seriesId), 2000); return; }
          const job = res.data.job;
          const pct = Math.max(30, Math.min(99, 30 + (job.progressPct || 0) * 0.7));
          updateProgress(pct, job.stage || 'Processing...');

          if (job.status === 'SUCCEEDED') {
            updateProgress(100, 'Done! Episodes are ready.');
            loadEpisodes(seriesId);
            return;
          }
          if (job.status === 'FAILED') {
            updateProgress(0, 'Job failed: ' + (job.error || 'Unknown error'));
            return;
          }
          setTimeout(() => pollJob(seriesId), 1500);
        } catch (e) {
          setTimeout(() => pollJob(seriesId), 2000);
        }
      }

      async function loadEpisodes(seriesId) {
        const res = await API('/admin/series/' + seriesId + '/episodes', { headers: { 'authorization': 'Bearer ' + getToken() } });
        if (!res.ok) return;
        const eps = res.data.episodes || [];
        const container = document.getElementById('episodes-container');
        const list = document.getElementById('episodes-list');
        container.classList.remove('hidden');
        list.innerHTML = eps.map(e => {
          const lockClass = e.lockType === 'FREE' ? 'ep-free' : 'ep-coins';
          return '<div><span class="' + lockClass + '">Ep ' + e.episodeNumber + '</span> · ' + e.status + ' · ' + (e.durationSec || '-') + 's</div>';
        }).join('');
      }

      function updateProgress(pct, text) {
        document.getElementById('progress-bar').style.width = pct + '%';
        document.getElementById('progress-pct').textContent = Math.round(pct) + '%';
        document.getElementById('status-text').textContent = text;
      }

      function resetUI() {
        document.getElementById('btn-process').disabled = false;
        document.getElementById('action-card').classList.remove('hidden');
        document.getElementById('progress-section').classList.add('hidden');
      }

      // Series Management Functions
      async function loadSeriesList() {
        const res = await API('/admin/series', { headers: { 'authorization': 'Bearer ' + getToken() } });
        if (!res.ok) { alert('Failed to load series'); return; }
        const tbody = document.getElementById('series-tbody');
        const series = res.data.series || [];
        if (series.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="opacity:0.5;">No series found</td></tr>';
          return;
        }
        tbody.innerHTML = series.map(s => \`
          <tr>
            <td>\${s.title}</td>
            <td>\${s.language}</td>
            <td>\${s.publishedEpisodes}/\${s.totalEpisodes}</td>
            <td>\${s.freeEpisodes}</td>
            <td>\${s.defaultCoinCost}</td>
            <td class="actions">
              <button class="btn btn-sm btn-edit" onclick="editSeries('\${s.id}','\${s.title.replace(/'/g,"\\\\'")}','\${s.language}',\${s.freeEpisodes},\${s.defaultCoinCost})">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="deleteSeries('\${s.id}','\${s.title.replace(/'/g,"\\\\'")}')">Delete</button>
            </td>
          </tr>
        \`).join('');
      }

      function editSeries(id, title, lang, free, cost) {
        document.getElementById('edit-id').value = id;
        document.getElementById('edit-title').value = title;
        document.getElementById('edit-lang').value = lang;
        document.getElementById('edit-free').value = free;
        document.getElementById('edit-cost').value = cost;
        document.getElementById('edit-modal').classList.remove('hidden');
      }

      function closeModal() {
        document.getElementById('edit-modal').classList.add('hidden');
      }

      async function saveEdit() {
        const id = document.getElementById('edit-id').value;
        const body = {
          title: document.getElementById('edit-title').value,
          language: document.getElementById('edit-lang').value,
          freeEpisodes: Number(document.getElementById('edit-free').value),
          defaultCoinCost: Number(document.getElementById('edit-cost').value)
        };
        const res = await API('/admin/series/' + id, {
          method: 'PUT',
          headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + getToken() },
          body: JSON.stringify(body)
        });
        if (res.ok) {
          closeModal();
          loadSeriesList();
        } else {
          alert('Update failed: ' + (res.data.error || res.status));
        }
      }

      async function deleteSeries(id, title) {
        if (!confirm('Delete "' + title + '" and all its episodes locally? This cannot be undone.\n\nNOTE: To delete from LIVE, run "Push Local to Live" after this deletion.')) return;
        const res = await API('/admin/series/' + id, {
          method: 'DELETE',
          headers: { 'authorization': 'Bearer ' + getToken() }
        });
        if (res.ok) {
          loadSeriesList();
        } else {
          alert('Delete failed: ' + (res.data.error || res.status));
        }
      }

      async function syncPush() {
        const btn = document.getElementById('btn-sync-push');
        const status = document.getElementById('sync-status');
        btn.disabled = true;
        btn.textContent = 'Pushing...';
        status.style.display = 'block';
        status.textContent = 'Starting push to production...';

        const res = await API('/admin/sync/push', { 
            method: 'POST', 
            headers: { 'authorization': 'Bearer ' + getToken() } 
        });
        
        btn.disabled = false;
        btn.textContent = '🚀 Push Local to Live';
        
        if (res.ok) {
            status.innerHTML = '<span style="color:var(--green)">✓ Sync Complete!</span><br><br>' + (res.data.output || '').replace(/\n/g, '<br>');
        } else {
            status.innerHTML = '<span style="color:#f85149">✗ Sync Failed</span><br><br>' + (res.data.error || '') + '<br>' + (res.data.output || '').replace(/\n/g, '<br>');
        }
      }

      async function syncPull() {
        const btn = document.getElementById('btn-sync-pull');
        const status = document.getElementById('sync-status');
        btn.disabled = true;
        btn.textContent = 'Pulling...';
        status.style.display = 'block';
        status.textContent = 'Starting pull from production...';

        const res = await API('/admin/sync/pull', { 
            method: 'POST', 
            headers: { 'authorization': 'Bearer ' + getToken() } 
        });
        
        btn.disabled = false;
        btn.textContent = '📥 Pull Live to Local';
        
        if (res.ok) {
            status.innerHTML = '<span style="color:var(--green)">✓ Pull Complete!</span><br><br>' + (res.data.output || '').replace(/\n/g, '<br>');
            loadSeriesList();
        } else {
            status.innerHTML = '<span style="color:#f85149">✗ Pull Failed</span><br><br>' + (res.data.error || '') + '<br>' + (res.data.output || '').replace(/\n/g, '<br>');
        }
      }
    </script>
  </body>
</html>`;
}

export function appHtml() {
    return `<!doctype html>
<html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <title>ShortDrama</title>
        <link rel="stylesheet" href="/public/css/style.css">
    </head>
    <body class="dark-theme">
        <div id="root">
            <!-- Header -->
            <div class="app-header">
                <div class="app-logo">ShortDrama</div>
                <div class="coin-widget" id="coin-balance">
                    <div class="coin-icon"></div>
                    <span id="header-coins">0</span>
                </div>
            </div>

            <!-- Home Screen -->
            <div id="home-screen" class="screen">
                <div class="filter-scroll">
                    <div class="filter-chip active">Featured</div>
                    <div class="filter-chip">Romance</div>
                    <div class="filter-chip">Revenge</div>
                    <div class="filter-chip">CEO</div>
                    <div class="filter-chip">Historical</div>
                </div>

                <div id="home-content">
                    <!-- Dynamic Content Will Be Injected Here via app.js -->
                    <!-- Skeleton / Loading State -->
                    <div style="height: 400px; display: flex; align-items:center; justify-content:center; opacity:0.5;">
                        Loading...
                    </div>
                </div>
            </div>

            <!-- Player Screen (Hidden by default) -->
            <div id="player-screen" class="screen player-screen hidden">
                <video id="v" playsinline loop></video>

                <!-- Ad Overlay -->
                <div id="ad-overlay" class="ad-overlay hidden">
                    <video id="ad-video" playsinline class="ad-video"></video>
                    <div class="ad-ui">
                        <div class="ad-label">Ad · Reward in progress</div>
                        <div class="ad-timer" id="ad-timer"></div>
                    </div>
                </div>
                
                <!-- Player Controls Overlay -->
                <div class="player-controls" id="player-ui">
                    <div class="controls-top">
                        <button class="btn btn-icon" id="btn-back">←</button>
                        <button class="btn btn-icon">⋮</button>
                    </div>

                    <div class="controls-center">
                        <div class="play-btn-lg hidden" id="play-icon">▶</div>
                    </div>

                    <div class="controls-bottom">
                        <div class="episode-info">
                            <div class="ep-title" id="player-series-title">Series Title</div>
                            <div class="ep-desc" id="player-ep-title">Ep 1: The Beginning</div>
                        </div>
                        
                        <div class="progress-container" id="progress-bar-wrap">
                            <div class="progress-fill" id="progress-fill"></div>
                        </div>
                        
                        <div class="action-row">
                            <button class="btn btn-icon">💬</button>
                            <button class="btn btn-next-ep" id="btn-next-ep">Next Episode ↓</button>
                            <button class="btn btn-icon">🔗</button>
                        </div>
                    </div>
                </div>

                <!-- Unlock Modal -->
                <div class="unlock-modal" id="unlock-modal">
                    <div class="unlock-title">Unlock Episode</div>
                    <div class="unlock-subtitle">Watch an ad to unlock + earn coins!</div>
                    
                    <button class="unlock-btn ad" id="btn-unlock-ad">
                        <span>Watch Ad (+5 🟡)</span>
                        <span>Free</span>
                    </button>
                    
                    <button class="unlock-btn coins" id="btn-unlock-coins">
                        <span>Use Coins</span>
                        <span><span id="modal-cost">5</span> 🟡</span>
                    </button>
                    
                    <button class="btn" style="width:100%; margin-top:10px; background:transparent; border:1px solid #333;" id="btn-unlock-cancel">Cancel</button>
                </div>
            </div>

            <!-- Explore Screen -->
            <div id="explore-screen" class="screen hidden" style="padding-bottom: 80px;">
                <div class="app-header">
                    <div class="app-logo">Explore</div>
                </div>
                <div id="explore-content" class="explore-grid">
                    <!-- Series list will go here -->
                </div>
            </div>

            <!-- Bottom Navigation -->
            <nav class="bottom-nav">
                <button class="nav-item active">
                    <span class="nav-icon">🏠</span>
                    <span>Home</span>
                </button>
                <button class="nav-item">
                    <span class="nav-icon">🔍</span>
                    <span>Explore</span>
                </button>
                <button class="nav-item">
                    <span class="nav-icon">🔖</span>
                    <span>My List</span>
                </button>
                <button class="nav-item">
                    <span class="nav-icon">👤</span>
                    <span>Profile</span>
                </button>
            </nav>

        </div>
        <script src="/public/js/app.js"></script>
    </body>
</html>`;
}


