/**
* Template Name: MyPortfolio - v4.10.0
* Template URL: https://bootstrapmade.com/myportfolio-bootstrap-portfolio-website-template/
* Author: BootstrapMade.com
* License: https://bootstrapmade.com/license/
*/
(function() {
  "use strict";

  /**
   * Easy selector helper function
   */
  const select = (el, all = false) => {
    el = el.trim()
    if (all) {
      return [...document.querySelectorAll(el)]
    } else {
      return document.querySelector(el)
    }
  }

  /**
   * Easy event listener function
   */
  const on = (type, el, listener, all = false) => {
    let selectEl = select(el, all)
    if (selectEl) {
      if (all) {
        selectEl.forEach(e => e.addEventListener(type, listener))
      } else {
        selectEl.addEventListener(type, listener)
      }
    }
  }

  /**
   * Easy on scroll event listener 
   */
  const onscroll = (el, listener) => {
    el.addEventListener('scroll', listener)
  }

  /**
   * burgerMenu
   */
  const burgerMenu = select('.burger')
  on('click', '.burger', function(e) {
    burgerMenu.classList.toggle('active');
  })

  /* ---------------------------
     Helpers for thumbnails
     --------------------------- */
  const getYouTubeId = (url) => {
    const m = url.match(/(?:youtube\.com\/.*v=|youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
    return m ? m[1] : null;
  };

  const getVimeoId = (url) => {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? m[1] : null;
  };

  const fetchVimeoThumbnail = async (id) => {
    try {
      const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent('https://vimeo.com/' + id)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.thumbnail_url || null;
    } catch (e) {
      return null;
    }
  };

  const setPlaceholderForContainer = (container, url) => {
    if (!container || !url) return;
    // avoid creating multiple placeholders
    if (container.querySelector('.iframe-placeholder')) return;

    const ph = document.createElement('div');
    ph.className = 'iframe-placeholder';
    ph.style.backgroundImage = `url("${url}")`;
    container.style.position = container.style.position || 'relative';
    container.appendChild(ph);
    return ph;
  };

  /* ---------------------------
     Lazy iframes + placeholders
     --------------------------- */
  const setupLazyIframes = () => {
    const iframes = [...document.querySelectorAll('iframe')];

    // Move matching src -> data-src for external players (Vimeo / YouTube)
    iframes.forEach(iframe => {
      try {
        const src = iframe.getAttribute('src');
        if (!src) return;
        if (src.includes('player.vimeo.com') || src.includes('youtube.com') || src.includes('youtube-nocookie.com')) {
          if (!iframe.hasAttribute('data-src')) {
            iframe.setAttribute('data-src', src);
            iframe.removeAttribute('src');
            iframe.setAttribute('loading', 'lazy');
            iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
            iframe.classList.add('lazy-iframe');
          }
        }
      } catch (e) { /* ignore */ }
    });

    const lazyFrames = [...document.querySelectorAll('iframe.lazy-iframe[data-src]')];
    if (lazyFrames.length === 0) return;

    // Create thumbnails for each iframe (YouTube immediate, Vimeo via oEmbed)
    lazyFrames.forEach(async (f) => {
      const dataSrc = f.getAttribute('data-src');
      const container = f.closest('.video-wrapper') || f.parentElement || f;
      // Try YouTube
      const ytId = getYouTubeId(dataSrc);
      if (ytId) {
        const thumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        setPlaceholderForContainer(container, thumb);
        return;
      }
      // Try Vimeo
      const vId = getVimeoId(dataSrc);
      if (vId) {
        const thumb = await fetchVimeoThumbnail(vId);
        if (thumb) setPlaceholderForContainer(container, thumb);
        return;
      }
      // default: no thumbnail
    });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const f = entry.target;
            const dataSrc = f.getAttribute('data-src');
            if (dataSrc) {
              f.setAttribute('src', dataSrc);
              f.removeAttribute('data-src');
              f.classList.remove('lazy-iframe');
              // remove placeholder when iframe loads
              f.addEventListener('load', () => {
                const container = f.closest('.video-wrapper') || f.parentElement;
                const ph = container && container.querySelector('.iframe-placeholder');
                if (ph) ph.remove();
              }, { once: true });
            }
            observer.unobserve(f);
          }
        });
      }, { rootMargin: '300px' });

      lazyFrames.forEach(f => io.observe(f));
    } else {
      // Fallback: load after a small timeout
      setTimeout(() => {
        lazyFrames.forEach(f => {
          const dataSrc = f.getAttribute('data-src');
          if (dataSrc) {
            f.setAttribute('src', dataSrc);
            f.removeAttribute('data-src');
            f.classList.remove('lazy-iframe');
          }
        });
      }, 1000);
    }
  };

  /* ---------------------------
     Local <video> poster capture
     - Tries to capture first frame and set as poster (same-origin required)
     --------------------------- */
  const setupVideoPosters = () => {
    const videos = [...document.querySelectorAll('video')];

    videos.forEach(video => {
      // If poster already provided, skip
      if (video.hasAttribute('poster')) return;

      // Only attempt for videos with a source or src attribute
      const srcEl = video.querySelector('source');
      const src = srcEl ? srcEl.getAttribute('src') : video.getAttribute('src');
      if (!src) return;

      // Try to capture a frame without forcing full preload
      try {
        video.preload = 'metadata';
        // set crossOrigin to anonymous so canvas extraction works if server provides CORS headers
        if (!video.hasAttribute('crossorigin')) video.crossOrigin = 'anonymous';
      } catch (e) { /* ignore */ }

      const capture = () => {
        try {
          const w = video.videoWidth;
          const h = video.videoHeight;
          if (w && h) {
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, w, h);
            const dataURL = canvas.toDataURL('image/jpeg');
            // set as poster attribute (browser will show it until video plays)
            video.setAttribute('poster', dataURL);
            // if wrapped by .video-wrapper, also set a placeholder div (keeps same visual behavior)
            const container = video.closest('.video-wrapper') || video.parentElement;
            if (container) setPlaceholderForContainer(container, dataURL);
          }
        } catch (e) {
          // drawing might fail for cross-origin videos — ignore silently
        }
      };

      // Listen for the earliest moment we can draw a frame
      const onLoadedData = () => {
        // seek to 0 to ensure first frame available
        try {
          // Some browsers require small timeout after seeking
          video.currentTime = 0;
          // When seeked, capture frame
          const onSeeked = () => {
            capture();
            video.removeEventListener('seeked', onSeeked);
          };
          video.addEventListener('seeked', onSeeked);
        } catch (e) {
          // fallback: try capture directly
          capture();
        }
        video.removeEventListener('loadeddata', onLoadedData);
      };

      video.addEventListener('loadeddata', onLoadedData, { once: true });

      // Also try a timeout fallback in case events don't fire (very rare)
      setTimeout(() => {
        if (!video.getAttribute('poster')) {
          try { capture(); } catch (_) { }
        }
      }, 1500);
    });
  };

  /**
   * Porfolio isotope and filter
   * Now initialized on DOMContentLoaded so the page can render before external assets finish.
   */
  document.addEventListener('DOMContentLoaded', () => {
    // Setup lazy load for iframe embeds first
    setupLazyIframes();

    // Attempt to set posters for local <video> elements
    setupVideoPosters();

    // Initialize Isotope filters (safe to run early; if sizing is off later, Isotope will adapt)
    let portfolioContainer = select('#portfolio-grid');
    if (portfolioContainer) {
      let portfolioIsotope = new Isotope(portfolioContainer, {
        itemSelector: '.item',
      });

      let portfolioFilters = select('#filters a', true);

      on('click', '#filters a', function(e) {
        e.preventDefault();
        portfolioFilters.forEach(function(el) {
          el.classList.remove('active');
        });
        this.classList.add('active');

        portfolioIsotope.arrange({
          filter: this.getAttribute('data-filter')
        });
        portfolioIsotope.on('arrangeComplete', function() {
          AOS.refresh()
        });
      }, true);
    }

    /**
     * Testimonials slider (init immediately)
     */
    new Swiper('.testimonials-slider', {
      speed: 600,
      loop: true,
      autoplay: {
        delay: 5000,
        disableOnInteraction: false
      },
      slidesPerView: 'auto',
      pagination: {
        el: '.swiper-pagination',
        type: 'bullets',
        clickable: true
      }
    });

    /**
     * Animation on scroll: initialize AOS early after DOM ready.
     */
    AOS.init({
      duration: 1000,
      easing: 'ease-in-out',
      once: true,
      mirror: false
    });

    // If external resources change sizes later (images/iframes), refresh AOS and Isotope after a short delay
    window.addEventListener('load', () => {
      // final refresh when everything is loaded to ensure layout is correct
      AOS.refresh();
      // If Isotope exists, trigger a layout to account for late-loaded assets
      if (window.Isotope && select('#portfolio-grid')) {
        try {
          const iso = Isotope.data(select('#portfolio-grid'));
          if (iso) iso.layout();
        } catch (e) { /* ignore */ }
      }
      // Remove any iframe placeholders that might remain (safety)
      document.querySelectorAll('.iframe-placeholder').forEach(ph => {
        const iframe = ph.parentElement && ph.parentElement.querySelector('iframe');
        if (iframe && iframe.src && iframe.src.length) ph.remove();
      });
    });

  });

})()