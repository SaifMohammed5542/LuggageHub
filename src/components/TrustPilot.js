'use client';

import { useEffect } from 'react';

export default function Trustpilot() {
  useEffect(() => {
    // Load Trustpilot script once on mount
    const script = document.createElement('script');
    script.src = 'https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div>
      {/* Your existing homepage content here */}

      {/* Trustpilot Review Collector Widget */}
      <section className="my-10">
        <div
          className="trustpilot-widget"
          data-locale="en-US"
          data-template-id="56278e9abfbbba0bdcd568bc"
          data-businessunit-id="686d4c7a04686208777bb6f2"
          data-style-height="52px"
          data-style-width="100%"
        >
          <a
            href="https://www.trustpilot.com/review/luggageterminal.com"
            target="_blank"
            rel="noopener"
          >
            Trustpilot
          </a>
        </div>
      </section>
    </div>
  );
}
