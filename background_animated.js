// Editor Background Animation com animação de ícones variados e interações de repulsão
class EditorBackground {
  constructor(options = {}) {
    this.options = {
      selector: options.selector || 'editor-background',
      maxParticles: options.maxParticles || 15,
      colors: options.colors || ['#1E9B8A', '#2AE6B2', '#FFFFFF'],
      minSize: options.minSize || 15,
      maxSize: options.maxSize || 30,
      responsive: options.responsive !== false,
      connectParticles: options.connectParticles !== false,
      connectionDistance: options.connectionDistance || 180,
      minDistanceBetweenParticles: options.minDistanceBetweenParticles || 50,
      repulsionStrength: options.repulsionStrength || 0.07,
      borderPadding: options.borderPadding || 80,
      dashLength: options.dashLength || 5,
      dashGap: options.dashGap || 3,
      lineWidth: options.lineWidth || 1.5,
      lineOpacity: options.lineOpacity || 0.8,
      mouseRepulsionRadius: options.mouseRepulsionRadius || 100,
      mouseRepulsionStrength: options.mouseRepulsionStrength || 0.4,
      sameIconRepulsionMultiplier: options.sameIconRepulsionMultiplier || 3.5,
      pursuitTimeThreshold: options.pursuitTimeThreshold || 60,
      pursuitDistanceThreshold: options.pursuitDistanceThreshold || 70,
      explosionDuration: options.explosionDuration || 30,
      explosionParticles: options.explosionParticles || 10,
      // Novas opções para movimento
      cornerAvoidanceStrength: options.cornerAvoidanceStrength || 0.05, // Força para evitar cantos
      minBaseSpeed: options.minBaseSpeed || 0.02, // Velocidade base mínima
      maxBaseSpeed: options.maxBaseSpeed || 0.12, // Velocidade base máxima
      speedVariationProbability: options.speedVariationProbability || 0.5 // Probabilidade de ter velocidade extrema
    };

    this.svgIcons = [
      // Pencil (0)
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
      // Scissors (1)
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>',
      // Timeline Edit (2)
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/><circle cx="16" cy="6" r="2" fill="currentColor"/><circle cx="8" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="18" r="2" fill="currentColor"/></svg>',
      // Camera (3)
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4z"/><rect x="3" y="6" width="12" height="12" rx="2" ry="2"/></svg>'
    ];

    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.explosionEffects = [];
    this.icons = [];
    this.width = 0;
    this.height = 0;
    this.cuttingLines = [];
    this.lastFrameTime = 0;
    this.initialized = false;
    this.centerX = 0;
    this.centerY = 0;
    this.mousePos = { x: -1000, y: -1000 };
    this.isMouseInside = false;

    this.init();
  }

  init() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = this.options.selector;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '0';
    this.canvas.style.pointerEvents = 'none';

    const heroElement = document.querySelector('.hero');
    if (!heroElement) {
        console.error("Elemento '.hero' não encontrado.");
        return;
    }
    heroElement.prepend(this.canvas);
    heroElement.style.position = 'relative';

    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    this.loadIcons().then(() => {
      this.createParticles();
      this.lastFrameTime = performance.now();
      this.animate(this.lastFrameTime);

      window.addEventListener('resize', this.resize.bind(this));
      heroElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
      heroElement.addEventListener('mouseenter', () => { this.isMouseInside = true; });
      heroElement.addEventListener('mouseleave', () => {
          this.isMouseInside = false;
          this.mousePos = { x: -1000, y: -1000 };
          this.particles.forEach(p => p.pursuitTimer = 0);
      });

      this.initialized = true;
    }).catch(error => {
        console.error("Erro na inicialização:", error);
    });
  }

  async loadIcons() {
    const iconPromises = this.svgIcons.map((svgText, index) => {
      return new Promise((resolve, reject) => {
        try {
          const coloredSvg = svgText.replace(/currentColor/g, '#FFFFFF');
          const img = new Image();
          const blob = new Blob([coloredSvg], {type: 'image/svg+xml'});
          const url = URL.createObjectURL(blob);
          img.onload = () => { URL.revokeObjectURL(url); resolve({ img, index }); };
          img.onerror = (e) => { console.error(`Erro SVG ${index}:`, e); reject(e); };
          img.src = url;
        } catch (error) { console.error(`Erro SVG ${index}:`, error); reject(error); }
      });
    });
    try {
      const loadedIconsData = await Promise.all(iconPromises);
      loadedIconsData.sort((a, b) => a.index - b.index);
      this.icons = loadedIconsData.map(data => data.img);
    } catch (error) {
      console.error("Falha ao carregar ícones:", error);
      const fallbackImg = new Image(24, 24);
      this.icons = Array(4).fill(fallbackImg);
    }
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
  }

  createParticles(excludedIndex = -1) {
    if (excludedIndex === -1) {
        this.particles = [];
    }
    const availableIconIndices = [0, 1, 2, 3];
    const numIconsAvailable = availableIconIndices.length;
    let iconIndexPool = [];
    const targetParticleCount = excludedIndex === -1 ? this.options.maxParticles : 1;

    for (let i = 0; i < targetParticleCount; i++) {
        if (excludedIndex !== -1) {
            iconIndexPool.push(availableIconIndices[Math.floor(Math.random() * numIconsAvailable)]);
        } else {
            iconIndexPool.push(availableIconIndices[i % numIconsAvailable]);
        }
    }
    if (excludedIndex === -1) {
        this.shuffleArray(iconIndexPool);
    }

    const safeAreaX1 = this.options.borderPadding;
    const safeAreaY1 = this.options.borderPadding;
    const safeAreaX2 = this.width - this.options.borderPadding;
    const safeAreaY2 = this.height - this.options.borderPadding;

    for (let i = 0; i < targetParticleCount; i++) {
      let validPosition = false;
      let x, y, size;
      let attempts = 0;
      while (!validPosition && attempts < 50) {
        size = this.randomBetween(this.options.minSize, this.options.maxSize);
        x = this.randomBetween(safeAreaX1, safeAreaX2);
        y = this.randomBetween(safeAreaY1, safeAreaY2);
        validPosition = true;
        for (const p of this.particles) {
          if (p.id === excludedIndex) continue;
          const dx = x - p.x;
          const dy = y - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          let minDistMultiplier = 1.0;
          if (p.iconIndex === iconIndexPool[i]) {
              minDistMultiplier = this.options.sameIconRepulsionMultiplier * 0.5;
          }
          if (distance < (size + p.size + this.options.minDistanceBetweenParticles) * minDistMultiplier) {
            validPosition = false;
            break;
          }
        }
        attempts++;
      }

      const iconIndex = iconIndexPool[i];
      const isScissors = iconIndex === 1;
      const particleId = excludedIndex !== -1 ? excludedIndex : this.particles.length;

      // Define a velocidade base (lenta ou rápida)
      let baseSpeed;
      if (Math.random() < this.options.speedVariationProbability) {
          // Velocidade extrema (muito lenta ou muito rápida)
          baseSpeed = Math.random() < 0.5 ? this.randomBetween(this.options.minBaseSpeed, this.options.minBaseSpeed * 1.5) : this.randomBetween(this.options.maxBaseSpeed * 0.8, this.options.maxBaseSpeed);
      } else {
          // Velocidade normal (entre as extremas)
          baseSpeed = this.randomBetween(this.options.minBaseSpeed * 1.5, this.options.maxBaseSpeed * 0.8);
      }

      const newParticle = {
        x, y, size, iconIndex, isScissors,
        rotation: Math.random() * 360,
        rotationSpeed: this.randomBetween(-0.1, 0.1),
        isCutting: false, cutTarget: null, cutProgress: 0,
        baseSpeed: baseSpeed, // Armazena a velocidade base
        currentSpeed: baseSpeed, // Velocidade atual, pode ser modificada pela repulsão
        direction: Math.random() * Math.PI * 2,
        wobble: { amplitude: this.randomBetween(0.2, 0.5), frequency: this.randomBetween(0.001, 0.003), offset: Math.random() * Math.PI * 2 },
        originalX: x, originalY: y,
        cuttingTimer: 0,
        velocity: { x: 0, y: 0 },
        id: particleId,
        directionChangeTimer: Math.random() * 200 + 100,
        pursuitTimer: 0,
        isExploding: false,
        isFleeing: false // Indica se está fugindo do mouse
      };

      if (excludedIndex !== -1) {
          const indexToReplace = this.particles.findIndex(p => p.id === excludedIndex);
          if (indexToReplace !== -1) {
              this.particles[indexToReplace] = newParticle;
          }
      } else {
          this.particles.push(newParticle);
      }
    }
  }

  animate(currentTime) {
    requestAnimationFrame(this.animate.bind(this));
    if (!this.initialized || !this.ctx) return;

    const deltaTime = (currentTime - this.lastFrameTime) / 16.67;
    this.lastFrameTime = currentTime;
    const limitedDelta = Math.min(deltaTime, 3);

    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.options.connectParticles) {
      this.drawConnections();
    }

    this.updateAndDrawParticles(currentTime, limitedDelta);
    this.updateAndDrawExplosions(limitedDelta);
  }

  drawConnections() {
      const visibleParticles = this.particles.filter(p => !p.isExploding);
      for (let i = 0; i < visibleParticles.length; i++) {
        const p1 = visibleParticles[i];
        for (let j = i + 1; j < visibleParticles.length; j++) {
          const p2 = visibleParticles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < this.options.connectionDistance) {
            let isCutting = false;
            let cutProgress = 0;
            const p1OriginalIndex = this.particles.findIndex(p => p.id === p1.id);
            const p2OriginalIndex = this.particles.findIndex(p => p.id === p2.id);

            for (const cut of this.cuttingLines) {
              if ((cut.p1 === p1OriginalIndex && cut.p2 === p2OriginalIndex) || (cut.p1 === p2OriginalIndex && cut.p2 === p1OriginalIndex)) {
                isCutting = true;
                cutProgress = cut.progress;
                break;
              }
            }

            if (isCutting) {
              const midX = p1.x - (dx * cutProgress);
              const midY = p1.y - (dy * cutProgress);
              this.drawDashedLine(p1.x, p1.y, midX, midY, '#FFFFFF', distance);
              this.drawDashedLine(p2.x, p2.y, midX + (dx * 0.1), midY + (dy * 0.1), '#FFFFFF', distance);
              this.ctx.beginPath(); this.ctx.arc(midX, midY, 3, 0, Math.PI * 2); this.ctx.fillStyle = '#2AE6B2'; this.ctx.fill();
            } else {
              this.drawDashedLine(p1.x, p1.y, p2.x, p2.y, '#FFFFFF', distance);
            }
          }
        }
      }
  }

  updateAndDrawParticles(currentTime, limitedDelta) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];

        if (p.isExploding) continue;

        p.isFleeing = false; // Reseta o estado de fuga
        this.applyParticleRepulsion(p, limitedDelta);
        if (this.isMouseInside) {
            this.applyMouseRepulsion(p, limitedDelta);
            this.checkPursuit(p, limitedDelta, i);
        }
        else {
            p.pursuitTimer = 0;
        }

        // --- Lógica para evitar cantos --- 
        this.avoidCorners(p, limitedDelta);

        // --- Movimento Normal --- 
        const time = currentTime * 0.001;
        const wobbleX = Math.sin(time * p.wobble.frequency + p.wobble.offset) * p.wobble.amplitude;
        const wobbleY = Math.cos(time * p.wobble.frequency + p.wobble.offset + Math.PI/4) * p.wobble.amplitude;

        // Usa a velocidade base (lenta/rápida) a menos que esteja fugindo
        const speedToUse = p.isFleeing ? p.currentSpeed : p.baseSpeed;

        p.velocity.x += Math.cos(p.direction) * speedToUse * 0.1 * limitedDelta + wobbleX * 0.01 * limitedDelta;
        p.velocity.y += Math.sin(p.direction) * speedToUse * 0.1 * limitedDelta + wobbleY * 0.01 * limitedDelta;

        // Amortecimento
        p.velocity.x *= 0.96;
        p.velocity.y *= 0.96;

        // Limita a velocidade MÁXIMA, mas permite velocidades baixas
        this.limitVelocity(p, 2.5); // Limite superior

        // Garante uma velocidade MÍNIMA (exceto se estiver quase parado por repulsão)
        const currentSpeedSq = p.velocity.x**2 + p.velocity.y**2;
        const minSpeedThreshold = 0.01;
        if (currentSpeedSq < minSpeedThreshold**2 && currentSpeedSq > 0.0001) {
            const scale = minSpeedThreshold / Math.sqrt(currentSpeedSq);
            p.velocity.x *= scale;
            p.velocity.y *= scale;
        }

        // Atualizar posição
        p.x += p.velocity.x * limitedDelta;
        p.y += p.velocity.y * limitedDelta;

        // Atualizar direção
        if (Math.abs(p.velocity.x) > 0.01 || Math.abs(p.velocity.y) > 0.01) { p.direction = Math.atan2(p.velocity.y, p.velocity.x); }

        // Mudança aleatória de direção
        p.directionChangeTimer -= limitedDelta;
        if (p.directionChangeTimer <= 0) { p.direction = this.lerpAngle(p.direction, Math.random() * Math.PI * 2, 0.3); p.directionChangeTimer = Math.random() * 200 + 100; }

        // --- Rebote nas bordas (mantido como fallback, mas avoidCorners deve prevenir a maioria) ---
        const padding = p.size / 2 + 5;
        if (p.x < padding) { p.x = padding; p.velocity.x = Math.abs(p.velocity.x) * 0.5; }
        else if (p.x > this.width - padding) { p.x = this.width - padding; p.velocity.x = -Math.abs(p.velocity.x) * 0.5; }
        if (p.y < padding) { p.y = padding; p.velocity.y = Math.abs(p.velocity.y) * 0.5; }
        else if (p.y > this.height - padding) { p.y = this.height - padding; p.velocity.y = -Math.abs(p.velocity.y) * 0.5; }

        p.rotation += p.rotationSpeed * limitedDelta;

        // --- Lógica de corte da tesoura ---
        if (p.isScissors && !p.isCutting && p.cuttingTimer <= 0 && Math.random() < 0.01) { this.tryStartCutting(p, i); }
        this.updateCuttingProgress(p, i, limitedDelta);

        // --- Desenhar Partícula ---
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rotation * Math.PI / 180);
        this.ctx.globalAlpha = 0.7;
        if (this.icons[p.iconIndex]) {
          this.ctx.drawImage(this.icons[p.iconIndex], -p.size / 2, -p.size / 2, p.size, p.size);
        } else { this.ctx.fillStyle = 'red'; this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); }
        this.ctx.restore();
      }
  }

  // --- Funções de Repulsão e Interação --- 

  applyParticleRepulsion(particle, deltaTime) {
    for (const other of this.particles) {
      if (particle.id === other.id || particle.isExploding || other.isExploding) continue;
      const dx = particle.x - other.x;
      const dy = particle.y - other.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      distance = Math.max(distance, 1);

      let repulsionMultiplier = 1.0;
      let baseRepulsionStrength = this.options.repulsionStrength;

      if (particle.iconIndex === other.iconIndex) {
          repulsionMultiplier = this.options.sameIconRepulsionMultiplier;
          baseRepulsionStrength *= 1.5;
      }

      const minDistance = ((particle.size + other.size) / 2 + this.options.minDistanceBetweenParticles) * repulsionMultiplier;

      if (distance < minDistance) {
        const forceMagnitude = Math.pow((minDistance - distance) / minDistance, 2) * baseRepulsionStrength * 50 * deltaTime;
        const angle = Math.atan2(dy, dx);
        particle.velocity.x += Math.cos(angle) * forceMagnitude;
        particle.velocity.y += Math.sin(angle) * forceMagnitude;
      }
    }
  }

  applyMouseRepulsion(particle, deltaTime) {
      if (particle.isExploding) return;
      const dx = particle.x - this.mousePos.x;
      const dy = particle.y - this.mousePos.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      distance = Math.max(distance, 1);
      const repulsionRadius = this.options.mouseRepulsionRadius;

      if (distance < repulsionRadius) {
          particle.isFleeing = true; // Marca que está fugindo
          const proximity = (repulsionRadius - distance) / repulsionRadius;
          const forceMagnitude = Math.pow(proximity, 2) * this.options.mouseRepulsionStrength * 50 * deltaTime;
          const angle = Math.atan2(dy, dx);
          const driftAngle = angle + Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1);
          const driftMagnitude = forceMagnitude * 0.2;

          particle.velocity.x += Math.cos(angle) * forceMagnitude + Math.cos(driftAngle) * driftMagnitude;
          particle.velocity.y += Math.sin(angle) * forceMagnitude + Math.sin(driftAngle) * driftMagnitude;

          // Aumenta a velocidade atual temporariamente enquanto foge
          particle.currentSpeed = Math.min(this.options.maxBaseSpeed * 1.5, particle.baseSpeed + forceMagnitude * 0.5);
      } else {
          // Retorna gradualmente à velocidade base se não estiver fugindo
          particle.currentSpeed = this.lerp(particle.currentSpeed, particle.baseSpeed, 0.05 * deltaTime);
      }
  }

  avoidCorners(particle, deltaTime) {
      const avoidancePadding = this.options.borderPadding * 1.5; // Área de influência maior que o padding inicial
      const strength = this.options.cornerAvoidanceStrength * deltaTime;
      let forceX = 0;
      let forceY = 0;

      // Evitar borda esquerda
      if (particle.x < avoidancePadding) {
          forceX += (avoidancePadding - particle.x) / avoidancePadding;
      }
      // Evitar borda direita
      if (particle.x > this.width - avoidancePadding) {
          forceX -= (particle.x - (this.width - avoidancePadding)) / avoidancePadding;
      }
      // Evitar borda superior
      if (particle.y < avoidancePadding) {
          forceY += (avoidancePadding - particle.y) / avoidancePadding;
      }
      // Evitar borda inferior
      if (particle.y > this.height - avoidancePadding) {
          forceY -= (particle.y - (this.height - avoidancePadding)) / avoidancePadding;
      }

      // Aplica a força de afastamento das bordas
      if (forceX !== 0 || forceY !== 0) {
          particle.velocity.x += forceX * strength;
          particle.velocity.y += forceY * strength;
      }
  }

  checkPursuit(particle, deltaTime, index) {
      if (particle.isExploding) return;
      const dx = particle.x - this.mousePos.x;
      const dy = particle.y - this.mousePos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.options.pursuitDistanceThreshold) {
          particle.pursuitTimer += deltaTime;
      } else {
          particle.pursuitTimer = Math.max(0, particle.pursuitTimer - deltaTime * 3);
      }

      if (particle.pursuitTimer >= this.options.pursuitTimeThreshold) {
          this.triggerExplosion(particle.x, particle.y, particle.id);
          particle.isExploding = true;
          particle.pursuitTimer = 0;
          setTimeout(() => {
              const exists = this.particles.some(p => p.id === particle.id && p.isExploding);
              if (exists) {
                  this.createParticles(particle.id);
              }
          }, 800);
      }
  }

  triggerExplosion(x, y, id) {
      const explosion = {
          x, y, id: `explosion-${id}-${Date.now()}`,
          particles: [],
          life: this.options.explosionDuration
      };
      for (let i = 0; i < this.options.explosionParticles; i++) {
          explosion.particles.push({
              x: 0, y: 0,
              vx: this.randomBetween(-4, 4),
              vy: this.randomBetween(-4, 4),
              size: this.randomBetween(2, 6),
              alpha: 1
          });
      }
      this.explosionEffects.push(explosion);
  }

  updateAndDrawExplosions(limitedDelta) {
      for (let i = this.explosionEffects.length - 1; i >= 0; i--) {
          const explosion = this.explosionEffects[i];
          explosion.life -= limitedDelta;

          if (explosion.life <= 0) {
              this.explosionEffects.splice(i, 1);
              continue;
          }

          this.ctx.save();
          this.ctx.translate(explosion.x, explosion.y);
          const lifeRatio = Math.max(0, explosion.life / this.options.explosionDuration);

          for (const p of explosion.particles) {
              p.x += p.vx * limitedDelta;
              p.y += p.vy * limitedDelta;
              p.alpha = lifeRatio;
              p.vx *= 0.97;
              p.vy *= 0.97;
              p.vy += 0.05 * limitedDelta;

              this.ctx.beginPath();
              this.ctx.arc(p.x, p.y, p.size * lifeRatio, 0, Math.PI * 2);
              this.ctx.fillStyle = `rgba(42, 230, 178, ${p.alpha * 0.9})`;
              this.ctx.fill();
          }
          this.ctx.restore();
      }
  }

  // --- Funções Auxiliares --- 

  handleMouseMove(event) {
      const rect = event.currentTarget.getBoundingClientRect();
      this.mousePos.x = event.clientX - rect.left;
      this.mousePos.y = event.clientY - rect.top;
      this.isMouseInside = true;
  }

  tryStartCutting(particle, index) {
      if (particle.isExploding) return;
      const p1OriginalIndex = this.particles.findIndex(p => p.id === particle.id);
      for (let j = 0; j < this.particles.length; j++) {
          const p2 = this.particles[j];
          if (particle.id === p2.id || p2.isExploding) continue;
          const dx2 = particle.x - p2.x;
          const dy2 = particle.y - p2.y;
          const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (distance2 < this.options.connectionDistance && Math.random() < 0.2) {
              particle.isCutting = true;
              particle.cutTarget = p2.id;
              const p2OriginalIndex = this.particles.findIndex(p => p.id === p2.id);
              this.cuttingLines.push({ p1: p1OriginalIndex, p2: p2OriginalIndex, progress: 0 });
              break;
          }
      }
  }

  updateCuttingProgress(particle, index, limitedDelta) {
      if (particle.isExploding || !particle.isCutting || particle.cutTarget === null) {
          if (particle.cuttingTimer > 0) particle.cuttingTimer -= limitedDelta;
          return;
      }
      const p1OriginalIndex = this.particles.findIndex(p => p.id === particle.id);
      const p2OriginalIndex = this.particles.findIndex(p => p.id === particle.cutTarget);

      const targetIndex = this.cuttingLines.findIndex(cut =>
          (cut.p1 === p1OriginalIndex && cut.p2 === p2OriginalIndex) ||
          (cut.p1 === p2OriginalIndex && cut.p2 === p1OriginalIndex)
      );

      if (targetIndex !== -1) {
          this.cuttingLines[targetIndex].progress += 0.01 * limitedDelta;
          if (this.cuttingLines[targetIndex].progress >= 1) {
              this.cuttingLines.splice(targetIndex, 1);
              particle.isCutting = false;
              particle.cutTarget = null;
              particle.cuttingTimer = 100;
          }
      } else {
          particle.isCutting = false;
          particle.cutTarget = null;
      }
  }

  limitVelocity(particle, maxSpeed) {
      const speedSq = particle.velocity.x**2 + particle.velocity.y**2;
      if (speedSq > maxSpeed**2) {
          const speed = Math.sqrt(speedSq);
          const ratio = maxSpeed / speed;
          particle.velocity.x *= ratio;
          particle.velocity.y *= ratio;
      }
  }

  drawDashedLine(x1, y1, x2, y2, color, totalDistance) {
    this.ctx.beginPath();
    this.ctx.setLineDash([this.options.dashLength, this.options.dashGap]);
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = this.options.lineWidth;
    const opacity = Math.max(0.1, this.options.lineOpacity * (1 - totalDistance / this.options.connectionDistance));
    this.ctx.globalAlpha = opacity;
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.globalAlpha = 1.0;
  }

  resize() {
    if (!this.canvas || !this.ctx) return;
    const heroElement = document.querySelector('.hero');
    if (!heroElement) return;
    this.width = heroElement.clientWidth;
    this.height = heroElement.clientHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    if (this.options.responsive && this.initialized) {
        this.createParticles();
    }
  }

  randomBetween(min, max) { return Math.random() * (max - min) + min; }
  lerp(start, end, amount) { return start + (end - start) * amount; }
  lerpAngle(start, end, amount) {
      let difference = end - start;
      while (difference < -Math.PI) difference += Math.PI * 2;
      while (difference > Math.PI) difference -= Math.PI * 2;
      return start + difference * amount;
  }
}

document.addEventListener('DOMContentLoaded', () => { new EditorBackground(); });

