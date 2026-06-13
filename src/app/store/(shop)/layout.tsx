import StoreHeader from './StoreHeader';
import StoreFooter from './StoreFooter';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAF8]" style={{ fontFamily: 'var(--font-sans)' }}>
      <StoreHeader />
      <main>{children}</main>
      <StoreFooter />
    </div>
  );
}
