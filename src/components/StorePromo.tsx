'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, ShoppingBag, Package, ClipboardList } from 'lucide-react';

const HIGHLIGHTS = [
  { icon: Package,       text: 'Browse products & services'        },
  { icon: ClipboardList, text: 'Submit bulk order requests'         },
  { icon: ShoppingBag,   text: 'Pricing confirmed within 1–2 days'  },
];

const IMAGES = [
  { src: '/store-promo-1.png', alt: 'eCommerce analytics dashboard' },
  { src: '/store-promo-2.png', alt: 'B2B wholesale fulfilment'       },
  { src: '/store-promo-3.png', alt: 'Digital marketing content'      },
];

export default function StorePromo() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section className="section-shell" style={{ padding: '72px 0' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) auto',
        gap: 'clamp(32px,5vw,64px)',
        alignItems: 'center',
        borderRadius: 36,
        padding: 'clamp(36px,5vw,60px)',
        background: 'linear-gradient(135deg, #0b3b46 0%, #0d5560 50%, #13212a 100%)',
        color: '#fff',
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* Ambient blob */}
        <div style={{
          position: 'absolute', right: -60, top: -60,
          width: 340, height: 340, borderRadius: '50%',
          background: 'rgba(199,131,54,0.12)', filter: 'blur(60px)',
          pointerEvents: 'none',
        }} />

        {/* Left: copy */}
        <div style={{ position: 'relative' }}>
          <p style={{
            fontSize: 12, fontWeight: 900, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: '#f1c27b', marginBottom: 14,
          }}>
            RBS Store · Now live
          </p>
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.8rem,3.5vw,2.8rem)',
            lineHeight: 1.08, letterSpacing: '-0.03em', margin: '0 0 16px',
            color: '#fff',
          }}>
            Browse our services<br />
            <span style={{ fontStyle: 'italic', opacity: 0.85 }}>and place orders online.</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.6, margin: '0 0 28px', maxWidth: 440 }}>
            Our B2B store lets you explore the full catalogue, add to a bulk list, and submit a request — all in one place. No calls needed to get started.
          </p>

          {/* Highlights */}
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.72)', fontSize: 14 }}>
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(255,255,255,0.08)', flexShrink: 0,
                }}>
                  <Icon size={13} />
                </span>
                {text}
              </li>
            ))}
          </ul>

          <Link
            href="/store"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#c78336', color: '#1a0e00',
              fontWeight: 800, fontSize: 14, textDecoration: 'none',
              padding: '13px 24px', borderRadius: 999,
            }}>
            Visit the store <ArrowUpRight size={15} />
          </Link>
        </div>

        {/* Right: petal fan */}
        <div className="store-promo-card-stack" style={{
          position: 'relative', flexShrink: 0,
          width: 520, height: 330,
        }}>
          {IMAGES.map(({ src, alt }, i) => {
            const rotations = [-34, 0, 34];
            const zIndices  = [1, 3, 2];
            const isHovered = hovered === i;
            return (
              <div
                key={src}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  position: 'absolute',
                  width: 243, height: 333,
                  left: 'calc(50% - 122px)',
                  bottom: 0,
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: isHovered
                    ? '1.5px solid rgba(255,255,255,0.55)'
                    : '1.5px solid rgba(255,255,255,0.18)',
                  boxShadow: isHovered
                    ? '0 28px 56px rgba(0,0,0,0.65)'
                    : '0 12px 32px rgba(0,0,0,0.45)',
                  transformOrigin: '50% 100%',
                  transform: isHovered
                    ? `rotate(${rotations[i]}deg) scale(1.08) translateY(-18px)`
                    : `rotate(${rotations[i]}deg)`,
                  zIndex: isHovered ? 10 : zIndices[i],
                  transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s ease, border-color 0.2s ease',
                  cursor: 'pointer',
                }}>
                <Image
                  src={src} alt={alt} fill
                  style={{
                    objectFit: 'cover',
                    transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1)',
                    transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                  }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: isHovered
                    ? 'linear-gradient(180deg, rgba(0,0,0,0.0) 50%, rgba(0,0,0,0.2) 100%)'
                    : 'linear-gradient(180deg, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.28) 100%)',
                  transition: 'background 0.3s ease',
                }} />
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
