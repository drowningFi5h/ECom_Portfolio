import Image from 'next/image';
import { certifications } from '@/lib/data';

export default function Certifications() {
  return (
    <section className="certifications section-shell">
      <div className="section-heading">
        <p className="eyebrow">Partnerships &amp; Certifications</p>
        <h2>Recognized partnerships that back our delivery quality.</h2>
      </div>
      <div className="cert-grid">
        {certifications.map((cert) => (
          <article key={cert.title}>
            <Image className="cert-logo" src={cert.logo} alt={cert.title} width={80} height={80} loading="lazy" />
            <h3>{cert.title}</h3>
          </article>
        ))}
      </div>
    </section>
  );
}
