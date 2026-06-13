import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Intro from '@/components/Intro';
import SplitSection from '@/components/SplitSection';
import Services from '@/components/Services';
import WhySection from '@/components/WhySection';
import CTABand from '@/components/CTABand';
import StorePromo from '@/components/StorePromo';
import Certifications from '@/components/Certifications';
import ContactForm from '@/components/ContactForm';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Header />
      <main id="top">
        <Hero />
        <Intro />
        <SplitSection />
        <Services />
        <WhySection />
        <CTABand />
        <StorePromo />
        <Certifications />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}
