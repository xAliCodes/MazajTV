(function() {
  // قنوات رياضية بالعربية
  const channels = [
    { id: 1, name: 'الرياضية الأولى', video: 'http://65.20.181.106:9090/0.mp4', image: 'assets/images/image1.avif' },
    { id: 2, name: 'الرياضية الثانية', video: 'http://65.20.181.106:9090/1.mp4', image: 'assets/images/image2.webp' },
    { id: 3, name: 'الرياضية الثالثة', video: 'http://65.20.181.106:9090/2.mp4', image: 'assets/images/image3.jpg' },
    { id: 4, name: 'الرياضية الرابعة', video: 'http://65.20.181.106:9090/3.mp4', image: 'assets/images/image4.webp' }
  ];

  const grid = document.getElementById('channelGrid');
  if (grid) {
    grid.innerHTML = '';
    channels.forEach((ch) => {
      const card = document.createElement('article');
      card.className = 'channel-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `شاهد ${ch.name}`);

      card.innerHTML = `
        <div class="card-img-container">
          <img src="${ch.image}" alt="${ch.name}" class="card-img" loading="lazy">
          <div class="play-orb">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        <div class="card-title-area">
          <h3 class="card-title">${ch.name}</h3>
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

  const overlay = document.getElementById('playerOverlay');
  const gridView = document.querySelector('.grid-view');
  const video = document.getElementById('videoPlayer');
  const videoWrapper = document.getElementById('videoWrapper');
  const loadingState = document.getElementById('loadingState');
  const bigPlayBtn = document.getElementById('bigPlayBtn');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const muteBtn = document.getElementById('muteBtn');
  const volIcon = document.getElementById('volIcon');
  const volumeSlider = document.getElementById('volumeSlider');
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  const timeDisplay = document.getElementById('timeDisplay');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const pipBtn = document.getElementById('pipBtn');
  const backBtn = document.getElementById('backBtn');

  function openPlayer(ch) {
    document.getElementById('playerTitle').textContent = ch.name;
    gridView.classList.add('dimmed');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    loadingState.style.display = 'flex';
    bigPlayBtn.classList.add('hidden');
    video.type = 'video/mp4';
    video.src = ch.video;
    video.load();
    video.play().then(() => {
      loadingState.style.display = 'none';
      videoWrapper.classList.remove('paused');
    }).catch(() => {
      loadingState.style.display = 'none';
      videoWrapper.classList.add('paused');
      bigPlayBtn.classList.remove('hidden');
    });
  }

  function closePlayer() {
    overlay.classList.remove('active');
    gridView.classList.remove('dimmed');
    document.body.style.overflow = '';
    video.pause();
    video.removeAttribute('src');
    video.load();
    videoWrapper.classList.add('paused');
  }

  backBtn?.addEventListener('click', closePlayer);
  bigPlayBtn?.addEventListener('click', () => video.play());

  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') closePlayer();
    else if (e.key === ' ') {
      e.preventDefault();
      video.paused ? video.play() : video.pause();
    }
  });

  playPauseBtn?.addEventListener('click', () => video.paused ? video.play() : video.pause());

  video.addEventListener('play', () => {
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    videoWrapper.classList.remove('paused');
    bigPlayBtn.classList.add('hidden');
  });

  video.addEventListener('pause', () => {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    videoWrapper.classList.add('paused');
    bigPlayBtn.classList.remove('hidden');
  });

  video.addEventListener('waiting', () => { loadingState.style.display = 'flex'; });
  video.addEventListener('playing', () => { loadingState.style.display = 'none'; });

  muteBtn?.addEventListener('click', () => {
    video.muted = !video.muted;
    updateVolIcon();
  });

  function updateVolIcon() {
    if (!volIcon) return;
    if (video.muted) {
      volIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
    } else {
      volIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>';
    }
  }

  volumeSlider?.addEventListener('input', (e) => {
    video.volume = e.target.value;
    video.muted = false;
    updateVolIcon();
  });

  video.addEventListener('timeupdate', () => {
    if (!video.duration || !isFinite(video.duration)) {
      progressFill.style.width = '100%';
      timeDisplay.textContent = 'مباشر';
      return;
    }
    const pct = (video.currentTime / video.duration) * 100;
    progressFill.style.width = pct + '%';
    const m = Math.floor(video.currentTime / 60);
    const s = String(Math.floor(video.currentTime % 60)).padStart(2, '0');
    timeDisplay.textContent = `${m}:${s}`;
  });

  progressBar?.addEventListener('click', (e) => {
    if (!video.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    video.currentTime = pct * video.duration;
  });

  fullscreenBtn?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      videoWrapper.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  });

  pipBtn?.addEventListener('click', async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {}
  });

  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closePlayer();
  });

  // Clock update
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const clockEl = document.getElementById('clock');
    if (clockEl) clockEl.textContent = `${h}:${m}`;
  }
  updateClock();
  setInterval(updateClock, 30000);

  // WebGL smoke background
  const glCanvas = document.getElementById('glcanvas');
  const gl = glCanvas.getContext('webgl');

  const vertSrc = `attribute vec2 position; void main() { gl_Position = vec4(position, 0.0, 1.0); }`;
  const fragSrc = `precision highp float;
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
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 6; i++) {
        value += amplitude * noise(p);
        p *= 2.05;
        amplitude *= 0.55;
      }
      return value;
    }
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 p = uv * 3.0;
      p.x *= u_resolution.x / u_resolution.y;
      float t = u_time * 0.045;
      vec2 q = vec2(fbm(p + vec2(0.0, 0.0) + t), fbm(p + vec2(5.2, 1.3) - t));
      vec2 r = vec2(fbm(p + 1.5 * q + vec2(1.7, 9.2) + 0.15 * t),
                    fbm(p + 1.5 * q + vec2(8.3, 2.8) - 0.12 * t));
      float smoke = fbm(p + 2.0 * r);
      vec3 base = vec3(0.025, 0.022, 0.02);
      vec3 dark = vec3(0.11, 0.09, 0.075);
      float mixAmt = smoothstep(0.15, 0.85, smoke);
      vec3 color = mix(base, dark, mixAmt * 0.75);
      float vig = smoothstep(1.1, 0.35, distance(uv, vec2(0.5)));
      color = mix(color * 0.65, color, vig);
      gl_FragColor = vec4(color, 1.0);
    }`;

  function compile(type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    return shader;
  }

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertSrc));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragSrc));
  gl.linkProgram(program);
  gl.useProgram(program);

  const quad = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
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

  // Floating particles
  const pCanvas = document.getElementById('particles');
  const ctx = pCanvas.getContext('2d');

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

  const particles = [];
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.8 + 0.6,
      vx: (Math.random() - 0.5) * 0.08,
      vy: -Math.random() * 0.06 - 0.02,
      alpha: Math.random() * 0.25 + 0.08,
      drift: Math.random() * Math.PI * 2,
    });
  }

  function drawParticles() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of particles) {
      p.drift += 0.002;
      p.x += p.vx + Math.sin(p.drift) * 0.05;
      p.y += p.vy;
      if (p.y < -10) {
        p.y = window.innerHeight + 10;
        p.x = Math.random() * window.innerWidth;
      }
      if (p.x < -10) p.x = window.innerWidth + 10;
      if (p.x > window.innerWidth + 10) p.x = -10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 184, 107, ${p.alpha * 0.6})`;
      ctx.fill();
    }
    requestAnimationFrame(drawParticles);
  }
  requestAnimationFrame(drawParticles);
})();
