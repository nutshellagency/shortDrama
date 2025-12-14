export function adminHtml() {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ShortDrama Admin (POC)</title>
    <link rel="stylesheet" href="/public/css/style.css">
    <link rel="stylesheet" href="/public/css/admin.css">
  </head>
  <body>
    <h2>ShortDrama Admin (Local POC)</h2>
    <p>Simple flow: Login → Upload video → Set episode rules → Generate episodes → Open viewer.</p>
    <div class="row">
      <div class="card">
        <h3>1) Admin Login</h3>
        <input id="email" placeholder="email" value="admin@local" />
        <input id="password" placeholder="password" value="admin" type="password" />
        <button onclick="adminLogin()">Login</button>
        <div>Token: <code id="tokenState">not logged in</code></div>
      </div>

      <div class="card">
        <h3>2) Upload Video</h3>
        <input type="file" id="rawFile" accept="video/*" />
        <button onclick="uploadRaw()">Upload to Storage</button>
        <div>Raw key: <code id="rawKeyState">-</code></div>
        <div style="opacity:0.85; font-size: 12px; margin-top: 6px;">
          Tip: If you see ~1MB, the upload was truncated. Re-upload (API now allows large files).
        </div>
      </div>

      <div class="card">
        <h3>Import from URL</h3>
        <input id="videoUrl" placeholder="Enter video URL" />
        <button onclick="importVideo()">Import and Create Episodes</button>
      </div>
      
      <div class="card">
        <h3>3) Episode Rules</h3>
        <input id="seriesTitle" placeholder="Series title" value="Demo Series" />
        <input id="seriesLang" placeholder="Language (hi/ur)" value="ur" />
        <input id="autoEpSec" type="number" value="180" placeholder="Episode length in seconds (default 180)" />
        <input id="autoFree" type="number" value="3" placeholder="Free episodes (default 3)" />
        <input id="autoCoinCost" type="number" value="5" placeholder="Coin cost for COINS-locked episodes" />
        <button onclick="generateEpisodes()">Generate Episodes (Auto)</button>
        <div>Series ID: <code id="seriesIdState">-</code></div>
        <div>Job ID: <code id="jobIdState">-</code></div>
        <div>Status: <code id="jobState">-</code></div>
        <button onclick="loadEpisodes()">Refresh Episodes List</button>
        <button onclick="window.open('/app','_blank')">Open Viewer</button>
        <pre id="episodes"></pre>
      </div>
    </div>

    <details style="margin-top: 18px;">
      <summary style="cursor:pointer;">Advanced (optional)</summary>
      <p style="opacity:0.85;">Manual episode creation/AI controls are kept for debugging, but you shouldn’t need them for normal POC use.</p>
      <div class="row">
        <div class="card">
          <h3>Manual Episode (single)</h3>
          <input id="episodeNumber" type="number" value="1" />
          <select id="lockType">
            <option value="FREE">FREE</option>
            <option value="AD">AD</option>
            <option value="COINS">COINS</option>
          </select>
          <input id="coinCost" type="number" value="5" />
          <button onclick="createEpisode()">Create Episode</button>
          <button onclick="triggerAi()">Trigger AI</button>
          <div>Episode ID: <code id="episodeIdState">-</code></div>
        </div>

        <div class="card">
          <h3>Publish + Status</h3>
          <button onclick="publish()">Publish Episode</button>
          <button onclick="refreshStatus()">Refresh Status</button>
          <button onclick="retryAi()">Retry AI (Requeue)</button>
        </div>
      </div>
    </details>

    <h3>Debug</h3>
    <pre id="log"></pre>

    <script src="/public/js/admin.js"></script>
    <script>
        async function importVideo() {
            const url = document.getElementById('videoUrl').value;
            if (!url) return alert('Please enter a video URL');

            const seriesTitle = document.getElementById('seriesTitle').value || 'Demo Series';
            const language = document.getElementById('seriesLang').value || 'ur';
            const episodeDurationSec = Number(document.getElementById('autoEpSec').value || 180);
            const freeEpisodes = Number(document.getElementById('autoFree').value || 3);
            const defaultCoinCost = Number(document.getElementById('autoCoinCost').value || 5);

            const res = await api('/admin/import-from-url', {
                method: 'POST',
                headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + getToken() },
                body: JSON.stringify({ url, seriesTitle, language, episodeDurationSec, freeEpisodes, defaultCoinCost })
            });

            log(res);
            if (!res.ok) return alert('Import failed: ' + (res.data.error || res.status));

            document.getElementById('jobIdState').textContent = res.data.jobId;
            localStorage.setItem('jobId', res.data.jobId);
            pollJob();
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
                    <div class="unlock-subtitle">Watch an ad or use coins to continue</div>
                    
                    <button class="unlock-btn ad" id="btn-unlock-ad">
                        <span>Watch Ad</span>
                        <span>Free</span>
                    </button>
                    
                    <button class="unlock-btn coins" id="btn-unlock-coins">
                        <span>Use Coins</span>
                        <span><span id="modal-cost">5</span> 🟡</span>
                    </button>
                    
                    <button class="btn" style="width:100%; margin-top:10px; background:transparent; border:1px solid #333;" id="btn-unlock-cancel">Cancel</button>
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


