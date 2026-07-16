import React, { useRef, useEffect } from 'react';

const ParticlesBackground = ({ className = '' }) => {
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);
  const particles = useRef([]);
  const pausedRef = useRef(false);

  const particleCount = 60; // ✅ reducido
  const maxVelocity = 0.25;
  const maxRadius = 1.2;
  const frameInterval = 1000 / 30; // tope ~30fps: no hace falta más para partículas lentas

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    // Colores simples
    const randomColor = () =>
      ['#ffffff', '#c2d3ff', '#d2bfff'][Math.floor(Math.random() * 3)];

    particles.current = Array.from({ length: particleCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * maxVelocity,
      vy: (Math.random() - 0.5) * maxVelocity,
      radius: Math.random() * maxRadius + 0.4,
      alpha: Math.random() * 0.5 + 0.4,
      color: randomColor()
    }));

    let lastTime = 0;
    const draw = (time = 0) => {
      animationFrameId.current = requestAnimationFrame(draw);

      // Con un modal abierto (aria-modal="true"), no repintamos: un canvas
      // animando detrás de un panel con backdrop-blur obliga al navegador a
      // recalcular ese blur en cada frame, y ahí es donde se siente el lag.
      if (pausedRef.current) return;

      if (time - lastTime < frameInterval) return;
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      particles.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    };

    animationFrameId.current = requestAnimationFrame(draw);

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const checkModalState = () => {
      pausedRef.current = !!document.querySelector('[aria-modal="true"]');
    };
    checkModalState();
    const observer = new MutationObserver(checkModalState);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-modal']
    });

    return () => {
      cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`${className} absolute inset-0 w-full h-full pointer-events-none z-0`}
    />
  );
};

export default ParticlesBackground;
