import Link from 'next/link';
import Image from 'next/image';
import { Home, Mail, ClipboardList, Package, Receipt, MessageCircle, ArrowUpRight } from 'lucide-react';

const IconInstagram = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);

const IconYoutube = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/>
  </svg>
);

const IconFacebook = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const WHATSAPP_NUMBER  = '919263699286';
const WHATSAPP_MESSAGE = encodeURIComponent('Hi! I need help with my RBS Store order.');

export default function StoreFooter() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: '#0b3b46', color: '#fff', position: 'relative', overflow: 'hidden' }}>

      {/* Subtle grid texture */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      {/* Ambient blobs */}
      <div aria-hidden="true" style={{
        position: 'absolute', right: -80, top: -80, width: 420, height: 420,
        borderRadius: '50%', background: 'rgba(199,131,54,0.07)', filter: 'blur(80px)', pointerEvents: 'none',
      }} />
      <div aria-hidden="true" style={{
        position: 'absolute', left: -60, bottom: -60, width: 320, height: 320,
        borderRadius: '50%', background: 'rgba(19,111,117,0.18)', filter: 'blur(70px)', pointerEvents: 'none',
      }} />

      {/* WhatsApp CTA band */}
      <div style={{ position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: 'rgba(37,211,102,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MessageCircle className="h-5 w-5" style={{ color: '#25D366' }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>Need help with your order?</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>Our team replies within minutes on WhatsApp.</p>
            </div>
          </div>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 shrink-0"
            style={{
              background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 13,
              padding: '10px 20px', borderRadius: 12, textDecoration: 'none',
            }}>
            <MessageCircle className="h-4 w-4" />
            Chat on WhatsApp
            <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
          </a>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14" style={{ position: 'relative' }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10">

          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div style={{
              background: 'rgba(255,255,255,0.08)', borderRadius: 14,
              padding: '10px 16px', display: 'inline-block', marginBottom: 16,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <Image src="/logo-rbs.svg" alt="Rahul Business Services" width={90} height={30}
                style={{ filter: 'brightness(0) invert(1)' }} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.65, maxWidth: 200 }}>
              Amazon marketplace growth partner for B2B businesses across India.
            </p>
            {/* Trust badges */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {['GST Registered', 'B2B Only', 'NEFT / RTGS'].map(badge => (
                <span key={badge} style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, padding: '3px 8px', color: 'rgba(255,255,255,0.45)',
                  textTransform: 'uppercase',
                }}>
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Store links */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>Store</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { href: '/store',        icon: Package,      label: 'Products'   },
                { href: '/store/cart',   icon: ClipboardList, label: 'Bulk list' },
                { href: '/store/orders', icon: Receipt,       label: 'My orders' },
              ].map(({ href, icon: Icon, label }) => (
                <li key={href}>
                  <Link href={href} className="flex items-center gap-2.5 group" style={{ textDecoration: 'none' }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.45)' }} />
                    </span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }} className="group-hover:text-white transition-colors">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>Company</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { href: '/',         icon: Home, label: 'Homepage'   },
                { href: '/#contact', icon: Mail, label: 'Contact us' },
              ].map(({ href, icon: Icon, label }) => (
                <li key={href}>
                  <Link href={href} className="flex items-center gap-2.5 group" style={{ textDecoration: 'none' }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.45)' }} />
                    </span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }} className="group-hover:text-white transition-colors">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* How it works */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>How it works</p>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                'Add products to your bulk list',
                'We confirm pricing within 1–2 days',
                'Pay via NEFT / RTGS — no limits',
              ].map((text, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, color: '#c78336',
                    background: 'rgba(199,131,54,0.12)', border: '1px solid rgba(199,131,54,0.2)',
                    borderRadius: 6, padding: '2px 7px', marginTop: 1, flexShrink: 0, lineHeight: 1.6,
                  }}>0{i + 1}</span>
                  <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{text}</span>
                </li>
              ))}
            </ol>
          </div>

        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 48, paddingTop: 24,
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', margin: 0 }}>
            &copy; {year} Rahul Business Services. All rights reserved.
          </p>

          {/* Social links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[
              { href: 'https://instagram.com', Icon: IconInstagram, label: 'Instagram' },
              { href: 'https://youtube.com',   Icon: IconYoutube,   label: 'YouTube'   },
              { href: 'https://facebook.com',  Icon: IconFacebook,  label: 'Facebook'  },
            ].map(({ href, Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={label}
                className="flex items-center gap-1.5 rounded-lg border transition-colors bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                style={{ padding: '6px 10px', textDecoration: 'none' }}
              >
                <span style={{ color: 'rgba(255,255,255,0.45)', display: 'flex' }}><Icon /></span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{label}</span>
              </a>
            ))}
          </div>

          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', margin: 0 }}>
            Made with care for Indian B2B &middot; Mumbai
          </p>
        </div>
      </div>

    </footer>
  );
}
