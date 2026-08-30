import type { CSSProperties } from 'react';
import { Check, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  GRID_ASSESSMENTS,
  HOW_IT_WORKS_STEPS,
  PREMIUM_BENEFITS,
  PROFILE_DIMENSIONS,
  PROFILE_DOT_COUNT,
  SECTION_IDS,
  TRUST_POINTS,
} from '@/content/landing';
import { CtaLink } from '../CtaLink';
import { NuraLogo } from '../Header';
import { FaqList } from '../FaqList';
import { ResultCard } from '../ResultCard';
import { RevealLines } from '../RevealLines';
import { LocaleSwitcher } from '../LocaleSwitcher';

/* ---------------------------------------------------------------- hero --- */

export function Hero() {
  const t = useTranslations('hero');
  return (
    <section className="hero" id={SECTION_IDS.top}>
      <div className="hero-inner wrap">
        <div className="hero-content reveal-group">
          <p className="eyebrow eyebrow-light reveal-item">{t('eyebrow')}</p>
          <RevealLines as="h1" lines={[t('titleLine1'), t('titleLine2')]} accentFrom={1} />
          <p className="hero-sub reveal-item" style={{ '--i': 2 } as CSSProperties}>
            {t('subtitle')}
          </p>
          <div className="hero-actions reveal-item" style={{ '--i': 3 } as CSSProperties}>
            {/* Para o catalogo, nao para a avaliacao em destaque: quem chega
                nao sabe qual teste quer, e escolher por ele custa um clique a
                mais para todo mundo que queria outro. */}
            <CtaLink to="catalog">{t('cta')}</CtaLink>
          </div>
          <div className="hero-meta reveal-item" style={{ '--i': 4 } as CSSProperties}>
            <span>{t('metaFree')}</span>
            <i />
            <span>{t('metaInstant')}</span>
            <i />
            <span>{t('metaNoCard')}</span>
          </div>
        </div>
      </div>
      <div className="scroll-hint-wrapper wrap">
        <div className="scroll-hint">
          <span />
          {t('scrollHint')}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- statement --- */

export function Statement() {
  const t = useTranslations('statement');
  return (
    <section className="statement dark">
      <div className="wrap statement-inner reveal">
        <h2 className="reveal-display">
          {t('titleStart')}
          <em>{t('titleEmphasis')}</em>
        </h2>
        <p className="statement-copy">{t('copy')}</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ featured --- */

export function FeaturedAssessment() {
  const t = useTranslations('featured');
  return (
    <section className="section featured dark" id={SECTION_IDS.featured}>
      <div className="wrap featured-grid">
        <div className="reveal-group">
          <p className="eyebrow eyebrow-light reveal-item">{t('eyebrow')}</p>
          <RevealLines
            lines={[t('titleLine1'), t('titleLine2'), t('titleLine3')]}
            accentFrom={1}
          />
          <p className="featured-copy reveal-item" style={{ '--i': 2 } as CSSProperties}>
            {t('copy')}
          </p>
          <div className="detail-row reveal-item" style={{ '--i': 3 } as CSSProperties}>
            <span>
              <strong>{t('durationValue')}</strong>
              {t('durationLabel')}
            </span>
            <span>
              <strong>{t('freeValue')}</strong>
              {t('freeLabel')}
            </span>
            <span>
              <strong>{t('cardValue')}</strong>
              {t('cardLabel')}
            </span>
          </div>
          <div className="reveal-item" style={{ '--i': 4 } as CSSProperties}>
            <CtaLink to="featured">{t('cta')}</CtaLink>
          </div>
          <p className="featured-note reveal-item" style={{ '--i': 5 } as CSSProperties}>
            {t('note')}
          </p>
        </div>
        <div className="spacer desktop-only" aria-hidden="true" />
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- paths --- */

export function AssessmentPaths() {
  const t = useTranslations('assessments');
  return (
    <section className="section paths" id={SECTION_IDS.assessments}>
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <p className="eyebrow">{t('sectionEyebrow')}</p>
            <RevealLines
              className="section-title"
              lines={[t('sectionTitleLine1'), t('sectionTitleLine2')]}
            />
          </div>
          <CtaLink to="catalog" className="text-link desktop-only" iconSize={15}>
            {t('seeAll')}
          </CtaLink>
        </div>
        <div className="path-grid reveal">
          {GRID_ASSESSMENTS.map((item) => (
            <article className="path-card" key={item.id}>
              <div>
                <span className="path-index">{item.index}</span>
                <h3>{t(`${item.id}.title`)}</h3>
                <p>{t(`${item.id}.description`)}</p>
              </div>
              <CtaLink to="catalog" className="path-action" iconSize={14}>
                {t('explore')}
              </CtaLink>
            </article>
          ))}
        </div>
        <CtaLink to="catalog" className="text-link path-more" iconSize={15}>
          {t('seeAll')}
        </CtaLink>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- how it works --- */

export function HowItWorks() {
  const t = useTranslations('how');
  return (
    <section className="section how" id={SECTION_IDS.howItWorks}>
      <div className="wrap">
        <div className="reveal-group">
          <p className="eyebrow reveal-item">{t('eyebrow')}</p>
          <RevealLines className="section-title" lines={[t('titleLine1'), t('titleLine2')]} />
        </div>
        <div className="steps reveal-group">
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <article
              className="step reveal-item"
              style={{ '--i': i } as CSSProperties}
              key={step}
            >
              <div className="step-number">{t(`${step}.number`)}</div>
              <div className="step-mark" />
              <h3>{t(`${step}.title`)}</h3>
              <p>{t(`${step}.copy`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- profile --- */

export function NuraProfile() {
  const t = useTranslations('profile');
  return (
    <section className="section profile dark" id={SECTION_IDS.profile}>
      <div className="wrap profile-grid">
        <div className="spacer desktop-only" aria-hidden="true" />
        <div className="reveal profile-content">
          <p className="eyebrow eyebrow-light">{t('eyebrow')}</p>
          <h2 className="reveal-display">
            {t('titleStart')}
            <span>{t('titleEmphasis')}</span>
          </h2>
          <p className="profile-copy">{t('copy')}</p>
          <div className="profile-stats">
            {PROFILE_DIMENSIONS.map((dimension) => (
              <div className="profile-stat" key={dimension.id}>
                <span className="profile-stat-label">{t(dimension.id)}</span>
                <span className="profile-dots">
                  {Array.from({ length: PROFILE_DOT_COUNT }, (_, dot) => (
                    <i
                      key={dot}
                      className={
                        dot < dimension.filled
                          ? dimension.tone === 'violet'
                            ? 'on v'
                            : 'on'
                          : ''
                      }
                    />
                  ))}
                </span>
              </div>
            ))}
          </div>
          <p className="profile-legend">{t('legend')}</p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- result --- */

export function ResultPreview() {
  const t = useTranslations('result');
  return (
    <section className="section result" id={SECTION_IDS.result}>
      <div className="wrap result-grid">
        <div className="reveal">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h2>{t('title')}</h2>
          <p className="result-copy">{t('copy')}</p>
        </div>
        <ResultCard />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- premium --- */

export function PremiumSection() {
  const t = useTranslations('premium');
  return (
    <section className="section premium" id={SECTION_IDS.premium}>
      <div className="wrap premium-grid">
        <div className="reveal">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h2>{t('title')}</h2>
          <div className="price">
            {t('price')} <small>{t('priceNote')}</small>
          </div>
          <p className="premium-note">{t('note')}</p>
          <ul className="benefits">
            {PREMIUM_BENEFITS.map((benefit) => (
              <li key={benefit}>{t(benefit)}</li>
            ))}
          </ul>
        </div>
        <aside className="reveal">
          <h3>{t('asideTitle')}</h3>
          <p>{t('asideCopy')}</p>
          <CtaLink to="catalog" className="button button-primary button-wide">
            {t('asideCta')}
          </CtaLink>
        </aside>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- trust --- */

const TRUST_ICONS = {
  information: ShieldCheck,
  privacy: LockKeyhole,
  methodology: Check,
} as const;

export function TrustSection() {
  const t = useTranslations('trust');
  return (
    <section className="section trust" id={SECTION_IDS.trust}>
      <div className="wrap trust-grid">
        <div className="reveal">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h2>{t('title')}</h2>
          <p className="trust-copy">{t('copy')}</p>
        </div>
        <div className="trust-points reveal">
          {TRUST_POINTS.map((point) => {
            const Icon = TRUST_ICONS[point];
            return (
              <div className="trust-point" key={point}>
                <h3>
                  <Icon size={16} className="trust-icon" aria-hidden="true" />
                  {t(`${point}.title`)}
                </h3>
                <p>{t(`${point}.copy`)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- faq --- */

export function Faq() {
  const t = useTranslations('faq');
  return (
    <section className="section faq" id={SECTION_IDS.faq}>
      <div className="wrap faq-layout">
        <div className="reveal">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h2 className="section-title">{t('title')}</h2>
        </div>
        <FaqList />
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- final cta --- */

export function FinalCta() {
  const t = useTranslations('finalCta');
  return (
    <section className="section final-cta">
      <div className="wrap final-inner reveal">
        <p className="eyebrow eyebrow-light">{t('eyebrow')}</p>
        <h2>{t('title')}</h2>
        <p>{t('copy')}</p>
        <CtaLink to="catalog" className="button button-light">
          {t('cta')}
        </CtaLink>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- footer --- */

export function Footer() {
  const t = useTranslations('footer');
  const tn = useTranslations('nav');
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <NuraLogo light={false} />
            <p className="footer-copy">{t('copy')}</p>
          </div>
          <nav className="footer-nav" aria-label={tn('footerLabel')}>
            <a href={`#${SECTION_IDS.assessments}`}>{t('assessments')}</a>
            <a href={`#${SECTION_IDS.profile}`}>{t('profile')}</a>
            <a href={`#${SECTION_IDS.faq}`}>{t('faq')}</a>
            <a href={`#${SECTION_IDS.trust}`}>{t('privacy')}</a>
            <CtaLink to="catalog" className="text-link" iconSize={13}>
              {t('start')}
            </CtaLink>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>{t('rights', { year: new Date().getFullYear() })}</span>
          <span>{t('tagline')}</span>
          {/* Required by the Storyset licence: the break-screen illustrations
              are free for commercial use only while this credit is visible.
              See TransitionArt. */}
          <a className="footer-credit" href="https://storyset.com" target="_blank" rel="noopener noreferrer">
            {t('credits')}
          </a>
          <LocaleSwitcher variant="footer" />
        </div>
      </div>
    </footer>
  );
}
