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
        // Create background overlay for mobile menu
        let navOverlay = document.createElement('div');
        navOverlay.className = 'kz-mobile-overlay';
        document.body.appendChild(navOverlay);

        function toggleMenu(forceClose = false) {
            const isOpen = forceClose ? false : !mobileNav.classList.contains('open');
            if (isOpen) {
                mobileNav.classList.add('open');
                navOverlay.classList.add('open');
                hamburger.setAttribute('aria-expanded', 'true');
            } else {
                mobileNav.classList.remove('open');
                navOverlay.classList.remove('open');
                hamburger.setAttribute('aria-expanded', 'false');
            }

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
        }

        hamburger.addEventListener('click', () => toggleMenu());
        navOverlay.addEventListener('click', () => toggleMenu(true));

        // Close on outside click (if they click something else not covered by overlay somehow)
        document.addEventListener('click', (e) => {
            if (mobileNav.classList.contains('open') && !hamburger.contains(e.target) && !mobileNav.contains(e.target) && !navOverlay.contains(e.target)) {
                toggleMenu(true);
            }
        });

        // Close on link click
        mobileNav.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => toggleMenu(true));
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
    window.handleLogout = async function() {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        sessionStorage.removeItem('patternFailed');
        window.location.reload();
    };

    const isAuth = document.cookie.includes('isAuthenticated=true');
    if (isAuth) {
        // Navbar: Just show "My Profile" to avoid redundant CTAs on the first screen
        const navActions = document.querySelector('.kz-nav-actions');
        if (navActions) {
            navActions.innerHTML = `
                <a href="profile.html" class="kz-btn kz-btn-ghost kz-btn-sm">👤 My Profile</a>
            `;
        }
        // Update mobile nav
        const mobileNavEl = document.getElementById('mobileNav');
        if (mobileNavEl) {
            const lastHr = mobileNavEl.querySelector('hr');
            if (lastHr) {
                // remove existing login/register links
                while(lastHr.nextElementSibling) {
                    lastHr.nextElementSibling.remove();
                }
                const profileLink = document.createElement('a');
                profileLink.href = 'profile.html';
                profileLink.style.cssText = 'color:var(--text-secondary);text-align:center;margin-bottom:8px;';
                profileLink.textContent = '👤 My Profile';

                lastHr.after(profileLink);
            }
        }

        // Hero CTA: "Play Now" (This is the only "Play Now" on the first screen)
        const heroCta = document.querySelector('.hero-cta');
        if (heroCta) {
            heroCta.innerHTML = `
                <a href="app.html" class="kz-btn kz-btn-primary kz-btn-lg">🎮 Play Now</a>
                <a href="how-to-play.html" class="kz-btn kz-btn-ghost kz-btn-lg">How it Works</a>
            `;
        }
        
        // Bottom CTA: "Play Now"
        const bottomCta = document.querySelector('.cta-actions');
        if (bottomCta) {
            bottomCta.innerHTML = `
                <a href="app.html" class="kz-btn kz-btn-primary kz-btn-lg">🎮 Play Now</a>
            `;
        }
        
        // Hide "Simple as 1-2-3" steps if logged in (since they've already registered)
        const stepsSection = document.querySelector('.steps-grid')?.closest('section');
        if (stepsSection) {
            stepsSection.style.display = 'none';
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
