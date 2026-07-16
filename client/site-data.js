// ===== ANK HYDRO — Site Data Connector =====
// Fetches published data from the production backend and updates the live website
// Falls back to local JSON and localStorage for previewing locally

(function() {
  'use strict';

  const BACKEND_HOST = 'https://ankhydro-ltd-production.up.railway.app';
  const BACKEND_API = BACKEND_HOST + '/api';

  const SiteData = {
    data: null,

    async init() {
      let jsonData = null;
      let localData = null;

      // Try to load published data from the production backend API first
      try {
        const resp = await fetch(BACKEND_API + '/site-data?v=' + Date.now());
        if (resp.ok) {
          jsonData = await resp.json();
        }
      } catch (e) {
        // API unavailable
      }

      if (!jsonData) {
        try {
          const resp = await fetch('site-data.json?v=' + Date.now());
          if (resp.ok) {
            const text = await resp.text();
            if (text.trim().startsWith('{')) {
              jsonData = JSON.parse(text);
            }
          }
        } catch (e) {
          // No JSON file available or parse error
        }
      }

      try {
        localData = this.loadFromLocalStorage();
      } catch (e) {
        // localStorage not available
      }

      if (jsonData) {
        // Prefer published JSON or DB-backed data for live site content.
        this.data = jsonData;
      } else {
        this.data = localData;
      }

      if (!this.data) return;

      // Run each apply method independently — one failure won't break the rest
      const methods = [
        'applySettings',
        'applyStats',
        'applyServices',
        'applyPackages',
        'applyPackagesHome',
        'applyBlog',
        'applyBlogHome',
        'applyTestimonials',
        'applyTeam',
        'applyFaq',
        'applyProjects'
      ];

      methods.forEach(method => {
        try {
          this[method]();
        } catch (e) {
          console.warn('[SiteData] Error in ' + method + ':', e.message);
        }
      });
    },

    loadFromLocalStorage() {
      const keys = ['settings', 'stats', 'testimonials', 'team', 'faq', 'blog', 'packages', 'services', 'projects'];
      const data = {};
      let hasData = false;
      keys.forEach(key => {
        const val = localStorage.getItem('ank_' + key);
        if (val) {
          try {
            data[key] = JSON.parse(val);
            hasData = true;
          } catch (e) {
            // Skip corrupted data
          }
        }
      });
      return hasData ? data : null;
    },

    get(key) {
      return this.data ? this.data[key] : null;
    },

    // ---------- SETTINGS (phone, email, social links, WhatsApp) ----------
    applySettings() {
      const s = this.get('settings');
      if (!s || typeof s !== 'object') return;

      // Phone numbers in header and footer
      if (s.phone) {
        const phoneNum = s.phone.replace(/\s/g, '');
        document.querySelectorAll('.header-phone').forEach(el => {
          el.href = 'tel:' + phoneNum;
          const svg = el.querySelector('svg');
          el.textContent = '';
          if (svg) el.prepend(svg);
          el.append(s.phone);
        });
        document.querySelectorAll('.hero-phone').forEach(el => {
          el.href = 'tel:' + phoneNum;
          const svg = el.querySelector('svg');
          el.textContent = '';
          if (svg) el.prepend(svg);
          el.append(' Call Us: ' + s.phone);
        });
        document.querySelectorAll('.cta-phone').forEach(el => {
          el.href = 'tel:' + phoneNum;
          const svg = el.querySelector('svg');
          el.textContent = '';
          if (svg) el.prepend(svg);
          el.append(' ' + s.phone);
        });
        document.querySelectorAll('.footer-contact-item a[href^="tel:"]').forEach(el => {
          el.href = 'tel:' + phoneNum;
          el.textContent = s.phone;
        });
      }

      // Email
      if (s.email) {
        document.querySelectorAll('.footer-contact-item a[href^="mailto:"]').forEach(el => {
          el.href = 'mailto:' + s.email;
          el.textContent = s.email;
        });
      }

      // Address — match any span in footer-contact-item that isn't a link
      if (s.address) {
        document.querySelectorAll('.footer-contact-item span').forEach(el => {
          // Only target the address span (no link parent)
          if (!el.closest('a')) {
            el.textContent = s.address;
          }
        });
      }

      // WhatsApp float button
      if (s.whatsapp) {
        const waNum = s.whatsapp.replace(/[^0-9]/g, '');
        document.querySelectorAll('.whatsapp-float').forEach(el => {
          el.href = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent("Hi ANK Hydro, I'm interested in your services.");
        });
      }

      // Social media links — update href if set, hide if empty
      const socialMap = {
        facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok',
        linkedin: 'LinkedIn', youtube: 'YouTube', twitter: 'Twitter'
      };
      Object.entries(socialMap).forEach(([key, label]) => {
        document.querySelectorAll('.footer-social a[aria-label="' + label + '"]').forEach(el => {
          if (s[key]) {
            el.href = s[key];
            el.target = '_blank';
            el.rel = 'noopener';
            el.style.display = '';
          } else {
            // Hide social icons that have no URL configured
            el.style.display = 'none';
          }
        });
      });

      if (s.company) {
        document.querySelectorAll('.footer-brand h3').forEach(el => { el.textContent = s.company; });
      }
      if (s.tagline) {
        document.querySelectorAll('.footer-brand > p').forEach(el => {
          // Target the tagline paragraph (first <p> direct child of footer-brand)
          if (!el.querySelector('a') && !el.closest('.footer-contact-item')) {
            el.textContent = s.tagline;
          }
        });
      }
    },

    // ---------- STATS / COUNTERS ----------
    applyStats() {
      const stats = this.get('stats');
      if (!stats || typeof stats !== 'object') return;

      const mapping = {
        'Boreholes Drilled': stats.boreholes,
        'Solar Installs': stats.solar,
        'Solar Systems Installed': stats.solar,
        'Happy Clients': stats.clients,
        'Counties Served': stats.counties
      };

      document.querySelectorAll('[data-count]').forEach(el => {
        const label = el.closest('.hero-stat, .stat-item');
        if (!label) return;
        const labelText = label.querySelector('.stat-label');
        if (!labelText) return;
        const text = labelText.textContent.trim();
        if (mapping[text] !== undefined && mapping[text] !== null) {
          el.setAttribute('data-count', mapping[text]);
        }
      });
    },

    // ---------- SERVICES ----------
    applyServices() {
      const services = this.get('services');
      if (!services || !Array.isArray(services)) return;

      const published = services
        .filter(s => s.status === 'published')
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      if (published.length === 0) return;

      // Icon map based on slug
      const iconMap = {
        'solar-installation': '#icon-solar',
        'hybrid-solar': '#icon-battery',
        'hydrological-survey': '#icon-search',
        'borehole-drilling': '#icon-drill',
        'borehole-rehabilitation': '#icon-wrench',
        'pump-installation': '#icon-droplet',
        'irrigation': '#icon-sprout',
        'tank-tower': '#icon-building',
        'solar-structure': '#icon-building'
      };

      // --- Homepage service cards (index.html) ---
      const serviceGrid = document.querySelector('.service-card')?.closest('.grid-3');
      if (serviceGrid) {
        serviceGrid.innerHTML = '';
        published.forEach(svc => {
          const icon = iconMap[svc.slug] || '#icon-settings';
          const card = document.createElement('article');
          card.className = 'service-card fade-up visible';
          card.innerHTML = `
            <div class="service-icon"><svg width="26" height="26"><use href="${icon}"/></svg></div>
            <h3>${this.escapeHtml(svc.title)}</h3>
            <p>${this.escapeHtml(svc.description || '')}</p>
            <a class="card-link" href="services.html#${svc.slug}">Learn More <svg width="14" height="14"><use href="#icon-arrow-right"/></svg></a>
          `;
          serviceGrid.appendChild(card);
        });
      }

      // --- Services page (services.html) — update existing sections ---
      if (document.title.includes('Services')) {
        published.forEach(svc => {
          if (!svc.slug) return;
          const section = document.getElementById(svc.slug);
          if (!section) return;

          // Update title
          const h2 = section.querySelector('h2');
          if (h2) h2.textContent = svc.title;

          // Update category eyebrow and description
          const eyebrow = section.querySelector('.eyebrow');
          if (eyebrow) {
            eyebrow.textContent = svc.category || '';
            const desc = eyebrow.parentElement?.querySelector('p:not(.eyebrow)');
            if (desc && svc.description) desc.textContent = svc.description;
          }

          // Update image if provided
          if (svc.image) {
            const img = section.querySelector('.service-img img, img');
            if (img) img.src = svc.image;
          }
        });
      }
    },

    // ---------- PACKAGES (dedicated page) ----------
    applyPackages() {
      const packages = this.get('packages');
      if (!packages || !Array.isArray(packages)) return;
      // Only run on the Packages page
      if (!document.title.includes('Package')) return;

      const active = packages
        .filter(p => p.status === 'active')
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      if (active.length === 0) return;

      // Update existing cards in-place first (images, titles, prices, specs)
      const existingCards = document.querySelectorAll('.package-card');
      existingCards.forEach((card, i) => {
        if (!active[i]) return;
        const pkg = active[i];

        // Update image
        const img = card.querySelector('.package-img img');
        if (img) {
          const imgSrc = this.getPackageImage(pkg);
          img.src = imgSrc;
          img.alt = pkg.name || '';
        }

        // Update title
        const h3 = card.querySelector('h3');
        if (h3) h3.textContent = pkg.name || '';

        // Update price — show "Call us to enquire" instead of KES amounts
        const price = card.querySelector('.package-price');
        if (price) {
          price.outerHTML = '<div class="solution-label"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>Call us to enquire</div>';
        }
        // Also update solution-label if it exists
        const solLabel = card.querySelector('.solution-label');
        if (solLabel && !price) {
          // Already has solution label, leave as-is
        }

        // Update specs
        const specsList = card.querySelector('.package-specs');
        if (specsList && pkg.specs) {
          const specs = pkg.specs.split(',').map(s => s.trim()).filter(Boolean);
          specsList.innerHTML = specs.map(s => `<li>${this.escapeHtml(s)}</li>`).join('');
        }
      });

      // If admin has MORE packages than existing cards, add extras to the grid
      if (active.length > existingCards.length) {
        const grid = document.querySelector('.grid-4') || document.querySelector('.grid-3');
        if (grid) {
          for (let i = existingCards.length; i < active.length; i++) {
            const pkg = active[i];
            const card = document.createElement('article');
            card.className = 'package-card fade-up visible' + (pkg.featured ? ' featured' : '');
            const imgSrc = this.getPackageImage(pkg);
            const specs = (pkg.specs || '').split(',').map(s => s.trim()).filter(Boolean);
            const specsList = specs.map(s => `<li>${this.escapeHtml(s)}</li>`).join('');
            card.innerHTML = `
              <div class="package-img"><img src="${imgSrc}" alt="${this.escapeHtml(pkg.name)}" loading="lazy"></div>
              <h3>${this.escapeHtml(pkg.name)}</h3>
              <div class="solution-label"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>Call us to enquire</div>
              <ul class="package-specs">${specsList}</ul>
              <a class="btn ${pkg.featured ? 'btn-primary' : 'btn-cyan'}" href="tel:+254758849293" style="width:100%;justify-content:center;">Call for Quote</a>
            `;
            grid.appendChild(card);
          }
        }
      }
    },

    // Helper: resolve package image (admin-uploaded > keyword match > fallback)
    getPackageImage(pkg) {
      if (pkg.image) return pkg.image;
      const defaults = {
        'hybrid': 'images/pkg-hybrid-solar.jpg',
        '200w': 'images/pkg-pump-200w.jpg',
        '500w': 'images/pkg-pump-500w.jpg',
        '750w': 'images/pkg-pump-750w.jpg',
        '1300w': 'images/pkg-pump-1300w.jpg',
        'pump': 'images/pkg-pump-750w.jpg',
        'solar': 'images/pkg-hybrid-solar.jpg'
      };
      const nameLower = (pkg.name || '').toLowerCase();
      for (const [keyword, src] of Object.entries(defaults)) {
        if (nameLower.includes(keyword)) return src;
      }
      return 'images/solar-panel-daytime.jpg';
    },

    // ---------- PACKAGES (Homepage featured — removed) ----------
    applyPackagesHome() {
      return; // Section removed from homepage
      const packages = this.get('packages');
      if (!packages || !Array.isArray(packages)) return;
      // Skip on the dedicated Packages page
      if (document.title.includes('Package')) return;

      const featured = packages
        .filter(p => p.status === 'active' && p.featured)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      if (featured.length === 0) return;

      const container = document.querySelector('.package-card')?.closest('.grid-3');
      if (!container) return;

      container.innerHTML = '';

      featured.forEach(pkg => {
        const card = document.createElement('article');
        card.className = 'package-card fade-up visible' + (pkg.featured ? ' featured' : '');

        const imgSrc = this.getPackageImage(pkg);
        const specs = (pkg.specs || '').split(',').map(s => s.trim()).filter(Boolean);
        const specsList = specs.map(s => `<li>${this.escapeHtml(s)}</li>`).join('');

        const whatsappName = encodeURIComponent(pkg.name || 'your packages');
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.innerHTML = `
          <div class="package-img"><img src="${imgSrc}" alt="${this.escapeHtml(pkg.name)}" loading="lazy"></div>
          <h3>${this.escapeHtml(pkg.name)}</h3>
          <ul class="package-specs">${specsList}</ul>
          <div class="card-actions">
            <a class="btn ${pkg.featured ? 'btn-primary' : 'btn-cyan'}" href="tel:+254758849293"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg> Call Us</a>
            <a class="btn btn-whatsapp" href="https://wa.me/254758849293?text=Hi%20ANK%20Hydro%2C%20I%27m%20interested%20in%20${whatsappName}." target="_blank" rel="noopener"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg> WhatsApp</a>
          </div>
        `;
        container.appendChild(card);
      });
    },

    // ---------- BLOG (dedicated page) ----------
    applyBlog() {
      const blog = this.get('blog');
      if (!blog || !Array.isArray(blog)) return;
      // Only run on the Blog page
      if (!document.title.includes('Blog')) return;

      const published = blog
        .filter(b => b.status === 'published')
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      if (published.length === 0) return;

      const blogGrid = document.querySelector('.blog-card')?.closest('.grid-3');
      if (!blogGrid) return;

      blogGrid.innerHTML = '';

      published.forEach(post => {
        const iconMap = {
          'Solar Energy': '\u2600\uFE0F', 'Solar Energy Guide': '\u2600\uFE0F',
          'Borehole': '\uD83D\uDCA7', 'Borehole Drilling Tips': '\uD83D\uDCA7', 'Borehole & Water': '\uD83D\uDCA7',
          'Irrigation': '\uD83C\uDF31', 'Irrigation & Farming': '\uD83C\uDF31',
          'Water Conservation': '\u26CF\uFE0F', 'Company News': '\uD83D\uDCA1'
        };
        const icon = iconMap[post.category] || '\uD83D\uDCDD';
        const thumb = post.image
          ? `<div class="blog-thumb" style="padding:0;overflow:hidden;"><img src="${post.image}" alt="" style="width:100%;height:100%;object-fit:cover;"></div>`
          : `<div class="blog-thumb">${icon}</div>`;

        const postSlug = post.slug || post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const link = document.createElement('a');
        link.href = 'blog-post.html?slug=' + postSlug;
        link.className = 'blog-card fade-up visible';
        link.innerHTML = `
          ${thumb}
          <div class="blog-body">
            <p class="blog-category">${this.escapeHtml(post.category || 'General')}</p>
            <h3>${this.escapeHtml(post.title)}</h3>
            <p>${this.escapeHtml((post.content || '').substring(0, 150))}${(post.content || '').length > 150 ? '...' : ''}</p>
            <p class="blog-meta">${post.date || ''} &middot; ${this.escapeHtml(post.author || 'ANK Hydro')}</p>
          </div>
        `;
        blogGrid.appendChild(link);
      });
    },

    // ---------- BLOG (Homepage highlights) ----------
    applyBlogHome() {
      const blog = this.get('blog');
      if (!blog || !Array.isArray(blog)) return;
      // Skip on the dedicated Blog page
      if (document.title.includes('Blog')) return;

      const published = blog
        .filter(b => b.status === 'published')
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 3);

      if (published.length === 0) return;

      const blogGrid = document.querySelector('.blog-card')?.closest('.grid-3');
      if (!blogGrid) return;

      blogGrid.innerHTML = '';

      published.forEach(post => {
        const iconMap = {
          'Solar Energy': '\u2600\uFE0F', 'Solar Energy Guide': '\u2600\uFE0F',
          'Borehole': '\uD83D\uDCA7', 'Borehole Drilling Tips': '\uD83D\uDCA7', 'Borehole & Water': '\uD83D\uDCA7',
          'Irrigation': '\uD83C\uDF31', 'Irrigation & Farming': '\uD83C\uDF31',
          'Water Conservation': '\u26CF\uFE0F', 'Company News': '\uD83D\uDCA1'
        };
        const icon = iconMap[post.category] || '\uD83D\uDCDD';
        const thumb = post.image
          ? `<div class="blog-thumb" style="padding:0;overflow:hidden;"><img src="${post.image}" alt="" style="width:100%;height:100%;object-fit:cover;"></div>`
          : `<div class="blog-thumb">${icon}</div>`;

        const postSlug = post.slug || post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const link = document.createElement('a');
        link.href = 'blog-post.html?slug=' + postSlug;
        link.className = 'blog-card fade-up visible';
        link.innerHTML = `
          ${thumb}
          <div class="blog-body">
            <p class="blog-category">${this.escapeHtml(post.category || 'General')}</p>
            <h3>${this.escapeHtml(post.title)}</h3>
            <p>${this.escapeHtml((post.content || '').substring(0, 150))}${(post.content || '').length > 150 ? '...' : ''}</p>
            <p class="blog-meta">${post.date || ''} &middot; ${this.escapeHtml(post.author || 'ANK Hydro')}</p>
          </div>
        `;
        blogGrid.appendChild(link);
      });
    },

    // ---------- TESTIMONIALS ----------
    applyTestimonials() {
      const testimonials = this.get('testimonials');
      if (!testimonials || !Array.isArray(testimonials)) return;

      const published = testimonials
        .filter(t => t.status === 'published')
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      if (published.length === 0) return;

      const containers = document.querySelectorAll('.testimonial-card');
      if (containers.length === 0) return;

      const parent = containers[0].parentElement;
      if (!parent) return;

      parent.innerHTML = '';

      published.forEach(t => {
        const initials = t.client ? t.client.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';
        const stars = '<svg width="14" height="14"><use href="#icon-star"/></svg>'.repeat(t.rating || 5);
        const avatar = t.image
          ? `<img src="${t.image}" alt="${this.escapeHtml(t.client)}" class="testimonial-avatar" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">`
          : `<div class="testimonial-avatar">${initials}</div>`;

        const card = document.createElement('div');
        card.className = 'testimonial-card fade-up visible';
        card.innerHTML = `
          <div class="testimonial-stars">${stars}</div>
          <p class="testimonial-text">${this.escapeHtml(t.text)}</p>
          <div class="testimonial-author">
            ${avatar}
            <div class="testimonial-info">
              <strong>${this.escapeHtml(t.client)}</strong>
              <span>${this.escapeHtml(t.location || '')}${t.service ? ' \u2014 ' + this.escapeHtml(t.service) : ''}</span>
            </div>
          </div>
        `;
        parent.appendChild(card);
      });
    },

    // ---------- TEAM ----------
    applyTeam() {
      const team = this.get('team');
      if (!team || !Array.isArray(team)) return;

      const active = team
        .filter(t => t.status === 'active')
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      if (active.length === 0) return;

      const containers = document.querySelectorAll('.team-card');
      if (containers.length === 0) return;

      const parent = containers[0].parentElement;
      if (!parent) return;

      parent.innerHTML = '';

      active.forEach(t => {
        const avatar = t.image
          ? `<img src="${t.image}" alt="${this.escapeHtml(t.name)}" class="team-avatar-img" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin:0 auto 1rem;">`
          : `<div class="team-avatar">\uD83D\uDC64</div>`;
        const card = document.createElement('div');
        card.className = 'team-card fade-up visible';
        card.innerHTML = `
          ${avatar}
          <h3>${this.escapeHtml(t.name)}</h3>
          <p class="team-role">${this.escapeHtml(t.role)}</p>
          <p>${this.escapeHtml(t.bio || '')}</p>
        `;
        parent.appendChild(card);
      });
    },

    // ---------- FAQ ----------
    applyFaq() {
      const faq = this.get('faq');
      if (!faq || !Array.isArray(faq)) return;

      const published = faq
        .filter(f => f.status === 'published')
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      if (published.length === 0) return;

      // Target .faq-list wrapper if it exists, otherwise fall back to .container
      const container = document.querySelector('.faq-list') || document.querySelector('.faq-item')?.closest('.container');
      if (!container) return;

      const groups = {};
      published.forEach(f => {
        const cat = f.category || 'General';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(f);
      });

      container.innerHTML = '';

      Object.entries(groups).forEach(([category, items]) => {
        const heading = document.createElement('h2');
        heading.style.cssText = 'font-size:1.2rem;margin:2rem 0 1rem;color:var(--cyan);';
        heading.textContent = category;
        container.appendChild(heading);

        items.forEach(item => {
          const faqEl = document.createElement('div');
          faqEl.className = 'faq-item fade-up visible';
          faqEl.innerHTML = `
            <button class="faq-question">${this.escapeHtml(item.question)} <span class="faq-icon">+</span></button>
            <div class="faq-answer"><div class="faq-answer-inner">${this.escapeHtml(item.answer)}</div></div>
          `;

          const question = faqEl.querySelector('.faq-question');
          const answer = faqEl.querySelector('.faq-answer');
          question.addEventListener('click', () => {
            const isActive = faqEl.classList.contains('active');
            container.querySelectorAll('.faq-item').forEach(other => {
              other.classList.remove('active');
              const a = other.querySelector('.faq-answer');
              if (a) a.style.maxHeight = null;
            });
            if (!isActive) {
              faqEl.classList.add('active');
              answer.style.maxHeight = answer.scrollHeight + 'px';
            }
          });

          container.appendChild(faqEl);
        });
      });
    },

    // ---------- PROJECTS / GALLERY ----------
    applyProjects() {
      const projects = this.get('projects');
      if (!projects || !Array.isArray(projects)) return;

      const published = projects
        .filter(p => p.status === 'published')
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      if (published.length === 0) return;

      const gallery = document.querySelector('.gallery-grid');
      if (!gallery) return;

      gallery.innerHTML = '';

      published.forEach(proj => {
        const item = document.createElement('div');
        item.className = 'gallery-item fade-up visible';
        item.setAttribute('onclick', 'openLightbox(this)');

        const img = proj.image
          ? `<img src="${proj.image}" alt="${this.escapeHtml(proj.title)}" loading="lazy">`
          : `<img src="images/solar-panel-daytime.jpg" alt="${this.escapeHtml(proj.title)}" loading="lazy">`;

        const caption = `${this.escapeHtml(proj.title)}${proj.location ? ' \u2014 ' + this.escapeHtml(proj.location) : ''}`;

        item.innerHTML = `
          ${img}
          <div class="gallery-overlay"><p>${caption}</p></div>
        `;
        gallery.appendChild(item);
      });
    },

    // ---------- UTILITY ----------
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    }
  };

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SiteData.init());
  } else {
    SiteData.init();
  }
})();
