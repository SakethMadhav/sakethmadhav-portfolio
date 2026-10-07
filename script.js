(function () {
  'use strict';

  function initPortfolio() {
    /* ==========================================================================
       1. FOUNDATIONAL SMOOTH-SCROLL HERO ANIMATION
       ========================================================================== */
    const TOTAL_FRAMES = 300;
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    let basePath = 'frames/';
    const images = new Array(TOTAL_FRAMES + 1);
    const loaded = new Array(TOTAL_FRAMES + 1).fill(false);

    let currentFrame = 1;
    let targetFrame = 1;
    let lastRenderedFrame = -1;
    let needsRedraw = true;

    const heroContainer = document.getElementById('hero');
    const heroContent = document.getElementById('hero-content-block');
    const heroScrollIndicator = document.getElementById('hero-scroll-indicator');

    // Formatting index into '001', '002', ..., '300'
    function getFrameFilename(index) {
      const padded = String(index).padStart(3, '0');
      return `${basePath}ezgif-frame-${padded}.jpg`;
    }

    // Set high-DPI canvas dimensions
    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      needsRedraw = true;
    }

    window.addEventListener('resize', resizeCanvas, { passive: true });
    resizeCanvas();

    // Fallback to nearest loaded frame to eliminate any blank flashes
    function getNearestLoadedImage(index) {
      if (loaded[index] && images[index]) return images[index];

      let left = index - 1;
      let right = index + 1;

      while (left >= 1 || right <= TOTAL_FRAMES) {
        if (left >= 1 && loaded[left] && images[left]) {
          return images[left];
        }
        if (right <= TOTAL_FRAMES && loaded[right] && images[right]) {
          return images[right];
        }
        left--;
        right++;
      }
      return null;
    }

    // Render image with object-fit: cover
    function render(frameIndex) {
      const img = getNearestLoadedImage(frameIndex);
      if (!img) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth || 1920;
      const ih = img.naturalHeight || 1080;

      const scale = Math.max(cw / iw, ch / ih);
      const sw = iw * scale;
      const sh = ih * scale;
      const sx = (cw - sw) / 2;
      const sy = (ch - sh) / 2;

      ctx.drawImage(img, 0, 0, iw, ih, sx, sy, sw, sh);
    }

    // Calculate scroll progress within hero section
    function updateHeroScroll() {
      if (!heroContainer) return;
      const rect = heroContainer.getBoundingClientRect();
      const totalScrollable = heroContainer.offsetHeight - window.innerHeight;
      if (totalScrollable <= 0) return;

      const currentScroll = -rect.top;
      const progress = Math.max(0, Math.min(1, currentScroll / totalScrollable));

      targetFrame = 1 + progress * (TOTAL_FRAMES - 1);

      // Hero Content Parallax & Fade
      if (heroContent) {
        if (progress < 0.12) {
          heroContent.style.opacity = '1';
          heroContent.style.transform = 'translateY(0px)';
          heroContent.style.pointerEvents = 'auto';
        } else if (progress < 0.6) {
          const fadeRatio = (progress - 0.12) / 0.48;
          heroContent.style.opacity = String(Math.max(0, 1 - fadeRatio * 1.4));
          heroContent.style.transform = `translateY(-${fadeRatio * 45}px)`;
          heroContent.style.pointerEvents = fadeRatio > 0.8 ? 'none' : 'auto';
        } else {
          heroContent.style.opacity = '0';
          heroContent.style.pointerEvents = 'none';
        }
      }

      if (heroScrollIndicator) {
        heroScrollIndicator.style.opacity = progress > 0.04 ? '0' : '1';
      }
    }

    window.addEventListener('scroll', updateHeroScroll, { passive: true });

    // Smooth LERP loop (60fps / 120fps)
    const LERP_FACTOR = 0.085;

    function tick() {
      const delta = targetFrame - currentFrame;
      if (Math.abs(delta) > 0.001) {
        currentFrame += delta * LERP_FACTOR;
      } else {
        currentFrame = targetFrame;
      }

      const frameIndex = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(currentFrame)));
      if (frameIndex !== lastRenderedFrame || needsRedraw) {
        render(frameIndex);
        lastRenderedFrame = frameIndex;
        needsRedraw = false;
      }

      requestAnimationFrame(tick);
    }

    // Image loader helper
    function loadImage(index) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          images[index] = img;
          loaded[index] = true;
          if (index === 1 && lastRenderedFrame === -1) {
            needsRedraw = true;
          }
          resolve(img);
        };
        img.onerror = () => {
          resolve(null);
        };
        img.src = getFrameFilename(index);
      });
    }

    // Concurrent preloader
    async function preloadAllFrames() {
      // 1. Path detection: test 'frames/' vs root './'
      const testImg = new Image();
      const loadedInFramesDir = await new Promise((res) => {
        testImg.onload = () => res(true);
        testImg.onerror = () => res(false);
        testImg.src = getFrameFilename(1);
      });

      if (loadedInFramesDir) {
        images[1] = testImg;
        loaded[1] = true;
        needsRedraw = true;
      } else {
        basePath = ''; // fallback to root
        await loadImage(1);
        needsRedraw = true;
      }

      // 2. Preload remaining frames concurrently
      const queue = [];
      for (let i = 2; i <= TOTAL_FRAMES; i++) {
        queue.push(i);
      }

      const CONCURRENCY = 8;
      function next() {
        if (queue.length === 0) return;
        const idx = queue.shift();
        loadImage(idx).then(() => {
          if (Math.round(currentFrame) === idx) {
            needsRedraw = true;
          }
          next();
        });
      }

      for (let c = 0; c < CONCURRENCY; c++) {
        next();
      }
    }

    preloadAllFrames();
    updateHeroScroll();
    requestAnimationFrame(tick);

    /* ==========================================================================
       2. STICKY HEADER & SCROLL SPY
       ========================================================================== */
    const siteHeader = document.getElementById('site-header');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id], header[id]');

    function onWindowScroll() {
      // Navbar shrunk background
      if (window.scrollY > 40) {
        siteHeader.classList.add('scrolled');
      } else {
        siteHeader.classList.remove('scrolled');
      }

      // Scroll Spy
      let currentSectionId = '';
      const scrollPosition = window.scrollY + 200;

      sections.forEach((section) => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        if (scrollPosition >= top && scrollPosition < top + height) {
          currentSectionId = section.getAttribute('id');
        }
      });

      navLinks.forEach((link) => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSectionId}`) {
          link.classList.add('active');
        }
      });
    }

    window.addEventListener('scroll', onWindowScroll, { passive: true });

    // Mobile Hamburger Toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const siteNav = document.getElementById('site-nav');
    if (mobileBtn && siteNav) {
      mobileBtn.addEventListener('click', () => {
        const isOpen = siteNav.classList.toggle('open');
        mobileBtn.setAttribute('aria-expanded', String(isOpen));
      });

      // Close menu on link click
      navLinks.forEach((link) => {
        link.addEventListener('click', () => {
          siteNav.classList.remove('open');
          mobileBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }

    /* ==========================================================================
       3. CASE STUDY DEEP-DIVE TABS (LIFE OS AI)
       ========================================================================== */
    const tabButtons = document.querySelectorAll('.cs-tab-btn');
    const tabPanels = document.querySelectorAll('.cs-panel');

    tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-target');

        tabButtons.forEach((btn) => {
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        });
        tabPanels.forEach((panel) => {
          panel.classList.remove('active');
          panel.hidden = true;
        });

        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
        const activePanel = document.getElementById(targetId);
        if (activePanel) {
          activePanel.classList.add('active');
          activePanel.hidden = false;
        }
      });
    });

    /* ==========================================================================
       4. OTHER PROJECTS FILTER
       ========================================================================== */
    const filterPills = document.querySelectorAll('.filter-pill');
    const projectCards = document.querySelectorAll('.project-card');

    filterPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        filterPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');

        const filter = pill.getAttribute('data-filter');

        projectCards.forEach((card) => {
          const category = card.getAttribute('data-category');
          if (filter === 'all' || category === filter) {
            card.style.display = 'flex';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });

    /* ==========================================================================
       5. METRIC COUNTERS ANIMATION (EXPERIENCE SECTION)
       ========================================================================== */
    const statElements = document.querySelectorAll('.exp-stat-number');
    let animatedMetrics = false;

    function checkMetricsInView() {
      if (animatedMetrics) return;
      const experienceSec = document.getElementById('experience');
      if (!experienceSec) return;

      const rect = experienceSec.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.75) {
        animatedMetrics = true;

        statElements.forEach((el) => {
          const target = parseInt(el.getAttribute('data-count'), 10);
          const duration = 1800; // ms
          const startTime = performance.now();

          function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(1, elapsed / duration);
            // Ease-out expo
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const currentVal = Math.floor(easeProgress * target);

            if (target >= 1000) {
              el.textContent = currentVal.toLocaleString() + '+';
            } else {
              el.textContent = currentVal + '%';
            }

            if (progress < 1) {
              requestAnimationFrame(updateCounter);
            }
          }

          requestAnimationFrame(updateCounter);
        });
      }
    }

    window.addEventListener('scroll', checkMetricsInView, { passive: true });

    /* ==========================================================================
       6. INTERACTIVE TIMELINE SCROLL HIGHLIGHTING
       ========================================================================== */
    const timelineSteps = document.querySelectorAll('.timeline-step');
    if ('IntersectionObserver' in window) {
      const timelineObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('active-step');
            }
          });
        },
        { threshold: 0.5 }
      );

      timelineSteps.forEach((step) => timelineObserver.observe(step));
    }

    /* ==========================================================================
       7. EMAIL COPY TO CLIPBOARD
       ========================================================================== */
    const copyEmailBtn = document.getElementById('copy-email-btn');
    const copyToast = document.getElementById('copy-toast');
    const emailLink = document.getElementById('email-link');

    if (copyEmailBtn && emailLink && copyToast) {
      copyEmailBtn.addEventListener('click', async () => {
        const email = emailLink.textContent.trim();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(email);
          } else {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = email;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
          }
          copyToast.classList.add('show');
          setTimeout(() => {
            copyToast.classList.remove('show');
          }, 2400);
        } catch (err) {
          console.error('Failed to copy email:', err);
        }
      });
    }

    /* ==========================================================================
       8. CONTACT FORM SIMULATION
       ========================================================================== */
    window.handleContactSubmit = function () {
      const feedback = document.getElementById('form-feedback');
      const submitBtn = document.getElementById('form-submit-btn');
      const form = document.getElementById('contact-form');

      if (!feedback || !submitBtn || !form) return;

      const name = document.getElementById('contact-name').value.trim();
      const email = document.getElementById('contact-email').value.trim();
      const msg = document.getElementById('contact-msg').value.trim();

      if (!name || !email || !msg) {
        feedback.textContent = 'Please fill out all fields.';
        feedback.style.color = '#ef4444';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Sending...</span>';

      setTimeout(() => {
        feedback.textContent = `Thank you, ${name}! Your message has been received. I will reply to ${email} promptly.`;
        feedback.style.color = '#34d399';
        form.reset();
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Message Sent</span> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      }, 700);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPortfolio);
  } else {
    initPortfolio();
  }
})();
