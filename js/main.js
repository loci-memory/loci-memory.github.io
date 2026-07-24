/**
 * LOCI-Memory Research Showcase - Main Script (Light Theme)
 * Handles real-time interactive canvas visualizer, floating navigation ScrollSpy,
 * gallery filter tabs, and BibTeX copy utility.
 */

document.addEventListener('DOMContentLoaded', () => {
  initFloatingNav();
  initMemoryCanvas();
  initShowcaseTabs();
  initDemoCardCanvases();
  initBibtexCopy();
});

/* ==========================================================================
   1. Floating Navigation Bar & ScrollSpy
   ========================================================================== */
function initFloatingNav() {
  const floatingNav = document.getElementById('floatingNav');
  const navTrigger = document.getElementById('navTrigger');
  const navLinks = document.querySelectorAll('.floating-nav-link');
  const sections = document.querySelectorAll('header[id], section[id]');

  // Toggle nav drawer on click for mobile/touch
  if (navTrigger) {
    navTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      floatingNav.classList.toggle('active');
    });
  }

  // Close drawer when clicking outside
  document.addEventListener('click', (e) => {
    if (floatingNav && !floatingNav.contains(e.target)) {
      floatingNav.classList.remove('active');
    }
  });

  // ScrollSpy - highlight active section
  window.addEventListener('scroll', () => {
    let currentSection = '';
    const scrollPos = window.scrollY + 200;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        currentSection = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSection}`) {
        link.classList.add('active');
      }
    });
  });
}

/* ==========================================================================
   2. Real-Time Spatial Loci Memory Visualizer (Canvas Engine)
   ========================================================================== */
function initMemoryCanvas() {
  const canvas = document.getElementById('memoryCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Resize handling
  function resizeCanvas() {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Environment Rooms Data
  const rooms = [
    { name: 'Living Room', x: 0.1, y: 0.1, w: 0.35, h: 0.4, color: 'rgba(2, 132, 199, 0.05)' },
    { name: 'Office', x: 0.55, y: 0.1, w: 0.35, h: 0.4, color: 'rgba(124, 58, 237, 0.05)' },
    { name: 'Kitchen', x: 0.1, y: 0.55, w: 0.35, h: 0.35, color: 'rgba(5, 150, 105, 0.05)' },
    { name: 'Bedroom', x: 0.55, y: 0.55, w: 0.35, h: 0.35, color: 'rgba(217, 119, 6, 0.05)' }
  ];

  // Generate Topological Loci Graph Nodes
  let nodes = [];
  let edges = [];
  let obstacle = null;
  let target = { x: 0.8, y: 0.2, label: 'Target: Keys' };
  let agent = { x: 0.2, y: 0.3, vx: 0, vy: 0, pathIndex: 0 };
  let activePath = [];
  let pulseRadius = 0;

  function generateGraph() {
    nodes = [];
    edges = [];

    // Room center nodes
    rooms.forEach(r => {
      for (let i = 0; i < 8; i++) {
        nodes.push({
          x: r.x + 0.05 + Math.random() * (r.w - 0.1),
          y: r.y + 0.05 + Math.random() * (r.h - 0.1),
          activated: false,
          room: r.name
        });
      }
    });

    // Corridor connecting nodes
    for (let i = 0; i < 8; i++) {
      nodes.push({
        x: 0.46 + (Math.random() * 0.08 - 0.04),
        y: 0.15 + i * 0.1,
        activated: false,
        room: 'Corridor'
      });
    }

    // Connect close nodes (edges)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        if (dist < 0.22) {
          edges.push({ i, j, dist });
        }
      }
    }
  }

  generateGraph();

  // Compute Path to Target
  function computePath() {
    activePath = [];
    if (nodes.length === 0) return;

    // Find start & end nodes nearest to agent & target
    let startIdx = 0, endIdx = 0;
    let minDistStart = Infinity, minDistEnd = Infinity;

    nodes.forEach((n, idx) => {
      const dStart = Math.hypot(n.x - agent.x, n.y - agent.y);
      const dEnd = Math.hypot(n.x - target.x, n.y - target.y);
      if (dStart < minDistStart) { minDistStart = dStart; startIdx = idx; }
      if (dEnd < minDistEnd) { minDistEnd = dEnd; endIdx = idx; }
    });

    // Simple BFS/Shortest Path on graph
    const queue = [[startIdx]];
    const visited = new Set([startIdx]);

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      if (current === endIdx) {
        activePath = path;
        break;
      }

      // Find neighbors
      edges.forEach(e => {
        let neighbor = null;
        if (e.i === current) neighbor = e.j;
        if (e.j === current) neighbor = e.i;

        // Skip blocked nodes if obstacle exists
        if (neighbor !== null && !visited.has(neighbor)) {
          if (obstacle) {
            const nNode = nodes[neighbor];
            const obDist = Math.hypot(nNode.x - obstacle.x, nNode.y - obstacle.y);
            if (obDist < obstacle.r) return; // Blocked!
          }

          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      });
    }

    agent.pathIndex = 0;
  }

  computePath();

  // Preset Handlers
  const promptButtons = document.querySelectorAll('#promptControls .prompt-btn');
  promptButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      promptButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const preset = btn.dataset.preset;
      obstacle = null;

      if (preset === 'search-keys') {
        agent.x = 0.2; agent.y = 0.3;
        target = { x: 0.8, y: 0.2, label: 'Target: Keys' };
      } else if (preset === 'multi-room') {
        agent.x = 0.75; agent.y = 0.25;
        target = { x: 0.2, y: 0.75, label: 'Target: Dock' };
      } else if (preset === 'obstacle-bypass') {
        agent.x = 0.2; agent.y = 0.3;
        target = { x: 0.8, y: 0.75, label: 'Target: Bedroom' };
        obstacle = { x: 0.48, y: 0.45, r: 0.12, label: 'Spill Hazard' };
      } else if (preset === 'full-scan') {
        generateGraph();
        agent.x = 0.48; agent.y = 0.5;
        target = { x: 0.85, y: 0.85, label: 'Loci Scan' };
      }

      computePath();
    });
  });

  const btnReset = document.getElementById('btnResetCanvas');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      agent.x = 0.2; agent.y = 0.3;
      obstacle = null;
      generateGraph();
      computePath();
    });
  }

  // Animation Render Loop
  function animate() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw Room Regions
    rooms.forEach(r => {
      ctx.fillStyle = r.color;
      ctx.fillRect(r.x * w, r.y * h, r.w * w, r.h * h);

      ctx.strokeStyle = 'rgba(203, 213, 225, 0.8)';
      ctx.strokeRect(r.x * w, r.y * h, r.w * w, r.h * h);

      ctx.fillStyle = '#475569';
      ctx.font = '500 12px Inter';
      ctx.fillText(r.name, r.x * w + 10, r.y * h + 20);
    });

    // Draw Edges
    edges.forEach(e => {
      const n1 = nodes[e.i];
      const n2 = nodes[e.j];
      ctx.beginPath();
      ctx.moveTo(n1.x * w, n1.y * h);
      ctx.lineTo(n2.x * w, n2.y * h);
      ctx.strokeStyle = 'rgba(2, 132, 199, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Highlight Active Recalled Path
    if (activePath.length > 1) {
      ctx.beginPath();
      for (let i = 0; i < activePath.length; i++) {
        const n = nodes[activePath[i]];
        if (i === 0) ctx.moveTo(n.x * w, n.y * h);
        else ctx.lineTo(n.x * w, n.y * h);
      }
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Draw Obstacle if present
    if (obstacle) {
      ctx.beginPath();
      ctx.arc(obstacle.x * w, obstacle.y * h, obstacle.r * w, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(225, 29, 72, 0.15)';
      ctx.fill();
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#e11d48';
      ctx.font = '600 11px Inter';
      ctx.fillText(`⚠️ ${obstacle.label}`, obstacle.x * w - 35, obstacle.y * h);
    }

    // Draw Loci Nodes
    nodes.forEach((n, idx) => {
      const isPathNode = activePath.includes(idx);
      ctx.beginPath();
      ctx.arc(n.x * w, n.y * h, isPathNode ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = isPathNode ? '#0284c7' : '#94a3b8';
      ctx.fill();
      if (isPathNode) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    // Draw Target Location Star
    ctx.beginPath();
    ctx.arc(target.x * w, target.y * h, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#d97706';
    ctx.fill();

    ctx.fillStyle = '#d97706';
    ctx.font = '600 11px Inter';
    ctx.fillText(target.label, target.x * w + 12, target.y * h + 4);

    // Update Agent Movement Along Active Path
    if (activePath.length > 0 && agent.pathIndex < activePath.length) {
      const targetNode = nodes[activePath[agent.pathIndex]];
      const dx = targetNode.x - agent.x;
      const dy = targetNode.y - agent.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 0.01) {
        agent.pathIndex = (agent.pathIndex + 1) % activePath.length;
      } else {
        agent.x += (dx / dist) * 0.003;
        agent.y += (dy / dist) * 0.003;
      }
    }

    // Draw Agent Robot Circle & Sensor Wave Pulse
    pulseRadius = (pulseRadius + 0.4) % 30;
    ctx.beginPath();
    ctx.arc(agent.x * w, agent.y * h, 10 + pulseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(5, 150, 105, ${1 - pulseRadius / 30})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(agent.x * w, agent.y * h, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#059669';
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 10px Inter';
    ctx.fillText('Agent', agent.x * w - 14, agent.y * h - 12);

    requestAnimationFrame(animate);
  }

  animate();
}

/* ==========================================================================
   3. Showcase Gallery Filter Tabs
   ========================================================================== */
function initShowcaseTabs() {
  const tabBtns = document.querySelectorAll('.showcase-tabs .tab-btn');
  const galleryCards = document.querySelectorAll('.gallery-card');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const category = btn.dataset.tab;

      galleryCards.forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/* ==========================================================================
   4. Gallery Card Mini Canvases (Animated Previews)
   ========================================================================== */
function initDemoCardCanvases() {
  const canvases = document.querySelectorAll('.demo-card-canvas');

  canvases.forEach(canvas => {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth || 320;
    canvas.height = parent.clientHeight || 220;
    const ctx = canvas.getContext('2d');
    const demoType = canvas.dataset.demoType;

    let frame = 0;

    function renderCardAnimation() {
      frame++;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Background grid
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.4)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 25) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 25) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      if (demoType === 'search') {
        // Multi-room agent search curve
        ctx.beginPath();
        ctx.moveTo(30, h - 30);
        ctx.bezierCurveTo(w * 0.3, 30, w * 0.6, h - 20, w - 40, 40);
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Pulsing node
        const t = (frame % 120) / 120;
        const px = 30 + t * (w - 70);
        const py = h/2 + Math.sin(t * Math.PI * 2) * 40;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#059669';
        ctx.fill();
      } else if (demoType === 'episodic') {
        // Temporal bar scan preview
        for (let i = 0; i < 15; i++) {
          const bh = 20 + Math.sin(frame * 0.05 + i) * 30 + 40;
          ctx.fillStyle = i === Math.floor((frame / 10) % 15) ? '#7c3aed' : 'rgba(124, 58, 237, 0.25)';
          ctx.fillRect(20 + i * 18, h - bh - 20, 12, bh);
        }
      } else if (demoType === 'obstacle') {
        // Dynamic obstacle avoidance path
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(225, 29, 72, 0.15)';
        ctx.fill();
        ctx.strokeStyle = '#e11d48';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(w / 2 + Math.cos(frame * 0.03) * 60, h / 2 + Math.sin(frame * 0.03) * 40, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#0284c7';
        ctx.fill();
      } else {
        // Real robot trajectory dots
        for (let i = 0; i < 8; i++) {
          const angle = (frame * 0.02) + (i * Math.PI / 4);
          const rx = w/2 + Math.cos(angle) * (50 + i * 5);
          const ry = h/2 + Math.sin(angle) * (30 + i * 3);
          ctx.beginPath();
          ctx.arc(rx, ry, 4, 0, Math.PI * 2);
          ctx.fillStyle = i === 0 ? '#d97706' : 'rgba(217, 119, 6, 0.4)';
          ctx.fill();
        }
      }

      requestAnimationFrame(renderCardAnimation);
    }

    renderCardAnimation();
  });
}

/* ==========================================================================
   5. BibTeX One-Click Copy Utility
   ========================================================================== */
function initBibtexCopy() {
  const btnCopy = document.getElementById('btnCopyBibtex');
  const bibtexText = document.getElementById('bibtexText');
  const toast = document.getElementById('toast');

  if (!btnCopy || !bibtexText) return;

  btnCopy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(bibtexText.innerText);
      showToast('BibTeX copied to clipboard!');
    } catch (err) {
      // Fallback copy method
      const textarea = document.createElement('textarea');
      textarea.value = bibtexText.innerText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('BibTeX copied to clipboard!');
    }
  });

  function showToast(msg) {
    if (!toast) return;
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}
