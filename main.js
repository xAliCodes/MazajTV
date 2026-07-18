(function() {
  'use strict';

  // ============ Channel Data ============
  const channels = [
    { id: 1, name: 'الرياضية الأولى', video: 'http://10.5.10.190/0.mp4', image: 'assets/images/image1.avif' },
    { id: 2, name: 'الرياضية الثانية', video: 'http://10.5.10.190/4.mp4', image: 'assets/images/image2.webp' },
    { id: 3, name: 'الرياضية الثالثة', video: 'http://10.5.10.190/8.mp4', image: 'assets/images/image3.jpg' },
    { id: 4, name: 'الرياضية الرابعة', video: 'http://10.5.10.190/12.mp4', image: 'assets/images/image4.webp' }
  ];

  // ============ DOM Elements ============
  const getElement = (id) => document.getElementById(id);

  const grid = getElement('channelGrid');
  const overlay = getElement('playerOverlay');
  const gridView = document.querySelector('.grid-view');
  const video = getElement('videoPlayer');
  const videoWrapper = getElement('videoWrapper');
  const videoControls = getElement('videoControls');
  const playerTopBar = getElement('playerTopBar');
  const loadingState = getElement('loadingState');
  const errorState = getElement('errorState');
  const bigPlayBtn = getElement('bigPlayBtn');
  const playPauseBtn = getElement('playPauseBtn');
  const playIcon = getElement('playIcon');
  const pauseIcon = getElement('pauseIcon');
  const muteBtn = getElement('muteBtn');
  const volIcon = getElement('volIcon');
  const volumeSlider = getElement('volumeSlider');
  const progressBar = getElement('progressBar');
  const progressFill = getElement('progressFill');
  const timeDisplay = getElement('timeDisplay');
  const fullscreenBtn = getElement('fullscreenBtn');
  const fullscreenIcon = getElement('fullscreenIcon');
  const exitFullscreenIcon = getElement('exitFullscreenIcon');
  const pipBtn = getElement('pipBtn');
  const backBtn = getElement('backBtn');
  const touchHint = getElement('touchHint');
  const playerTitle = getElement('playerTitle');
  const installBtn = getElement('installBtn');
  const installContainer = getElement('installContainer');

  // Debug - Log missing elements in development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const elements = {
      grid, overlay, gridView, video, videoWrapper, videoControls,
      playerTopBar, loadingState, errorState, bigPlayBtn, playPauseBtn,
      playIcon, pauseIcon, muteBtn, volIcon, volumeSlider, progressBar,
      progressFill, timeDisplay, fullscreenBtn, fullscreenIcon,
      exitFullscreenIcon, pipBtn, backBtn, touchHint, playerTitle, installBtn
    };

    Object.entries(elements).forEach(([name, el]) => {
      if (!el) console.warn(`Missing element: ${name}`);
    });
  }

  // ============ Device Detection ============
  const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       navigator.standalone ||
                       document.referrer.includes('android-app://');

  // ============ State ============
  let hideControlsTimer = null;
  let fullscreenInactivityTimer = null;
  let currentChannel = null;
  let isDragging = false;
  let isFullscreen = false;
  let deferredPrompt = null;

  // ============ PWA Install ============
  // Check if app is already installed
  if (isStandalone) {
    if (installContainer) installContainer.style.display = 'none';
  }

  // Listen for install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;

    // Show install button
    if (installContainer && !isStandalone) {
      installContainer.style.display = 'flex';
    }
  });

  // Install button click handler
  if (installBtn) {
    installBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      if (!deferredPrompt) {
        // If no deferred prompt, show instructions
        alert('لتثبيت التطبيق:\n\n• على iOS: اضغط على زر المشاركة ثم "إضافة إلى الشاشة الرئيسية"\n• على Android: اضغط على القائمة ثم "تثبيت التطبيق"');
        return;
      }

      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);

      // Clear the saved prompt
      deferredPrompt = null;

      // Hide the install button
      if (installContainer) {
        installContainer.style.display = 'none';
      }
    });
  }

  // Hide install button when app is installed
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
    if (installContainer) {
      installContainer.style.display = 'none';
    }
  });

  // ============ Render Channel Cards ============
  function renderChannels() {
    if (!grid) return;
    grid.innerHTML = '';

    channels.forEach((ch) => {
      const card = document.createElement('article');
      card.className = 'channel-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', 'شاهد ' + ch.name);

      card.innerHTML = `
        <div class="card-img-container">
          <img src="${ch.image}" alt="${ch.name}" class="card-img" loading="lazy"
               onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, rgba(253, 76, 154, 0.2), rgba(48, 109, 227, 0.2))';">
          <div class="card-title-overlay">
            <h3 class="card-title">${ch.name}</h3>
          </div>
          <div class="play-orb">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      `;

      card.addEventListener('click', () => openPlayer(ch));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPlayer(ch);
        }
      });

      grid.appendChild(card);
    });
  }

  // ============ Open Player ============
  function openPlayer(ch) {
    if (!video || !overlay) return;

    currentChannel = ch;

    if (playerTitle) {
      playerTitle.textContent = ch.name;
    }

    if (gridView) gridView.classList.add('dimmed');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Reset states
    if (loadingState) loadingState.style.display = 'flex';
    if (errorState) errorState.style.display = 'none';
    if (bigPlayBtn) bigPlayBtn.style.display = 'none';

    // Reset fullscreen
    if (isFullscreen) {
      exitFullscreenMode();
    }

    video.pause();
    video.src = '';
    video.load();

    // Set source after reset
    video.src = ch.video;
    video.load();

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        if (loadingState) loadingState.style.display = 'none';
        if (videoWrapper) videoWrapper.classList.remove('paused');
        if (bigPlayBtn) bigPlayBtn.style.display = 'none';
      }).catch((error) => {
        console.log('Autoplay prevented:', error.message);
        if (loadingState) loadingState.style.display = 'none';
        if (videoWrapper) videoWrapper.classList.add('paused');
        if (bigPlayBtn) bigPlayBtn.style.display = 'flex';
      });
    }

    if (isTouchDevice && touchHint) {
      touchHint.style.display = 'flex';
      setTimeout(() => { if (touchHint) touchHint.style.display = 'none'; }, 3000);
    }
  }

  // ============ Close Player ============
  function closePlayer() {
    if (!overlay || !video) return;

    overlay.classList.remove('active');
    if (gridView) gridView.classList.remove('dimmed');
    document.body.style.overflow = '';

    video.pause();
    video.src = '';
    video.load();

    if (videoWrapper) videoWrapper.classList.add('paused');
    if (bigPlayBtn) bigPlayBtn.style.display = 'none';
    if (loadingState) loadingState.style.display = 'none';
    if (errorState) errorState.style.display = 'none';

    // Exit fullscreen
    if (isFullscreen) {
      exitFullscreenMode();
    }

    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }

    currentChannel = null;
  }

  // ============ Fullscreen Mode ============
  function enterFullscreenMode() {
    if (!videoWrapper) return;

    isFullscreen = true;

    // Add fullscreen class to wrapper
    videoWrapper.classList.add('fullscreen');

    // Add fullscreen class to overlay
    if (overlay) overlay.classList.add('fullscreen-active');

    // Update fullscreen icon
    if (fullscreenIcon) fullscreenIcon.classList.add('hidden');
    if (exitFullscreenIcon) exitFullscreenIcon.classList.remove('hidden');

    const tryLockLandscape = () => {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    };

    // Request native fullscreen first
    if (!document.fullscreenElement) {
      let fsPromise = null;
      if (videoWrapper.requestFullscreen) {
        fsPromise = videoWrapper.requestFullscreen();
      } else if (videoWrapper.webkitRequestFullscreen) {
        fsPromise = videoWrapper.webkitRequestFullscreen();
      }

      if (fsPromise && typeof fsPromise.then === 'function') {
        fsPromise.then(tryLockLandscape).catch(() => {
          applyForcedLandscapeFallback();
        });
      } else {
        applyForcedLandscapeFallback();
      }
    } else {
      tryLockLandscape();
    }

    // Start inactivity timer
    resetFullscreenInactivityTimer();
  }

  function exitFullscreenMode() {
    isFullscreen = false;

    if (videoWrapper) {
      videoWrapper.classList.remove('fullscreen');
    }
    if (overlay) {
      overlay.classList.remove('fullscreen-active');
    }

    if (fullscreenIcon) fullscreenIcon.classList.remove('hidden');
    if (exitFullscreenIcon) exitFullscreenIcon.classList.add('hidden');

    // Unlock orientation
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }

    // Exit native fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    removeForcedLandscapeFallback();
    clearFullscreenInactivityTimer();

    if (videoControls) {
      videoControls.classList.remove('auto-hide');
    }
    showControls();
  }

  function toggleFullscreen() {
    if (isFullscreen) {
      exitFullscreenMode();
    } else {
      enterFullscreenMode();
    }
  }

  // ============ CSS Fallback Rotation ============
  function applyForcedLandscapeFallback() {
    if (!isMobile || !videoWrapper) return;
    if (window.innerWidth > window.innerHeight) return;

    videoWrapper.classList.add('force-landscape');
    videoWrapper.style.position = 'fixed';
    videoWrapper.style.top = '50%';
    videoWrapper.style.left = '50%';
    videoWrapper.style.width = window.innerHeight + 'px';
    videoWrapper.style.height = window.innerWidth + 'px';
    videoWrapper.style.transform = 'translate(-50%, -50%) rotate(90deg)';
    videoWrapper.style.transformOrigin = 'center center';
    videoWrapper.style.zIndex = '99999';
  }

  function removeForcedLandscapeFallback() {
    if (!videoWrapper || !videoWrapper.classList.contains('force-landscape')) return;

    videoWrapper.classList.remove('force-landscape');
    videoWrapper.style.position = '';
    videoWrapper.style.top = '';
    videoWrapper.style.left = '';
    videoWrapper.style.width = '';
    videoWrapper.style.height = '';
    videoWrapper.style.transform = '';
    videoWrapper.style.transformOrigin = '';
    videoWrapper.style.zIndex = '';
  }

  window.addEventListener('resize', () => {
    if (!isFullscreen || !isMobile) return;
    if (window.innerWidth > window.innerHeight) {
      removeForcedLandscapeFallback();
    } else if (!document.fullscreenElement) {
      applyForcedLandscapeFallback();
    }
  });

  // ============ Fullscreen Inactivity Timer ============
  function resetFullscreenInactivityTimer() {
    clearFullscreenInactivityTimer();

    if (videoControls) videoControls.classList.remove('auto-hide');
    if (playerTopBar) playerTopBar.style.opacity = '1';

    fullscreenInactivityTimer = setTimeout(() => {
      if (isFullscreen && video && !video.paused) {
        if (videoControls) videoControls.classList.add('auto-hide');
        if (playerTopBar) playerTopBar.style.opacity = '0';
      }
    }, 5000);
  }

  function clearFullscreenInactivityTimer() {
    if (fullscreenInactivityTimer) {
      clearTimeout(fullscreenInactivityTimer);
      fullscreenInactivityTimer = null;
    }
  }

  // ============ Toggle Play/Pause ============
  function togglePlay() {
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  // ============ Update Volume Icon ============
  function updateVolIcon() {
    if (!volIcon || !video) return;

    if (video.muted || video.volume === 0) {
      volIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
    } else if (video.volume < 0.5) {
      volIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>';
    } else {
      volIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>';
    }
  }

  // ============ Format Time ============
  function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + s.toString().padStart(2, '0');
  }

  // ============ Show Controls ============
  function showControls() {
    if (!videoWrapper) return;

    videoWrapper.classList.add('show-controls');
    clearTimeout(hideControlsTimer);

    if (isFullscreen) {
      resetFullscreenInactivityTimer();
    } else if (video && !video.paused) {
      hideControlsTimer = setTimeout(() => {
        if (videoWrapper) videoWrapper.classList.remove('show-controls');
      }, 3000);
    }
  }

  // ============ Event Listeners ============

  // Back button
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closePlayer();
    });
  }

  // Big play button
  if (bigPlayBtn) {
    bigPlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (video) video.play().catch(() => {});
    });
  }

  // Overlay click to close
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && !isFullscreen) {
        closePlayer();
      }
    });
  }

  // Play/Pause
  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlay();
    });
  }

  // Mute
  if (muteBtn) {
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!video) return;

      video.muted = !video.muted;
      if (!video.muted && video.volume === 0) {
        video.volume = 0.5;
        if (volumeSlider) volumeSlider.value = 0.5;
      }
      updateVolIcon();
    });
  }

  // Volume slider
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      if (!video) return;
      video.volume = parseFloat(e.target.value);
      video.muted = (video.volume === 0);
      updateVolIcon();
    });
  }

  // Fullscreen button
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFullscreen();
    });
  }

  // PiP button
  if (pipBtn) {
    pipBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled && video) {
          await video.requestPictureInPicture();
        }
      } catch (err) {
        console.log('PiP failed:', err.message);
      }
    });
  }

  // ============ Video Events ============
  if (video) {
    video.addEventListener('play', () => {
      if (playIcon) playIcon.classList.add('hidden');
      if (pauseIcon) pauseIcon.classList.remove('hidden');
      if (videoWrapper) videoWrapper.classList.remove('paused');
      if (bigPlayBtn) bigPlayBtn.style.display = 'none';
      if (loadingState) loadingState.style.display = 'none';
      if (isFullscreen) resetFullscreenInactivityTimer();
    });

    video.addEventListener('pause', () => {
      if (playIcon) playIcon.classList.remove('hidden');
      if (pauseIcon) pauseIcon.classList.add('hidden');
      if (videoWrapper) videoWrapper.classList.add('paused');
      if (!video.ended && video.readyState >= 2 && bigPlayBtn) {
        bigPlayBtn.style.display = 'flex';
      }
      clearFullscreenInactivityTimer();
      if (videoControls) videoControls.classList.remove('auto-hide');
      if (playerTopBar) playerTopBar.style.opacity = '1';
    });

    video.addEventListener('waiting', () => {
      if (!video.paused && loadingState) loadingState.style.display = 'flex';
    });

    video.addEventListener('playing', () => {
      if (loadingState) loadingState.style.display = 'none';
      if (bigPlayBtn) bigPlayBtn.style.display = 'none';
    });

    video.addEventListener('canplay', () => {
      if (loadingState) loadingState.style.display = 'none';
    });

    video.addEventListener('ended', () => {
      if (videoWrapper) videoWrapper.classList.add('paused');
      if (bigPlayBtn) bigPlayBtn.style.display = 'flex';
    });

    video.addEventListener('error', () => {
      if (loadingState) loadingState.style.display = 'none';
      if (bigPlayBtn) bigPlayBtn.style.display = 'none';
      if (errorState) errorState.style.display = 'flex';
    });

    // ============ Progress Bar ============
    video.addEventListener('timeupdate', () => {
      if (!progressFill || !timeDisplay) return;

      if (!video.duration || !isFinite(video.duration)) {
        progressFill.style.width = '100%';
        timeDisplay.textContent = 'مباشر';
        return;
      }

      const percent = (video.currentTime / video.duration) * 100;
      progressFill.style.width = Math.min(100, Math.max(0, percent)) + '%';
      timeDisplay.textContent = formatTime(video.currentTime);
    });
  }

  if (progressBar) {
    progressBar.addEventListener('click', (e) => {
      if (!video || !video.duration || !isFinite(video.duration)) return;
      const rect = progressBar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      video.currentTime = Math.max(0, Math.min(percent * video.duration, video.duration));
    });

    progressBar.addEventListener('touchstart', (e) => {
      isDragging = true;
      e.preventDefault();
    }, { passive: false });

    progressBar.addEventListener('touchmove', (e) => {
      if (!isDragging || !video || !video.duration || !isFinite(video.duration)) return;
      const rect = progressBar.getBoundingClientRect();
      const percent = (e.touches[0].clientX - rect.left) / rect.width;
      video.currentTime = Math.max(0, Math.min(percent * video.duration, video.duration));
    });

    progressBar.addEventListener('touchend', () => {
      isDragging = false;
    });
  }

  // ============ Controls Visibility ============
  if (videoWrapper) {
    videoWrapper.addEventListener('mousemove', showControls);
    videoWrapper.addEventListener('mousedown', showControls);

    videoWrapper.addEventListener('touchstart', () => {
      showControls();
      if (isTouchDevice && !isDragging) {
        setTimeout(() => {
          if (!isDragging) togglePlay();
        }, 200);
      }
    }, { passive: true });
  }

  // ============ Keyboard Shortcuts ============
  document.addEventListener('keydown', (e) => {
    if (!overlay || !overlay.classList.contains('active') || !video) return;

    switch(e.key) {
      case 'Escape':
        e.preventDefault();
        if (isFullscreen) {
          exitFullscreenMode();
        } else {
          closePlayer();
        }
        break;
      case ' ':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (video.duration && isFinite(video.duration)) {
          video.currentTime = Math.min(video.currentTime + 10, video.duration);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        video.currentTime = Math.max(video.currentTime - 10, 0);
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        video.muted = !video.muted;
        updateVolIcon();
        break;
      case 'ArrowUp':
        e.preventDefault();
        video.volume = Math.min(video.volume + 0.1, 1);
        if (volumeSlider) volumeSlider.value = video.volume;
        video.muted = false;
        updateVolIcon();
        break;
      case 'ArrowDown':
        e.preventDefault();
        video.volume = Math.max(video.volume - 0.1, 0);
        if (volumeSlider) volumeSlider.value = video.volume;
        updateVolIcon();
        break;
    }
  });

  // ============ Touch Swipe to Close ============
  let touchStartY = 0;
  if (overlay) {
    overlay.addEventListener('touchstart', (e) => {
      if (!isFullscreen && (e.target === overlay || e.target.closest('.video-wrapper'))) {
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    overlay.addEventListener('touchmove', (e) => {
      if (!isFullscreen && (e.target === overlay || e.target.closest('.video-wrapper'))) {
        if (e.touches[0].clientY - touchStartY > 80) {
          closePlayer();
        }
      }
    }, { passive: true });
  }

  // ============ Native Fullscreen Change ============
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && isFullscreen) {
      exitFullscreenMode();
    }
  });

  // ============ Clock ============
  function updateClock() {
    const now = new Date();
    const el = getElement('clock');
    if (el) {
      el.textContent = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    }
  }
  updateClock();
  setInterval(updateClock, 30000);

  // ============ WebGL Smoke Background ============
  function initWebGL() {
    const glCanvas = getElement('glcanvas');
    if (!glCanvas) return;

    const gl = glCanvas.getContext('webgl', { alpha: false, antialias: false });
    if (!gl) return;

    const vertSrc = 'attribute vec2 position; void main() { gl_Position = vec4(position, 0.0, 1.0); }';
    const fragSrc = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p *= 2.05;
          a *= 0.55;
        }
        return v;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = uv * 2.8;
        p.x *= u_resolution.x / u_resolution.y;

        float t = u_time * 0.04;

        vec2 q = vec2(
          fbm(p + vec2(0.0, 0.0) + t),
          fbm(p + vec2(5.2, 1.3) - t)
        );

        vec2 r = vec2(
          fbm(p + 1.5 * q + vec2(1.7, 9.2) + 0.15 * t),
          fbm(p + 1.5 * q + vec2(8.3, 2.8) - 0.12 * t)
        );

        float smoke = fbm(p + 2.0 * r);

        vec3 pink = vec3(0.992, 0.298, 0.604);
        vec3 blue = vec3(0.188, 0.427, 0.890);

        float gradientMix = uv.y;

        vec3 darkPink = pink * 0.15;
        vec3 darkBlue = blue * 0.15;
        vec3 darkColor = mix(darkPink, darkBlue, gradientMix);

        vec3 midPink = pink * 0.4;
        vec3 midBlue = blue * 0.4;
        vec3 midColor = mix(midPink, midBlue, gradientMix);

        float mixAmt = smoothstep(0.15, 0.85, smoke);
        vec3 color = mix(darkColor, midColor, mixAmt * 0.7);

        float vig = smoothstep(1.1, 0.3, distance(uv, vec2(0.5)));
        color = mix(color * 0.6, color, vig);

        gl_FragColor = vec4(color, 1.0);
      }`;

    function compileShader(type, src) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertShader = compileShader(gl.VERTEX_SHADER, vertSrc);
    const fragShader = compileShader(gl.FRAGMENT_SHADER, fragSrc);

    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const quad = new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const resLoc = gl.getUniformLocation(program, 'u_resolution');
    const timeLoc = gl.getUniformLocation(program, 'u_time');

    function resizeGl() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      glCanvas.width = window.innerWidth * dpr;
      glCanvas.height = window.innerHeight * dpr;
      glCanvas.style.width = window.innerWidth + 'px';
      glCanvas.style.height = window.innerHeight + 'px';
      gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    }
    window.addEventListener('resize', resizeGl);
    resizeGl();

    function render(time) {
      gl.uniform2f(resLoc, glCanvas.width, glCanvas.height);
      gl.uniform1f(timeLoc, time * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  }

  // ============ Floating Particles ============
  function initParticles() {
    const pCanvas = getElement('particles');
    if (!pCanvas) return;

    const ctx = pCanvas.getContext('2d');
    if (!ctx) return;

    function resizeParticles() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      pCanvas.width = window.innerWidth * dpr;
      pCanvas.height = window.innerHeight * dpr;
      pCanvas.style.width = window.innerWidth + 'px';
      pCanvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resizeParticles);
    resizeParticles();

    const particleCount = isMobile ? 25 : 60;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.5 + 0.4,
        vx: (Math.random() - 0.5) * 0.06,
        vy: -Math.random() * 0.05 - 0.01,
        alpha: Math.random() * 0.2 + 0.06,
        drift: Math.random() * Math.PI * 2
      });
    }

    function drawParticles() {
      if (!ctx || !pCanvas) return;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of particles) {
        p.drift += 0.002;
        p.x += p.vx + Math.sin(p.drift) * 0.04;
        p.y += p.vy;
        if (p.y < -10) { p.y = window.innerHeight + 10; p.x = Math.random() * window.innerWidth; }
        if (p.x < -10) p.x = window.innerWidth + 10;
        if (p.x > window.innerWidth + 10) p.x = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(253, 76, 154, ' + (p.alpha * 0.4) + ')';
        ctx.fill();
      }
      requestAnimationFrame(drawParticles);
    }
    requestAnimationFrame(drawParticles);
  }

  // ============ Network Status ============
  window.addEventListener('online', () => {
    if (overlay && overlay.classList.contains('active') && currentChannel && video) {
      if (errorState) errorState.style.display = 'none';
      video.load();
      video.play().catch(() => {});
    }
  });

  window.addEventListener('offline', () => {
    if (overlay && overlay.classList.contains('active') && video) {
      video.pause();
      if (errorState) errorState.style.display = 'flex';
    }
  });

  // ============ Service Worker Registration (PWA) ============
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('Service Worker update found!');

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New content is available; please refresh.');
                // Optional: You could show a "Update available" toast here
              }
            });
          });
        })
        .catch((err) => {
          console.log('ServiceWorker registration failed: ', err);
        });
    });
  }

  // ============ Initialize ============
  function init() {
    renderChannels();
    initWebGL();
    initParticles();
    updateClock();

    // Set initial volume icon
    if (video) {
      updateVolIcon();
    }

    console.log('مزاج TV initialized successfully');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
