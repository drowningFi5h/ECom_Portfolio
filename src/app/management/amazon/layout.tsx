import type { Metadata } from 'next';
import AmazonNav from './AmazonNav';

export const metadata: Metadata = { title: 'Amazon Automation · RBS Admin' };

export default function AmazonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--amz-cream)' }}>
      <AmazonNav />
      <main>{children}</main>
    </div>
  );
}
