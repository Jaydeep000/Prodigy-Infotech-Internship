/* script.js
   CarDestiny - consolidated site JS
   Author: ChatGPT (adapted for your HTML)
   Notes: defensive checks for missing elements, accessibility-minded.
*/

// Stop Chrome/Edge from restoring scroll when reloading
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.addEventListener('load', () => {
    window.scrollTo(0, 0);
});

document.addEventListener('DOMContentLoaded', () => {
  /* ====== Helpers ====== */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const safeRun = (fn) => { try { fn(); } catch (e) { console.warn(e); } };

  /* ====== 1) PRELOADER ====== */
  safeRun(() => {
    const preloader = $('#preloader');
    if (!preloader) return;
    // fade on window load (kept for if CSS handles start)
    window.addEventListener('load', () => {
      preloader.style.transition = 'opacity 0.35s ease';
      preloader.style.opacity = '0';
      setTimeout(() => {
        preloader.style.display = 'none';
      }, 450);
    });
  });

  /* ====== 2) AOS INIT (if present) ====== */
  safeRun(() => {
    if (window.AOS && typeof window.AOS.init === 'function') {
      AOS.init({ duration: 800, once: true });
    }
  });

  /* ====== 3) MOBILE MENU & NAV BEHAVIOR ====== */
  safeRun(() => {
    const menuBtn = $('#menu-btn');
    const navLinks = $('#nav-links');
    const nav = $('nav');
    const menuIcon = menuBtn ? menuBtn.querySelector('i') : null;

    const closeMenu = () => {
      if (navLinks) navLinks.classList.remove('open');
      if (menuIcon) menuIcon.className = 'ri-menu-line';
    };

    if (menuBtn && navLinks) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navLinks.classList.toggle('open');
        const isOpen = navLinks.classList.contains('open');
        if (menuIcon) menuIcon.className = isOpen ? 'ri-close-line' : 'ri-menu-line';
      });

      // close when clicking a link (mobile)
      navLinks.addEventListener('click', (e) => {
        const targetLink = e.target.closest('a');
        if (targetLink) closeMenu();
      });

      // close when clicking outside nav (desktop)
      document.addEventListener('click', (e) => {
        if (!navLinks.contains(e.target) && !menuBtn.contains(e.target)) {
          closeMenu();
        }
      });
    }

    // Sticky change on scroll + active link highlight
    const links = $$('.nav__links .link a') .concat($$('.nav__links a')) // tolerant selection
      .filter(Boolean);

    const sections = links
      .map(a => {
        const href = a.getAttribute('href') || '';
        if (!href.startsWith('#')) return null;
        const id = href.slice(1);
        return document.getElementById(id);
      })
      .filter(Boolean);

    const onScroll = () => {
      const scTop = window.scrollY;

      // change nav background on scroll
      if (nav) {
        if (scTop > 20) nav.classList.add('nav--scrolled');
        else nav.classList.remove('nav--scrolled');
      }

      // active link highlight using viewport center
      const offset = window.innerHeight * 0.35;
      sections.forEach((section, idx) => {
        const rect = section.getBoundingClientRect();
        const link = links[idx];
        if (rect.top <= offset && rect.bottom > offset) {
          link && link.classList.add('active');
        } else {
          link && link.classList.remove('active');
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  });

  /* ====== 4) SCROLL TO TOP BUTTON ====== */
  safeRun(() => {
    const scrollBtn = $('#scrollToTop');
    if (!scrollBtn) return;

    const revealAt = 200;
    const toggleBtn = () => {
      if (window.scrollY > revealAt) scrollBtn.style.display = 'block';
      else scrollBtn.style.display = 'none';
    };

    toggleBtn();
    window.addEventListener('scroll', toggleBtn, { passive: true });

    // smooth scroll to top
    scrollBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* ====== 5) MODAL (Booking) - Defensive ====== */
  safeRun(() => {
    const modal = $('#bookingModal');
    const openBtns = $$('.open-modal-btn');
    const closeBtn = modal ? modal.querySelector('.close') : null;

    if (!modal) {
      // If modal markup missing, we create a lightweight one and append to body.
      // This ensures open-modal-btns still show a booking small overlay.
      const createModal = () => {
        const div = document.createElement('div');
        div.id = 'bookingModal';
        div.className = 'booking-modal-fallback';
        div.innerHTML = `
          <div class="booking-modal__inner" role="dialog" aria-modal="true" aria-labelledby="bookingModalTitle">
            <button class="close" aria-label="Close modal">&times;</button>
            <h2 id="bookingModalTitle">Book Your Wash</h2>
            <p style="color:var(--text-light)">Please use the booking form on the page.</p>
            <button class="btn close">Close</button>
          </div>
        `;
        // basic inline styles so fallback shows nicely even if CSS not included
        div.style.position = 'fixed';
        div.style.inset = '0';
        div.style.display = 'none';
        div.style.placeItems = 'center';
        div.style.background = 'rgba(0,0,0,0.5)';
        div.style.zIndex = '9999';
        div.querySelector('.booking-modal__inner').style.cssText = 'background:#0b0b0b;color:#fff;padding:2rem;border-radius:12px;max-width:520px;width:90%;text-align:center;';
        document.body.appendChild(div);
        return div;
      };
      safeRun(() => { window._bookingModalFallback = createModal(); });
    }
    const modalNow = $('#bookingModal');
    if (!modalNow) return;

    const openModal = () => {
      modalNow.style.display = 'grid';
      // trap focus (simple)
      const focusable = modalNow.querySelectorAll('button, [href], input, select, textarea') || [];
      if (focusable.length) focusable[0].focus();
      document.body.style.overflow = 'hidden';
    };
    const closeModal = () => {
      modalNow.style.display = 'none';
      document.body.style.overflow = '';
    };

    openBtns.forEach(btn => btn.addEventListener('click', openModal));
    const closes = modalNow.querySelectorAll('.close');
    closes.forEach(c => c.addEventListener('click', closeModal));
    modalNow.addEventListener('click', (e) => {
      if (e.target === modalNow) closeModal();
    });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalNow.style.display === 'grid') closeModal();
    });
  });

  /* ====== 6) STATS COUNTER (IntersectionObserver + smooth count) ====== */
  safeRun(() => {
    const counters = $$('.stat-number');
    if (!counters.length) return;

    const animate = (el) => {
      const target = parseInt(el.dataset.target || '0', 10);
      const duration = Math.min(1600, Math.max(900, Math.floor(target * 8))); // adapt
      const start = performance.now();
      const tick = (now) => {
        const prog = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - prog, 3); // easeOutCubic-ish
        el.textContent = Math.floor(eased * target);
        if (prog < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      };
      requestAnimationFrame(tick);
      // add glow class while animating
      el.classList.add('active');
      setTimeout(() => el.classList.remove('active'), duration + 500);
    };

    const obs = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });

    counters.forEach(c => {
      c.textContent = '0';
      obs.observe(c);
    });
  });

  /* ====== 7) GALLERY LIGHTBOX (basic) ====== */
  safeRun(() => {
    const galleryCards = $$('.gallery__card');
    if (!galleryCards.length) return;

    // Create lightbox once
    let lightbox = $('#simpleLightbox');
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.id = 'simpleLightbox';
      lightbox.style.cssText = 'position:fixed;inset:0;display:none;place-items:center;background:rgba(0,0,0,0.85);z-index:99999;padding:20px;';
      lightbox.innerHTML = `<div style="max-width:95%;max-height:95%;position:relative;">
        <button aria-label="Close" id="lbClose" style="position:absolute;right:8px;top:8px;background:transparent;border:0;color:#fff;font-size:26px;cursor:pointer">×</button>
        <img id="lbImg" style="max-width:100%;max-height:100%;display:block;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,0.6)" src="" alt="preview">
      </div>`;
      document.body.appendChild(lightbox);
    }

    const lbImg = $('#lbImg');
    const lbClose = $('#lbClose');

    galleryCards.forEach(card => {
      const img = card.querySelector('img');
      if (!img) return;
      card.style.cursor = 'zoom-in';
      card.addEventListener('click', () => {
        lbImg.src = img.src;
        lbImg.alt = img.alt || 'Gallery image';
        lightbox.style.display = 'grid';
        document.body.style.overflow = 'hidden';
      });
    });

    const closeLB = () => {
      lightbox.style.display = 'none';
      document.body.style.overflow = '';
    };
    lbClose && lbClose.addEventListener('click', closeLB);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLB(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lightbox.style.display === 'grid') closeLB(); });
  });

  /* ====== 8) FAQ ACCORDION ====== */
  safeRun(() => {
    const items = $$('.faq-item');
    if (!items.length) return;

    items.forEach((item) => {
      const btn = item.querySelector('.faq-question');
      const ans = item.querySelector('.faq-answer');

      // Ensure aria attributes
      if (btn && ans) {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        ans.hidden = !expanded;

        btn.addEventListener('click', () => {
          const isExp = btn.getAttribute('aria-expanded') === 'true';
          // close all
          $$('.faq-question').forEach(q => {
            q.setAttribute('aria-expanded', 'false');
            if (q.nextElementSibling) q.nextElementSibling.hidden = true;
          });
          if (!isExp) {
            btn.setAttribute('aria-expanded', 'true');
            ans.hidden = false;
          } else {
            btn.setAttribute('aria-expanded', 'false');
            ans.hidden = true;
          }
        });

        // keyboard support
        btn.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            btn.click();
          }
        });
      }
    });
  });

  /* ====== 9) MULTI-STEP BOOKING FORM (with summary & validation) ====== */
  safeRun(() => {
    const form = $('#multiStepBooking');
    if (!form) return;

    const steps = $$('.form-step', form);
    const nextBtns = $$('.next-step', form);
    const prevBtns = $$('.prev-step', form);
    const indicators = $$('.step', form);
    let current = 0;

    const showStep = (n) => {
      steps.forEach((s, i) => {
        s.hidden = i !== n;
      });
      indicators.forEach((ind, i) => ind.classList.toggle('active', i === n));
      // focus first input of step for UX
      const firstInput = steps[n].querySelector('input, select, textarea, button');
      if (firstInput) firstInput.focus();
    };

    const validateStep = (n) => {
      // Simple required-field validation for visible inputs
      const inputs = Array.from(steps[n].querySelectorAll('input, select, textarea'))
        .filter(inp => inp.hasAttribute('required'));
      for (const inp of inputs) {
        if (!inp.value) {
          inp.focus();
          inp.classList.add('input-error');
          setTimeout(() => inp.classList.remove('input-error'), 1200);
          return false;
        }
      }
      return true;
    };

    nextBtns.forEach(btn => btn.addEventListener('click', () => {
      if (!validateStep(current)) return;
      if (current < steps.length - 1) current++;
      showStep(current);
      // if moved to confirm step, populate summary
      if (steps[current].dataset.step === '3') populateSummary();
    }));
    prevBtns.forEach(btn => btn.addEventListener('click', () => {
      if (current > 0) current--;
      showStep(current);
    }));

    const populateSummary = () => {
      const summaryWrap = form.querySelector('.confirmation-summary');
      if (!summaryWrap) return;
      const name = form.querySelector('[name="name"]')?.value || '-';
      const phone = form.querySelector('[name="phone"]')?.value || '-';
      const plan = form.querySelector('[name="plan"]')?.value || '-';
      const date = form.querySelector('[name="date"]')?.value || '-';
      const time = form.querySelector('[name="time"]')?.value || '-';
      const addons = Array.from(form.querySelectorAll('input[name="addons"]:checked')).map(i=>i.value);
      const addonsText = addons.length ? addons.join(', ') : 'None';

      summaryWrap.innerHTML = `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Plan:</strong> ${plan}</p>
        <p><strong>Date:</strong> ${date} <strong>Time:</strong> ${time}</p>
        <p><strong>Add-ons:</strong> ${addonsText}</p>
      `;
    };

    // submission handler
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // final validation
      if (!validateStep(current)) return;
      // gather data
      const data = new FormData(form);
      // create friendly object
      const payload = {};
      for (const [k,v] of data.entries()) {
        if (payload[k]) {
          // convert repeated keys to arrays
          if (!Array.isArray(payload[k])) payload[k] = [payload[k]];
          payload[k].push(v);
        } else payload[k] = v;
      }

      // Here you'd call your backend API (fetch). For demo -> simple success UX.
      const confirmBtn = form.querySelector('.form-btn');
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Booking...';

      setTimeout(() => {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm Booking';
        // show toast-like inline confirmation
        const note = document.createElement('div');
        note.className = 'booking-confirmation';
        note.style.cssText = 'position:fixed;right:20px;bottom:20px;background:#111;color:#fff;padding:12px 16px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,0.6);z-index:99999';
        note.textContent = 'Booking confirmed! We will contact you shortly.';
        document.body.appendChild(note);
        setTimeout(() => note.remove(), 4000);
        form.reset();
        current = 0;
        showStep(current);
      }, 1100);
    });

    // initialize
    showStep(current);
  });

  /* ====== 10) NEWSLETTER SUBMIT (simple) ====== */
  safeRun(() => {
    const newsletter = $('.newsletter-form');
    if (!newsletter) return;
    newsletter.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = newsletter.querySelector('[name="email"]')?.value;
      if (!email) return;
      // simulate signup
      const btn = newsletter.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Subscribing...';
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = 'Subscribe';
        newsletter.reset();
        // small success feedback
        const msg = document.createElement('div');
        msg.style.cssText = 'position:fixed;left:20px;bottom:20px;background:#111;color:#fff;padding:10px 14px;border-radius:8px;z-index:99999';
        msg.textContent = 'Thanks! Check your inbox for a promo soon.';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 3500);
      }, 900);
    });
  });

  /* ====== 11) SMALL UX: smooth-scroll for internal links ====== */
  safeRun(() => {
    const internalLinks = $$('a[href^="#"]')
      .filter(a => a.getAttribute('href') !== '#');

    internalLinks.forEach(a => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        if (!href || !href.startsWith('#')) return;
        const target = document.getElementById(href.slice(1));
        if (target) {
          e.preventDefault();
          const offset = 12; // small offset
          const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });
  });

  /* ====== 12) Tiny polish: remove focus outlines on mouse click but keep for keyboard ====== */
  safeRun(() => {
    function handleFirstTab(e) {
      if (e.key === 'Tab') {
        document.documentElement.classList.add('user-is-tabbing');
        window.removeEventListener('keydown', handleFirstTab);
      }
    }
    window.addEventListener('keydown', handleFirstTab);
  });

  /* ====== 13) Optional: auto-init any components added later (exposed) ====== */
  window.CarDestiny = {
    reinit: () => {
      // If you dynamically inject content, you can call CarDestiny.reinit()
      // to re-bind gallery/faq/etc as needed.
      console.info('CarDestiny: reinit called (no-op).');
    }
  };
});


/* =========================================
   INTERACTIVE PARTICLE BACKGROUND
   Features: Floating, Mouse Repulsion, Connecting Lines
   ========================================= */

(function initParticles() {
    const canvas = document.getElementById("bg-floating-dots");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let particlesArray;

    // Configuration
    const config = {
        particleColor: "rgba(139, 92, 246, 0.6)", // Your Violet Theme color
        lineColor: "rgba(139, 92, 246, 0.15)",    // Faint violet lines
        particleCount: 100,                       // Number of dots (adjust for performance)
        connectionDistance: 120,                  // How close dots must be to connect
        mouseRadius: 150,                         // Radius of mouse repulsion force
        baseSpeed: 0.5                            // Floating speed
    };

    // Resize Canvas to fill screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Mouse Position Tracker
    let mouse = {
        x: null,
        y: null,
        radius: config.mouseRadius
    }

    window.addEventListener('mousemove', (event) => {
        mouse.x = event.x;
        mouse.y = event.y;
    });

    // Reset mouse when leaving window so dots don't get stuck
    window.addEventListener('mouseout', () => {
        mouse.x = undefined;
        mouse.y = undefined;
    });

    // Create Particle Class
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.directionX = (Math.random() * 2.5) - 1.25; // Random horizontal speed
            this.directionY = (Math.random() * 2.5) - 1.25; // Random vertical speed
            this.size = (Math.random() * 2) + 1;            // Random size 1px-3px
            this.color = config.particleColor;
        }

        // Method: Draw individual dot
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        // Method: Update position & check physics
        update() {
            // 1. Check if dot hits canvas edge (bounce effect)
            if (this.x > canvas.width || this.x < 0) {
                this.directionX = -this.directionX;
            }
            if (this.y > canvas.height || this.y < 0) {
                this.directionY = -this.directionY;
            }

            // 2. Mouse Repulsion Logic (The "Float Away" effect)
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            // Pythagorean theorem to get distance
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < mouse.radius + this.size) {
                if (mouse.x < this.x && this.x < canvas.width - this.size * 10) {
                    this.x += 3; // Push right
                }
                if (mouse.x > this.x && this.x > this.size * 10) {
                    this.x -= 3; // Push left
                }
                if (mouse.y < this.y && this.y < canvas.height - this.size * 10) {
                    this.y += 3; // Push down
                }
                if (mouse.y > this.y && this.y > this.size * 10) {
                    this.y -= 3; // Push up
                }
            }

            // 3. Move particle
            this.x += this.directionX * config.baseSpeed;
            this.y += this.directionY * config.baseSpeed;

            // 4. Redraw
            this.draw();
        }
    }

    // Initialize Array
    function init() {
        particlesArray = [];
        // Determine number of particles based on screen size (fewer on mobile)
        let numberOfParticles = (canvas.height * canvas.width) / 9000; 
        
        for (let i = 0; i < numberOfParticles; i++) {
            particlesArray.push(new Particle());
        }
    }

    // Draw Lines between close particles
    function connect() {
        let opacityValue = 1;
        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a; b < particlesArray.length; b++) {
                let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x)) + 
                               ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
                
                // If particles are close enough, draw a line
                if (distance < (config.connectionDistance * config.connectionDistance)) {
                    opacityValue = 1 - (distance / 20000);
                    ctx.strokeStyle = config.lineColor.replace('0.15', opacityValue * 0.15); // Dynamic opacity
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                    ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
        }
        connect();
    }

    // Handle Window Resize (responsive)
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        mouse.radius = ((canvas.height / 80) * (canvas.height / 80));
        init();
    });

    // Click "Pulse" Effect (Optional extra you asked for)
    window.addEventListener('click', (e) => {
        // Temporarily expand mouse radius to create a "shockwave"
        let originalRadius = mouse.radius;
        mouse.radius = originalRadius * 3;
        setTimeout(() => { mouse.radius = originalRadius; }, 200);
    });

    // Start
    init();
    animate();

})();
