// public/js/landing.js
// Shared JS for all public-facing Kuizu pages

// ============================================
// 1. NAVBAR — Scroll effect + Hamburger Menu
// ============================================
(function() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobileNav');

    // Scroll effect: transparent → solid
    function onScroll() {
        if (!navbar) return;
        if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            // Only remove if navbar doesn't already have 'scrolled' forced (inner pages)
            if (!navbar.dataset.alwaysScrolled) {
                navbar.classList.remove('scrolled');
            }
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // Run once on load

    // Hamburger toggle
    if (hamburger && mobileNav) {
        hamburger.addEventListener('click', () => {
            const isOpen = mobileNav.classList.toggle('open');
            hamburger.setAttribute('aria-expanded', isOpen);

            // Animate hamburger into X
            const spans = hamburger.querySelectorAll('span');
            if (isOpen) {
                spans[0].style.transform = 'translateY(7px) rotate(45deg)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
            } else {
                spans[0].style.transform = '';
                spans[1].style.opacity = '';
                spans[2].style.transform = '';
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) {
                mobileNav.classList.remove('open');
                hamburger.querySelectorAll('span').forEach(s => {
                    s.style.transform = '';
                    s.style.opacity = '';
                });
            }
        });

        // Close on link click
        mobileNav.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                mobileNav.classList.remove('open');
            });
        });
    }

    // ============================================
    // 2. SCROLL ANIMATIONS (Intersection Observer)
    // ============================================
    const animatedEls = document.querySelectorAll('.kz-animate');

    if (animatedEls.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target); // Animate once
                }
            });
        }, {
            threshold: 0.12,
            rootMargin: '0px 0px -40px 0px'
        });

        animatedEls.forEach(el => observer.observe(el));
    }

    // ============================================
    // 3. SMOOTH SCROLL for anchor links
    // ============================================
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const target = document.querySelector(a.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ============================================
    // 4. QUIZ MOCKUP CARD — Animated cycling
    // (Landing page only)
    // ============================================
    const mockupCard = document.querySelector('.quiz-mockup-card');
    if (mockupCard) {
        const questions = [
            { q: "Which programming language is known as the 'snake'? 🐍", opts: ["Python", "Cobra", "Java", "Viper"], correct: 0 },
            { q: "What is the chemical symbol for Gold? ⚗️", opts: ["Ag", "Au", "Fe", "Pb"], correct: 1 },
            { q: "How many sides does a hexagon have? 🔷", opts: ["5", "6", "8", "10"], correct: 1 },
            { q: "Who painted the Mona Lisa? 🎨", opts: ["Van Gogh", "Picasso", "Da Vinci", "Monet"], correct: 2 },
        ];

        let qIndex = 0;
        const qEl   = mockupCard.querySelector('.qm-question');
        const optEls = mockupCard.querySelectorAll('.qm-opt');

        function cycleQuestion() {
            const curr = questions[qIndex % questions.length];
            qIndex++;

            // Fade out
            mockupCard.style.opacity = '0.5';
            mockupCard.style.transition = 'opacity 0.4s';

            setTimeout(() => {
                // Update content
                if (qEl) qEl.textContent = curr.q;
                optEls.forEach((el, i) => {
                    el.textContent = curr.opts[i];
                    el.className = 'qm-opt';
                    if (i === curr.correct) el.classList.add('correct');
                });
                // Fade back in
                mockupCard.style.opacity = '1';
            }, 400);
        }

        // Cycle every 4s after initial render
        setInterval(cycleQuestion, 4000);
    }

    // ============================================
    // 5. AUTH STATE CHECK — If logged in, update nav
    // ============================================
    const token = localStorage.getItem('token');
    if (token) {
        // Replace Login/Register buttons with "Play Now" + "My Rank"
        const navActions = document.querySelector('.kz-nav-actions');
        if (navActions) {
            navActions.innerHTML = `
                <a href="leaderboard.html" class="kz-btn kz-btn-ghost kz-btn-sm">🏆 My Rank</a>
                <a href="app.html" class="kz-btn kz-btn-primary kz-btn-sm">🎮 Play Now</a>
            `;
        }
        // Update mobile nav
        const mobileNavEl = document.getElementById('mobileNav');
        if (mobileNavEl) {
            const lastHr = mobileNavEl.querySelector('hr');
            if (lastHr) {
                lastHr.nextElementSibling && (lastHr.nextElementSibling.remove());
                lastHr.nextElementSibling && (lastHr.nextElementSibling.remove());
                const playLink = document.createElement('a');
                playLink.href = 'app.html';
                playLink.style.cssText = 'background:var(--gradient-primary);color:#fff;text-align:center;border-radius:var(--radius-pill);';
                playLink.textContent = '🎮 Play Now';
                lastHr.after(playLink);
            }
        }
    }

})();

// ============================================
// 6. LEADERBOARD FILTER HELPER (leaderboard.html)
// ============================================
window.setFilter = function(btn, filter) {
    document.querySelectorAll('.lb-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (window.applyLeaderboardFilter) {
        window.applyLeaderboardFilter(filter);
    }
};
