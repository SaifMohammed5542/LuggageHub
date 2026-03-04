'use client';

// BecomePartnerClient.jsx
// Usage in page.js:
//   import BecomePartnerClient from './BecomePartnerClient';
//   export default function Page() { return <BecomePartnerClient />; }

import { useState, useEffect } from 'react';
import styles from './BecomePartner.module.css';
import Header from '@/components/Header';

const LARGE_RATE = 5 * 0.7 + 4 * 0.3;   // $4.70/bag/day
const SMALL_RATE = 2.5 * 0.7 + 2 * 0.3; // $2.35/bag/day
const AVG_STAY   = 2.5;

const TIERS = [
  { max: 400,      label: 'Starter',     color: '#6b7280' },
  { max: 900,      label: 'Growing',     color: '#0284C7' },
  { max: 1800,     label: 'Active',      color: '#8b5cf6' },
  { max: Infinity, label: 'Top Partner', color: '#D97706' },
];

const APPLY_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSeQIAVNFb4Kv5XFkussZ9MYAqFZ4bMqx5XZSGqxF7ScdIVMvQ/viewform?usp=header';

function fmt(n) { return Math.round(n).toLocaleString('en-AU'); }

function calcEarnings(large, small, days) {
  const base  = (large * LARGE_RATE + small * SMALL_RATE) * AVG_STAY * days;
  const drops = (large + small) * days;
  const bonus = Math.floor(drops / 25) * 20 + Math.floor(drops / 100) * 50;
  const total = base + bonus;
  return { base, bonus, total, annual: total * 12, drops, tier: TIERS.find(t => total <= t.max) };
}

function Slider({ min, max, value, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range" min={min} max={max} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ background: `linear-gradient(to right, rgba(2,132,199,0.9) ${pct}%, #E2E8F0 ${pct}%)` }}
      className={styles.sliderInput}
    />
  );
}

function useCountUp(target, duration = 1800, delay = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const s = performance.now();
      const tick = (now) => {
        const p = Math.min((now - s) / duration, 1);
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, duration, delay]);
  return val;
}

function FormulaDropdown({ large, small, days, bonus, drops, total, styles }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.formulaWrap}>
      <button
        className={styles.formulaToggle}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span>How is this calculated?</span>
        <span className={`${styles.formulaArrow} ${open ? styles.formulaArrowOpen : ''}`}>▾</span>
      </button>

      {open && (
        <div className={styles.formulaBody}>
          <div className={styles.ctFormulaRow}>
            <span className={styles.ctFormulaLbl}>🧳 Large bags</span>
            <span className={styles.ctFormulaCalc}>{large} bags/day × $4.70/day × 2.5 avg days × {days} days</span>
            <span className={styles.ctFormulaVal}>${fmt(large * 4.70 * 2.5 * days)}</span>
          </div>
          <div className={styles.ctFormulaRow}>
            <span className={styles.ctFormulaLbl}>🎒 Small bags</span>
            <span className={styles.ctFormulaCalc}>{small} bags/day × $2.35/day × 2.5 avg days × {days} days</span>
            <span className={styles.ctFormulaVal}>${fmt(small * 2.35 * 2.5 * days)}</span>
          </div>
          {bonus > 0 && (
            <div className={styles.ctFormulaRow}>
              <span className={styles.ctFormulaLbl}>🎉 Bonuses</span>
              <span className={styles.ctFormulaCalc}>
                {Math.floor(drops/25)}× $20{Math.floor(drops/100) > 0 ? ` + ${Math.floor(drops/100)}× $50` : ''}
              </span>
              <span className={`${styles.ctFormulaVal} ${styles.ctFormulaAmber}`}>+${bonus}</span>
            </div>
          )}
          <div className={styles.ctFormulaDivider} />
          <div className={`${styles.ctFormulaRow} ${styles.ctFormulaTotalRow}`}>
            <span className={styles.ctFormulaLbl}>💰 Total/mo</span>
            <span className={styles.ctFormulaCalc}>Each bag earns for 2.5 days on average, not just 1 day</span>
            <span className={`${styles.ctFormulaVal} ${styles.ctFormulaTotal}`}>${fmt(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BecomePartnerClient() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const heroTarget = Math.round((6 * LARGE_RATE + 2 * SMALL_RATE) * AVG_STAY * 26);
  const heroCount  = useCountUp(heroTarget);

  const [large, setLarge] = useState(4);
  const [small, setSmall] = useState(2);
  const [days,  setDays]  = useState(26);
  const { base, bonus, total, annual, drops, tier } = calcEarnings(large, small, days);

  return (
    <>
    <Header />
    <div className={styles.page}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className={`${styles.nav} ${scrolled ? styles.navSolid : ''}`}>
        <span className={styles.navLogo}>Register Now!</span>
        <a href={APPLY_URL} target="_blank" rel="noopener noreferrer" className={styles.navBtn}>
          Apply Free →
        </a>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroGrid} />
        <div className={styles.heroGlow} />

        <div className={styles.heroBody}>
          <div className={styles.heroPill}>
            <span className={styles.heroPillDot} /> Partner Program · Australia
          </div>

          <h1 className={styles.heroH1}>
            Your store.<br />
            Their bags.<br />
            <span className={styles.heroAccent}>Your money.</span>
          </h1>

          <p className={styles.heroSub}>
            Earn flat cash for every bag you store. Automatic payouts every month.
            Zero investment. Zero disruption.
          </p>

          {/* Inline rate chips — replaces the hidden card on mobile */}
          <div className={styles.heroRates}>
            <div className={styles.rateChip}>🧳 <strong>$4.70</strong>/bag/day</div>
            <div className={styles.rateChip}>🎒 <strong>$2.35</strong>/bag/day</div>
          </div>

          <a href={APPLY_URL} target="_blank" rel="noopener noreferrer" className={styles.heroCta}>
            Apply Now — It's Free
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>

          <div className={styles.heroProof}>
            {['$0 setup','No lock-in','2–3 min/booking','Monthly payout'].map(t => (
              <span key={t} className={styles.proofChip}>✓ {t}</span>
            ))}
          </div>
        </div>

        {/* Desktop-only earnings card */}
        <div className={styles.heroCard}>
          <div className={styles.hcTop}>
            <span className={styles.hcLabel}>Monthly estimate</span>
            <span className={styles.hcLive}><span className={styles.liveDot} />Live</span>
          </div>
          <div className={styles.hcNumber}>
            <span className={styles.hcSym}>$</span>
            {heroCount.toLocaleString('en-AU')}
            <span className={styles.hcMo}>/mo</span>
          </div>
          <div className={styles.hcSub}>6 bags/day · 2.5-day avg stay</div>
          <div className={styles.hcBars}>
            {[28,45,35,62,50,78,65,90,80,100].map((h,i) => (
              <div key={i} className={styles.hcBar} style={{'--h': `${h}%`, animationDelay: `${i * 0.1 + 0.1}s`}} />
            ))}
          </div>
          <div className={styles.hcRates}>
            <div className={styles.hcRate}>🧳 <strong>$4.70</strong><span>large/day</span></div>
            <div className={styles.hcRate}>🎒 <strong>$2.35</strong><span>small/day</span></div>
          </div>
          <div className={styles.hcTag}>Flat rate · No commission</div>
        </div>

      </section>

      {/* ── CALCULATOR ──────────────────────────────────────── */}
      <section className={styles.calcSection} id="calculator">
        <div className={styles.calcWrap}>

          <div className={styles.calcHeader}>
            <div className={styles.secChip}>Revenue Calculator</div>
            <h2 className={styles.calcH2}>See what you'd earn</h2>
            <p className={styles.calcSub}>Move the sliders — income updates instantly</p>
          </div>

          {/* Total — always pinned at top, large, impossible to miss */}
          <div className={styles.calcTotal}>
            <div className={styles.ctLabel}>Your monthly income estimate</div>
            <div className={styles.ctAmount}>
              <span className={styles.ctSym}>$</span>
              {fmt(total)}
              <span className={styles.ctMo}>/mo</span>
            </div>
            <div className={styles.ctMeta}>
              <span className={styles.ctAnnual}>≈ ${fmt(annual)}/yr</span>
              <span className={styles.ctTier} style={{ color: tier.color, borderColor: tier.color }}>
                <span style={{ background: tier.color, width: 6, height: 6, borderRadius: '50%', display:'inline-block', marginRight: 5 }} />
                {tier.label}
              </span>
            </div>

            {/* Collapsible formula */}
            <FormulaDropdown large={large} small={small} days={days} bonus={bonus} drops={drops} total={total} styles={styles} />
          </div>

          {/* Sliders */}
          <div className={styles.calcSliders}>

            <div className={styles.sliderRow}>
              <div className={styles.sliderMeta}>
                <span className={styles.sliderIcon}>🧳</span>
                <div>
                  <div className={styles.sliderName}>Large &amp; Medium bags / day</div>
                  <div className={styles.sliderSub}>Rate: $4.70/bag/day · avg stay 2.5 days = ~$11.75 per bag dropped off</div>
                </div>
                <div className={styles.sliderBadge}>{large}</div>
              </div>
              <Slider min={0} max={20} value={large} onChange={setLarge} />
            </div>

            <div className={styles.sliderRow}>
              <div className={styles.sliderMeta}>
                <span className={styles.sliderIcon}>🎒</span>
                <div>
                  <div className={styles.sliderName}>Small bags / day</div>
                  <div className={styles.sliderSub}>Rate: $2.35/bag/day · avg stay 2.5 days = ~$5.88 per bag dropped off</div>
                </div>
                <div className={styles.sliderBadge}>{small}</div>
              </div>
              <Slider min={0} max={15} value={small} onChange={setSmall} />
            </div>

            <div className={styles.sliderRow}>
              <div className={styles.sliderMeta}>
                <span className={styles.sliderIcon}>📅</span>
                <div>
                  <div className={styles.sliderName}>Days open / month</div>
                  <div className={styles.sliderSub}>How many days your store operates each month</div>
                </div>
                <div className={styles.sliderBadge}>{days}</div>
              </div>
              <Slider min={10} max={31} value={days} onChange={setDays} />
            </div>

          </div>

          {/* Milestone */}
          {drops >= 25 && (
            <div className={styles.calcMilestone}>
              🎉 You qualify for {Math.floor(drops/25)}× $20 bonus
              {Math.floor(drops/100) > 0 && ` + ${Math.floor(drops/100)}× $50 bonus`}
            </div>
          )}

          {/* Note + CTA */}
          <div className={styles.calcFooter}>
            <p className={styles.calcNote}>
              Rates are weighted avg of online + walk-in pricing. 2.5-day avg stay included.
              Bonuses: +$20 every 25th · +$50 every 100th booking.
            </p>
            <a href={APPLY_URL} target="_blank" rel="noopener noreferrer" className={styles.calcCta}>
              Start Earning ${fmt(total)}/mo →
            </a>
          </div>

        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.white}`}>
        <div className={styles.wrap}>
          <div className={styles.secHeaderC}>
            <div className={styles.secChip}>How it works</div>
            <h2 className={styles.secH2}>Up and earning in days</h2>
          </div>
          <div className={styles.stepsGrid}>
            {[
              { n:'01', icon:'📋', h:'Apply in 2 min',         p:'Short form. We review in 48 hrs and confirm onboarding personally.' },
              { n:'02', icon:'🧳', h:'Scan, store, done',       p:'Customer arrives with QR code. Scan it, store the bag. 2–3 minutes total.' },
              { n:'03', icon:'💳', h:'Monthly bank transfer',   p:'Earnings calculated automatically. Direct to your bank. No invoicing.' },
            ].map(s => (
              <div key={s.n} className={styles.stepCard}>
                <div className={styles.stepN}>{s.n}</div>
                <div className={styles.stepIcon}>{s.icon}</div>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RATES ───────────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.gray}`}>
        <div className={styles.wrap}>
          <div className={styles.secHeaderC}>
            <div className={styles.secChip}>Your payout rates</div>
            <h2 className={styles.secH2}>Flat rate. Every bag. Every day.</h2>
            <p className={styles.secSubC}>No percentage cuts. No commission splits. Just a flat amount per bag per day.</p>
          </div>

          <div className={styles.rateGrid}>
            {[
              { emoji:'🧳', amt:'$4', label:'Large/Med · Online',  sub:'Per bag, per day' },
              { emoji:'🧳', amt:'$5', label:'Large/Med · Walk-in', sub:'Higher for walk-ins' },
              { emoji:'🎒', amt:'$2', label:'Small · Online',       sub:'Per bag, per day' },
              { emoji:'🎒', amt:'$2.50', label:'Small · Walk-in',  sub:'Higher for walk-ins' },
            ].map(r => (
              <div key={r.label} className={styles.rateCard}>
                <div className={styles.rateEmoji}>{r.emoji}</div>
                <div className={styles.rateAmt}>{r.amt}</div>
                <div className={styles.rateLabel}>{r.label}</div>
                <div className={styles.rateSub}>{r.sub}</div>
              </div>
            ))}
          </div>

          <div className={styles.bonusRow}>
            <div className={styles.bonusCard}>
              <span className={styles.bonusIcon}>🎉</span>
              <div>
                <div className={styles.bonusAmt}>+$20</div>
                <div className={styles.bonusTitle}>Every 25th booking</div>
                <div className={styles.bonusSub}>Automatic consistency bonus</div>
              </div>
            </div>
            <div className={styles.bonusCard}>
              <span className={styles.bonusIcon}>🚀</span>
              <div>
                <div className={styles.bonusAmt}>+$50</div>
                <div className={styles.bonusTitle}>Every 100th booking</div>
                <div className={styles.bonusSub}>High-volume reward</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHO ─────────────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.white}`}>
        <div className={styles.wrap}>
          <div className={styles.secHeaderC}>
            <div className={styles.secChip}>Ideal partners</div>
            <h2 className={styles.secH2}>Built for local businesses</h2>
          </div>
          <div className={styles.whoGrid}>
            {[
              ['🏪','Convenience Stores','High foot traffic, long hours.'],
              ['📰','Newsagencies','Near stations — exactly where tourists arrive.'],
              ['🏨','Hostels & Hotels','Already handling bags — earn on every one.'],
              ['☕','Cafes & Restaurants','Near transit hubs. Zero disruption.'],
              ['🎁','Souvenir Shops','Your customers are already travellers.'],
              ['📦','Courier & Print Shops','Regular hours, service-oriented.'],
            ].map(([icon, h, p]) => (
              <div key={h} className={styles.whoCard}>
                <span className={styles.whoIcon}>{icon}</span>
                <div>
                  <div className={styles.whoH}>{h}</div>
                  <div className={styles.whoP}>{p}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OBJECTIONS ──────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.gray}`}>
        <div className={styles.wrap}>
          <div className={styles.secHeaderC}>
            <div className={styles.secChip}>Common questions</div>
            <h2 className={styles.secH2}>We know what you're thinking</h2>
          </div>
          <div className={styles.faqGrid}>
            {[
              ['What if a bag gets damaged?',        "You're not liable for disputes — we handle all customer issues. Partners are never financially exposed."],
              ['How much space do I need?',           'Just 1–2 square metres — a corner of your stockroom or behind your counter is enough.'],
              ['How much time does each booking take?',"2–3 minutes. Scan a QR code when the bag arrives, scan again on collection. That's it."],
              ['When do I get paid?',                 'Monthly, direct to your bank account. Track everything live on your partner dashboard.'],
              ['Can I stop anytime?',                 'Yes, anytime. No lock-in, no exit fees. Give us notice and we remove your listing.'],
              ['What if I get zero bookings?',        'No cost to you — ever. You only earn when bags are stored. We actively drive customers to your location.'],
            ].map(([q, a]) => (
              <div key={q} className={styles.faqCard}>
                <div className={styles.faqQ}>{q}</div>
                <div className={styles.faqA}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaWrap}>
          <div className={styles.secChip} style={{ background:'rgba(245,158,11,0.2)', color:'#fbbf24', borderColor:'rgba(245,158,11,0.3)' }}>
            Ready to start
          </div>
          <h2 className={styles.ctaH2}>
            Turn empty space into<br />
            <span className={styles.ctaAccent}>monthly income</span>
          </h2>
          <p className={styles.ctaDesc}>
            2-minute application. 48-hour review. Earning from your first week.
          </p>

          <div className={styles.ctaStats}>
            {[['$0','Setup cost'],['48hrs','Review time'],['2–3min','Per booking'],['0','Lock-in']].map(([n,l]) => (
              <div key={l} className={styles.ctaStat}>
                <span className={styles.ctaStatN}>{n}</span>
                <span className={styles.ctaStatL}>{l}</span>
              </div>
            ))}
          </div>

          <a href={APPLY_URL} target="_blank" rel="noopener noreferrer" className={styles.ctaBtn}>
            Apply to Become a Partner
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M7 14L12 9L7 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <p className={styles.ctaFine}>Australia only · All business types welcome · No cost ever</p>
        </div>
      </section>

    </div>
    </>
  );
}