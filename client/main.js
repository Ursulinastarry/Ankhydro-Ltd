// ===== ANK HYDRO LIMITED — Main JavaScript =====

document.addEventListener('DOMContentLoaded', () => {

  // ---------- Mobile Menu Toggle ----------
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navLinks.classList.toggle('open');
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });
  }

  // ---------- Back to Top Button ----------
  const backToTop = document.getElementById('backToTop');

  if (backToTop) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ---------- Scroll Fade-Up Animations ----------
  const fadeElements = document.querySelectorAll('.fade-up');

  if (fadeElements.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    fadeElements.forEach(el => observer.observe(el));
  }

  // ---------- Counter Animation ----------
  const counters = document.querySelectorAll('[data-count]');

  if (counters.length > 0) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.getAttribute('data-count'), 10);
          animateCounter(el, target);
          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.3 });

    counters.forEach(el => counterObserver.observe(el));
  }

  function animateCounter(el, target) {
    const duration = 2000;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      el.textContent = current.toLocaleString() + '+';

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  // ---------- FAQ Accordion ----------
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    if (question && answer) {
      question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        // Close all others
        faqItems.forEach(other => {
          other.classList.remove('active');
          const otherAnswer = other.querySelector('.faq-answer');
          if (otherAnswer) otherAnswer.style.maxHeight = null;
        });

        // Toggle current
        if (!isActive) {
          item.classList.add('active');
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      });
    }
  });

  // ---------- Form Handling ----------
  const contactForm = document.getElementById('contactForm');
  const quoteForm = document.getElementById('quoteForm');

  async function submitForm(endpoint, form, successId) {
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => { data[key] = value; });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Submission failed.');
      }

      showSuccess(form, successId);
      form.reset();
    } catch (error) {
      console.error(error);
      alert('Sorry, there was a problem submitting the form. Please try again later.');
    }
  }

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitForm('/api/contact', contactForm, 'contactSuccess');
    });
  }

  if (quoteForm) {
    quoteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitForm('/api/quote', quoteForm, 'quoteSuccess');
    });
  }

  function showSuccess(form, successId) {
    form.style.display = 'none';
    const success = document.getElementById(successId);
    if (success) success.style.display = 'block';
  }

  // ---------- URL Parameter Pre-fill (for quote form) ----------
  if (quoteForm) {
    const params = new URLSearchParams(window.location.search);

    const serviceParam = params.get('service');
    const packageParam = params.get('package');

    if (serviceParam) {
      const serviceMap = {
        'solar-installation': 'Solar Panel Installation',
        'hybrid-solar': 'Hybrid Domestic Solar',
        'hydrological-survey': 'Hydrological Survey',
        'borehole-drilling': 'Borehole Drilling',
        'borehole-rehabilitation': 'Borehole Rehabilitation',
        'pump-installation': 'Pump Installation',
        'irrigation': 'Irrigation Systems',
        'tank-tower': 'Tank Tower Construction',
        'solar-structure': 'Solar Structure'
      };

      const serviceSelect = document.getElementById('quote-service');
      if (serviceSelect && serviceMap[serviceParam]) {
        serviceSelect.value = serviceMap[serviceParam];
      }
    }

    if (packageParam) {
      const packageMap = {
        'hybrid-solar': 'Hybrid Solar',
        'pump-200w': '200W Pump',
        'pump-500w': '500W Pump',
        'pump-750w': '750W Pump',
        'pump-1300w': '1300W Pump'
      };

      const packageSelect = document.getElementById('quote-package');
      if (packageSelect && packageMap[packageParam]) {
        packageSelect.value = packageMap[packageParam];
      }
    }
  }

  // ---------- Sticky Header Shadow on Scroll ----------
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 10) {
        header.style.boxShadow = '0 4px 20px rgba(0,0,0,.25)';
      } else {
        header.style.boxShadow = '0 4px 20px rgba(0,0,0,.2)';
      }
    });
  }

  // ---------- Lazy Image Load Animation ----------
  document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    if (img.complete) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load', () => img.classList.add('loaded'));
    }
  });

});
