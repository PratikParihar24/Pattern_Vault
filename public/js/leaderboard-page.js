// public/js/leaderboard-page.js
// Fetches and renders the global leaderboard

(async function() {
    const isAuth = document.cookie.includes('isAuthenticated=true');

    // ============================================================
    // 1. FETCH LEADERBOARD DATA
    // ============================================================
    let players = [];
    try {
        const res = await fetch('/api/leaderboard', { credentials: 'include' });
        if (res.ok) {
            players = await res.json();
        }
    } catch (err) {
        console.error('Failed to load leaderboard:', err);
    }

    // ============================================================
    // 2. FETCH MY RANK (if logged in)
    // ============================================================
    if (isAuth) {
        try {
            const rankRes = await fetch('/api/leaderboard/my-rank', {
                credentials: 'include'
            });
            if (rankRes.ok) {
                const myData = await rankRes.json();
                const banner = document.getElementById('myRankBanner');
                const loginCta = document.getElementById('loginCta');

                if (banner) {
                    banner.style.display = 'flex';
                    document.getElementById('myDisplayName').textContent = myData.displayName;
                    document.getElementById('myRankNum').textContent = myData.rank === 1 ? '🥇 #1' : `#${myData.rank}`;
                    document.getElementById('myHighScore').textContent = myData.highScore;
                    document.getElementById('myGames').textContent = myData.totalGamesPlayed;
                }
                if (loginCta) loginCta.style.display = 'none';
            }
        } catch (err) {
            console.warn('Could not fetch rank:', err);
            showLoginCta();
        }
    } else {
        showLoginCta();
    }

    function showLoginCta() {
        const cta = document.getElementById('loginCta');
        if (cta) cta.style.display = 'block';
    }

    // ============================================================
    // 3. RENDER PODIUM (Top 3)
    // ============================================================
    const podiumEl = document.getElementById('podium');
    if (podiumEl) {
        if (players.length === 0) {
            podiumEl.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:40px;">No players yet. Be the first! 🚀</div>`;
        } else {
            // Order: 2nd, 1st, 3rd (for visual layout)
            const top = [players[1] || null, players[0] || null, players[2] || null];
            const rankClasses = ['rank-2', 'rank-1', 'rank-3'];
            const rankLabels  = ['2', '1', '3'];
            const rankEmojis  = ['🥈', '🥇', '🥉'];
            const baseHeights = ['60px', '80px', '50px'];

            podiumEl.innerHTML = top.map((p, i) => {
                if (!p) return '';
                const initials = (p.displayName || '?').slice(0, 2).toUpperCase();
                return `
                    <div class="kz-podium-item ${rankClasses[i]}">
                        <div style="font-size:1.4rem; margin-bottom:6px;">${rankEmojis[i]}</div>
                        <div class="kz-podium-avatar">${initials}</div>
                        <div class="kz-podium-name">${escHtml(p.displayName)}</div>
                        <div class="kz-podium-score">${p.highScore} pts</div>
                        <div class="kz-podium-base" style="height:${baseHeights[i]}">${rankLabels[i]}</div>
                    </div>
                `;
            }).join('');
        }
    }

    // ============================================================
    // 4. RENDER FULL LIST
    // ============================================================
    let fullData = players;

    window.applyLeaderboardFilter = function(filter) {
        const data = filter === 'top10' ? players.slice(0, 10) : players;
        renderList(data);
    };

    function renderList(data) {
        const listEl = document.getElementById('lbList');
        if (!listEl) return;

        if (data.length === 0) {
            listEl.innerHTML = `
                <div class="lb-empty">
                    <div class="lb-empty-icon">🏆</div>
                    <p>No players on the leaderboard yet.</p>
                    <a href="register.html" class="kz-btn kz-btn-primary" style="margin-top:16px;display:inline-flex;">Be the first!</a>
                </div>
            `;
            return;
        }

        // Determine current user's ID (decode JWT)
        let myName = null;
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                // We'll match by rank banner name instead
                myName = document.getElementById('myDisplayName')?.textContent;
            } catch(e) {}
        }

        let currentRank = 1;
        let prevScore = null;

        listEl.innerHTML = data.map((p, i) => {
            if (p.highScore !== prevScore) {
                currentRank = i + 1;
                prevScore = p.highScore;
            }
            const rank = currentRank;
            const isTop3 = rank <= 3;
            const rankDisplay = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
            const initials = (p.displayName || '?').slice(0, 2).toUpperCase();
            const isYou = myName && p.displayName === myName;
            const youBadge = isYou ? `<span class="kz-badge kz-badge-primary" style="margin-left:8px;">You</span>` : '';

            return `
                <div class="kz-leaderboard-row ${isYou ? 'is-you' : ''}" style="animation: kz-fade-up 0.4s ${i * 0.05}s both;">
                    <div class="kz-rank-num ${isTop3 ? 'top-3' : ''}">${rankDisplay}</div>
                    <div class="kz-player-info">
                        <div class="kz-player-avatar">${initials}</div>
                        <div>
                            <div class="kz-player-name">${escHtml(p.displayName)}${youBadge}</div>
                            <div class="kz-player-games">${p.totalGamesPlayed || 0} games played</div>
                        </div>
                    </div>
                    <div>
                        <div class="kz-score-display">${p.highScore} pts</div>
                        <div class="kz-score-xp">Best Score</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderList(fullData);

    // ============================================================
    // 5. UTILITIES
    // ============================================================
    function escHtml(str) {
        if (!str) return '';
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

})();
