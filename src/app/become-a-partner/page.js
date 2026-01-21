import styles from "./BecomePartner.module.css";
import Header from "@/components/Header/Header";

export const metadata = {
  title: "Become a Partner | Luggage Terminal",
  description:
    "Earn extra income by partnering with Luggage Terminal. Offer luggage storage and key handover services with zero setup cost.",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Do I need insurance to become a partner?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No additional insurance is required to get started. Clear item restrictions apply for all bookings."
      }
    },
    {
      "@type": "Question",
      "name": "How do partner payouts work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Partner earnings are calculated monthly and paid directly to partners."
      }
    },
    {
      "@type": "Question",
      "name": "What items can be stored?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Only standard luggage items are allowed. Prohibited items are clearly defined in partner terms."
      }
    },
    {
      "@type": "Question",
      "name": "Is staff training required?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No staff training is required. The process is simple and takes only a few minutes per booking."
      }
    },
    {
      "@type": "Question",
      "name": "Can I stop partnering later?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. There is no lock-in contract and partners can exit anytime with notice."
      }
    }
  ]
};

export default function BecomePartnerPage() {
  return (
    <>
      <Header/>
      <main className={styles.page}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />

        {/* HERO with animated background */}
        <section className={styles.hero}>
          <div className={styles.heroBackground}>
            <div className={styles.floatingShape}></div>
            <div className={styles.floatingShape}></div>
            <div className={styles.floatingShape}></div>
          </div>
          
          <div className="container is-max">
            <div className={styles.heroContent}>
              <span className={styles.badge}>
                <span className={styles.badgeIcon}>✨</span>
                Partner Program
              </span>

              <h1>
                Turn Unused Space
                <br />
                <span className={styles.gradientText}>Into Monthly Revenue</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Join Luggage Terminal&apos;s growing network. Partner with us to offer luggage
                storage and Airbnb key handover services — with zero setup cost,
                full flexibility, and dedicated support.
              </p>

              <div className={styles.heroCta}>
                <a href="#apply" className={styles.ctaPrimary}>
                  <span>Become a Partner</span>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
                <a href="#how" className={styles.ctaSecondary}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2"/>
                    <path d="M10 6V10L13 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span>How it works</span>
                </a>
              </div>

              <div className={styles.trustBadges}>
                <div className={styles.trustItem}>
                  <span>⚡</span> Quick Setup
                </div>
                <div className={styles.trustItem}>
                  <span>🛡️</span> Secure Platform
                </div>
                <div className={styles.trustItem}>
                  <span>💰</span> Monthly Payouts
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS with enhanced design */}
<section className={styles.stats}>
  <div className="container is-max">
    <div className={styles.sectionHeader}>
      <h2>Earn on Every Bag</h2>
      <p>Simple, flat payouts. No commissions. No revenue sharing.</p>
    </div>

    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <div className={styles.statIcon}>🧳</div>
        <strong className={styles.statNumber}>$4</strong>
        <span className={styles.statLabel}>Medium / Large Bag</span>
        <p className={styles.statDesc}>Flat rate for online bookings</p>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon}>🎒</div>
        <strong className={styles.statNumber}>$2</strong>
        <span className={styles.statLabel}>Small Bag</span>
        <p className={styles.statDesc}>Flat rate for online bookings</p>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon}>🚶‍♂️</div>
        <strong className={styles.statNumber}>$5</strong>
        <span className={styles.statLabel}>Walk-in Medium / Large</span>
        <p className={styles.statDesc}>Higher payout for walk-ins</p>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon}>💼</div>
        <strong className={styles.statNumber}>$2.50</strong>
        <span className={styles.statLabel}>Walk-in Small Bag</span>
        <p className={styles.statDesc}>Paid per bag. No commission.</p>
      </div>
    </div>
  </div>
</section>


<section className={styles.section}>
  <div className="container is-max">
    <div className={styles.sectionHeader}>
      <h2>We Reward Consistency</h2>
      <p>
        Because regular bookings deserve extra cash — not complicated rules.
      </p>
    </div>

    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <div className={styles.statIcon}>🎉</div>
        <strong className={styles.statNumber}>$20</strong>
        <span className={styles.statLabel}>Every 25th Booking</span>
        <p className={styles.statDesc}>
          Bonus for consistent performance within 6 months
        </p>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon}>🚀</div>
        <strong className={styles.statNumber}>$50</strong>
        <span className={styles.statLabel}>Every 100th Booking</span>
        <p className={styles.statDesc}>
          Bigger reward for high-volume partners
        </p>
      </div>
    </div>

    <p style={{ textAlign: "center", marginTop: "1.5rem", color: "var(--color-muted)" }}>
      Bonuses stack. The more bookings you handle, the more you earn.
    </p>
  </div>
</section>




        {/* WHO with enhanced cards */}
        <section className={styles.section}>
          <div className="container is-max">
            <div className={styles.sectionHeader}>
              <h2>Perfect For Local Businesses</h2>
              <p>Join businesses already earning extra revenue with minimal effort</p>
            </div>

            <div className={styles.cards}>
              {[
                { icon: "🏪", title: "Convenience Stores", desc: "Mini marts & local shops" },
                { icon: "🏨", title: "Hostels & Hotels", desc: "Budget & boutique accommodations" },
                { icon: "📦", title: "Courier Shops", desc: "Parcel & delivery services" },
                { icon: "🧺", title: "Laundromats", desc: "Service-based businesses" },
                { icon: "🎒", title: "Tourist Shops", desc: "Gift shops & tourist centers" },
                { icon: "☕", title: "Cafes & Restaurants", desc: "Food & beverage outlets" },
              ].map((item) => (
                <div key={item.title} className={styles.iconCard}>
                  <div className={styles.cardIcon}>{item.icon}</div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW with timeline design */}
        <section id="how" className={styles.howSection}>
          <div className="container is-max">
            <div className={styles.sectionHeader}>
              <h2>How It Works</h2>
              <p>Simple process. Start earning in 3 easy steps</p>
            </div>

            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineNumber}>
                  <span>1</span>
                </div>
                <div className={styles.timelineContent}>
                  <h3>Customers Book Online</h3>
                  <p>Travelers find and book your location through our platform for luggage storage or key handover services.</p>
                  <div className={styles.timelineFeature}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M13 5L6 12L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Instant notifications
                  </div>
                </div>
              </div>

              <div className={styles.timelineItem}>
                <div className={styles.timelineNumber}>
                  <span>2</span>
                </div>
                <div className={styles.timelineContent}>
                  <h3>Secure Drop-off & Storage</h3>
                  <p>Quick verification and tagging process. Store items safely using our simple system and guidelines.</p>
                  <div className={styles.timelineFeature}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M13 5L6 12L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Takes 2-3 minutes
                  </div>
                </div>
              </div>

              <div className={styles.timelineItem}>
                <div className={styles.timelineNumber}>
                  <span>3</span>
                </div>
                <div className={styles.timelineContent}>
<h3>Get Paid Monthly</h3>

<p>
  Track earnings in real-time through your dashboard. Flat payouts per bag,
  plus volume bonuses paid monthly.
</p>
                  <div className={styles.timelineFeature}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M13 5L6 12L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Automated payouts
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES with enhanced design */}
        <section className={styles.section}>
          <div className="container is-max">
            <div className={styles.sectionHeader}>
              <h2>Services You Can Offer</h2>
              <p>Flexible options to maximize your earnings</p>
            </div>

            <div className={styles.servicesGrid}>
              <div className={styles.serviceCard}>
                <div className={styles.serviceIcon}>🧳</div>
                <h3>Luggage Storage</h3>
                <p>Store traveler luggage securely for a few hours or multiple days. Perfect for tourists exploring the city.</p>
                <ul className={styles.serviceFeatures}>
                  <li>✓ Hourly or daily rates</li>
                  <li>✓ Any size luggage</li>
                  <li>✓ Flexible duration</li>
                  <li>✓ High demand service</li>
                </ul>
              </div>

              <div className={styles.serviceCard}>
                <div className={styles.serviceIcon}>🔑</div>
                <h3>Key Handover</h3>
                <p>Handle Airbnb and short-stay key exchanges with the same commission structure. Easy additional revenue.</p>
                <ul className={styles.serviceFeatures}>
                  <li>✓ Airbnb keys</li>
                  <li>✓ Short-stay rentals</li>
                  <li>✓ Simple process</li>
                  <li>✓ Same commission</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits section */}
        <section className={styles.benefits}>
          <div className="container is-max">
            <div className={styles.sectionHeader}>
              <h2>Why Partner With Us</h2>
              <p>More than just extra income</p>
            </div>

            <div className={styles.benefitsGrid}>
              <div className={styles.benefitCard}>
                <div className={styles.benefitIcon}>💼</div>
                <h4>Zero Investment</h4>
                <p>No setup fees, no equipment costs. Use your existing space.</p>
              </div>
              <div className={styles.benefitCard}>
                <div className={styles.benefitIcon}>📈</div>
                <h4>Passive Income</h4>
                <p>Earn extra revenue without disrupting your main business.</p>
              </div>
              <div className={styles.benefitCard}>
                <div className={styles.benefitIcon}>🤝</div>
                <h4>Full Support</h4>
                <p>Dedicated partner support team always ready to help.</p>
              </div>
              <div className={styles.benefitCard}>
                <div className={styles.benefitIcon}>🔓</div>
                <h4>No Lock-in</h4>
                <p>Exit anytime with notice. Complete flexibility.</p>
              </div>
              <div className={styles.benefitCard}>
                <div className={styles.benefitIcon}>👥</div>
                <h4>More Customers</h4>
                <p>Attract new foot traffic to your existing business.</p>
              </div>
              <div className={styles.benefitCard}>
                <div className={styles.benefitIcon}>⚙️</div>
                <h4>Easy Management</h4>
                <p>Simple dashboard to track bookings and earnings.</p>
              </div>
            </div>
          </div>
        </section>

        {/* APPLY with enhanced CTA */}
        <section id="apply" className={styles.apply}>
          <div className={styles.applyBackground}>
            <div className={styles.applyGlow}></div>
          </div>
          
          <div className="container is-max">
            <div className={styles.applyContent}>
              <h2>Ready to Start Earning?</h2>
              <p className={styles.applySubtitle}>
                Join our partner network today. Application takes less than 2 minutes.
              </p>

              <div className={styles.applyStats}>
                <div className={styles.applyStat}>
                  <strong>500+</strong>
                  <span>Active Partners</span>
                </div>
                <div className={styles.applyStat}>
                  <strong>24/7</strong>
                  <span>Support Available</span>
                </div>
                <div className={styles.applyStat}>
                  <strong>95%</strong>
                  <span>Partner Satisfaction</span>
                </div>
              </div>

              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSeQIAVNFb4Kv5XFkussZ9MYAqFZ4bMqx5XZSGqxF7ScdIVMvQ/viewform?usp=header"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.ctaPrimaryLarge}
              >
                <span>Apply to Become a Partner</span>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
              <br />
              <p className={styles.applyNote}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1L10.5 6L16 7L12 11L13 16.5L8 13.5L3 16.5L4 11L0 7L5.5 6L8 1Z" fill="currentColor"/>
                </svg>
                Applications reviewed within 24-48 hours to ensure quality and security
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}