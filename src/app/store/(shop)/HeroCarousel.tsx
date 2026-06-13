'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';

const SLIDES = [
  {
    eyebrow:  'RBS · B2B Wholesale',
    line1:    'Browse. Request.',
    line2:    'We handle the rest.',
    body:     'Add to your bulk list or request a sample — pricing confirmed within 1–2 business days.',
    bg:       '#0b3b46',
    blob1:    '#136f75',
    blob2:    '#c78336',
    accent:   '#c78b36',
    image:    '/carousel-1.png',
  },
  {
    eyebrow:  'eCommerce Solutions',
    line1:    'Your store,',
    line2:    'fully optimised.',
    body:     'End-to-end eCommerce management — catalogues, pricing strategy, and performance analytics.',
    bg:       '#0f1f0a',
    blob1:    '#16a34a',
    blob2:    '#15803d',
    accent:   '#86efac',
    image:    '/carousel-2.png',
  },
  {
    eyebrow:  'Digital Engineering',
    line1:    'Custom-built,',
    line2:    'ready to scale.',
    body:     'Storefronts, integrations, and automations engineered for B2B workflows that never sleep.',
    bg:       '#071520',
    blob1:    '#0e7490',
    blob2:    '#0369a1',
    accent:   '#38bdf8',
    image:    '/carousel-3.png',
  },
  {
    eyebrow:  'Amazon Marketplace',
    line1:    'Sell smarter,',
    line2:    'rank higher.',
    body:     'Full-stack Amazon growth: optimised listings, sponsored ads, A+ content, and brand registry.',
    bg:       '#160d30',
    blob1:    '#4338ca',
    blob2:    '#7c3aed',
    accent:   '#a78bfa',
    image:    '/carousel-4.png',
  },
  {
    eyebrow:  'Social Commerce',
    line1:    'Turn followers',
    line2:    'into buyers.',
    body:     'Instagram, WhatsApp, and quick-commerce integrations that convert your audience directly.',
    bg:       '#1a0520',
    blob1:    '#9333ea',
    blob2:    '#db2777',
    accent:   '#f0abfc',
    image:    '/carousel-5.png',
  },
  {
    eyebrow:  'Media & Design',
    line1:    'Visuals that',
    line2:    'stop the scroll.',
    body:     'Product photography, A+ creatives, lifestyle imagery and motion content built for conversion.',
    bg:       '#1c0900',
    blob1:    '#c2410c',
    blob2:    '#92400e',
    accent:   '#fb923c',
    image:    '/carousel-6.png',
  },
];

const DURATION = 5000;

export default function HeroCarousel() {
  const [active, setActive]   = useState(0);
  const [paused, setPaused]   = useState(false);
  const [progKey, setProgKey] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function goTo(i: number) {
    setActive(i);
    setProgKey(k => k + 1);
  }

  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => {
      setActive(a => (a + 1) % SLIDES.length);
      setProgKey(k => k + 1);
    }, DURATION);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused, active]);

  const s = SLIDES[active];

  return (
    <div
      className="relative overflow-hidden rounded-2xl mt-6 mb-8 select-none"
      style={{
        height: 'clamp(240px, 30vw, 340px)',
        backgroundColor: s.bg,
        transition: 'background-color 0.8s cubic-bezier(0.4,0,0.2,1)',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}>

      {/* ── Background image (cross-fades between slides) ── */}
      <AnimatePresence>
        <motion.div
          key={`img-${active}`}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}>
          <Image
            src={s.image}
            alt={s.eyebrow}
            fill
            priority={active === 0}
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
          {/* Dark overlay so text stays readable */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.38) 55%, rgba(0,0,0,0.15) 100%)',
          }} />
        </motion.div>
      </AnimatePresence>

      {/* ── Ambient blobs (CSS-transitioned) ── */}
      <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full blur-3xl pointer-events-none"
           style={{ background: s.blob1 + '28', transition: 'background 0.8s ease' }} />
      <div className="absolute -left-10 -bottom-8 w-56 h-56 rounded-full blur-3xl pointer-events-none"
           style={{ background: s.blob1 + '30', transition: 'background 0.8s ease' }} />

      {/* ── Slide content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          className="absolute inset-0 flex flex-col justify-between px-6 sm:px-12 py-7 sm:py-12"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}>

          <div className="max-w-lg">
            {/* Eyebrow */}
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.4 }}
              className="text-[10px] font-semibold uppercase tracking-[0.26em] mb-4"
              style={{ color: s.accent, fontFamily: 'var(--font-sans)' }}>
              {s.eyebrow}
            </motion.p>

            {/* Headline */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="font-normal leading-[1.08] mb-4 text-white"
              style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.7rem, 4.2vw, 2.8rem)' }}>
              <span className="italic">{s.line1}</span><br />
              {s.line2}
            </motion.h2>

            {/* Body */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 0.26, duration: 0.5 }}
              className="text-white text-[12px] sm:text-[13.5px] leading-relaxed max-w-[300px]"
              style={{ fontFamily: 'var(--font-sans)' }}>
              {s.body}
            </motion.p>
          </div>

          {/* ── Progress dots ── */}
          <div className="flex items-center gap-[7px]">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Slide ${i + 1}`}
                className="relative rounded-full overflow-hidden transition-all duration-300 cursor-pointer"
                style={{
                  height: 3,
                  width: i === active ? 28 : 10,
                  background: 'rgba(255,255,255,0.30)',
                }}>
                {i === active && (
                  <motion.div
                    key={progKey}
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.9)' }}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: DURATION / 1000, ease: 'linear' }}
                  />
                )}
              </button>
            ))}
          </div>

        </motion.div>
      </AnimatePresence>

      {/* ── Slide counter ── */}
      <div className="absolute top-4 right-5 text-white/30 font-mono text-[11px] tracking-wider pointer-events-none">
        {String(active + 1).padStart(2, '0')}&thinsp;/&thinsp;{String(SLIDES.length).padStart(2, '0')}
      </div>

    </div>
  );
}
