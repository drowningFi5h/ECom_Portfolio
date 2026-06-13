import Image from 'next/image';
import { proofPoints } from '@/lib/data';

export default function SplitSection() {
  return (
    <section className="split section-shell">
      <div className="image-panel">
        <Image
          src="/End-to-end support for marketplace teams.png"
          alt="End-to-end support for marketplace teams"
          width={600}
          height={440}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
        />
      </div>
      <div>
        <p className="eyebrow">Approved-workflow mindset</p>
        <h2>End-to-end support for marketplace teams.</h2>
        <p>
          Our specialists combine catalog operations, creative production, seller account support, and digital marketing so your internal team can focus on strategy, supply, and customers.
        </p>
        <ul className="check-list">
          {proofPoints.map((point) => <li key={point}>{point}</li>)}
        </ul>
      </div>
    </section>
  );
}
