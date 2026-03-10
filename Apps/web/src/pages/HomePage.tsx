import React, { Suspense } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import NavBar from '../components/NavBar/NavBar';
import HeroSection from '../components/HeroSection/HeroSection';

const AgeGroupSelector = React.lazy(() => import('../components/AgeGroupSelector/AgeGroupSelector'));
const FeaturesGrid = React.lazy(() => import('../components/FeaturesGrid/FeaturesGrid'));
const HowItWorks = React.lazy(() => import('../components/HowItWorks/HowItWorks'));
const SafetyBanner = React.lazy(() => import('../components/SafetyBanner/SafetyBanner'));
const TestimonialCarousel = React.lazy(() => import('../components/TestimonialCarousel/TestimonialCarousel'));
const CTASection = React.lazy(() => import('../components/CTASection/CTASection'));
const Footer = React.lazy(() => import('../components/Footer/Footer'));

const SectionSkeleton: React.FC = () => (
  <div
    style={{
      height: '400px',
      background: 'var(--bg-surface)',
      borderRadius: '24px',
      margin: '2rem',
      opacity: 0.5,
    }}
    aria-hidden="true"
  />
);

export default function HomePage() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t, isRTL } = useLanguage();

  return (
    <div
      data-theme={theme}
      dir={isRTL ? 'rtl' : 'ltr'}
      lang={lang}
      style={{
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-body)',
        minHeight: '100vh',
      }}
    >
      <NavBar
        theme={theme}
        onToggleTheme={toggleTheme}
        lang={lang}
        onSetLang={setLang}
        t={t}
      />
      <main id="main-content">
        <HeroSection t={t} lang={lang} />
        <Suspense fallback={<SectionSkeleton />}>
          <AgeGroupSelector t={t} />
          <FeaturesGrid t={t} />
          <HowItWorks t={t} />
          <SafetyBanner t={t} />
          <TestimonialCarousel t={t} />
          <CTASection t={t} />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer t={t} lang={lang} onSetLang={setLang} />
      </Suspense>
    </div>
  );
}
