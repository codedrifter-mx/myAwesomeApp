export default function HomePage() {
  const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';
  const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'myawesomeapp';
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'myawesomeapp-frontend';
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/dashboard';

  const loginUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=openid`;
  const registerUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/registrations?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=openid`;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        h1, h2, h3, .display-text { font-weight: 500; line-height: 1.1; letter-spacing: -0.03em; }

        /* ===== HERO (dark) ===== */
        .hero {
          position: relative;
          background: #0a0a0a;
          min-height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          color: #fff;
        }
        @media (max-width: 768px) {
          .hero { min-height: auto; padding-bottom: 60px; }
        }
        .hero-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.6;
          z-index: 1;
          mask-image: radial-gradient(circle at center, black 40%, transparent 75%);
          -webkit-mask-image: radial-gradient(circle at center, black 40%, transparent 75%);
        }
        .mesh-container {
          position: absolute; inset: 0; z-index: 0; overflow: hidden; opacity: 0.5;
        }
        .mesh-blob {
          position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.7;
          animation: drift 20s infinite alternate ease-in-out;
        }
        .mesh-teal { background: #38b2ac; width: 50vw; height: 50vw; top: -10%; left: -10%; animation-delay: 0s; }
        .mesh-purple { background: #805ad5; width: 45vw; height: 45vw; bottom: -10%; right: -5%; animation-delay: -5s; }
        .mesh-dark { background: #050505; width: 60vw; height: 60vw; top: 20%; left: 20%; animation-delay: -10s; }
        @keyframes drift {
          0% { transform: translate(0,0) scale(1); }
          33% { transform: translate(5%,10%) scale(1.1); }
          66% { transform: translate(-5%,-5%) scale(0.9); }
          100% { transform: translate(10%,-10%) scale(1); }
        }
        .text-glow {
          position: absolute; width: 60%; height: 40%;
          background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
          top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: -1; pointer-events: none;
        }
        .hero-content-wrapper {
          position: relative; z-index: 10; flex: 1;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 0 24px; text-align: center;
        }

        /* Nav */
        .nav {
          position: relative; z-index: 20; width: 100%;
          padding: 24px 40px; display: flex; justify-content: space-between; align-items: center;
        }
        .logo { font-size: 24px; font-weight: 500; letter-spacing: -0.05em; color: #fff; }
        .nav-links { display: flex; gap: 32px; font-size: 14px; }
        .nav-links a { color: rgba(255,255,255,0.7); text-decoration: none; }
        .nav-links a:hover { color: #fff; }
        @media (max-width: 768px) { .nav-links { display: none; } }

        /* Hero text */
        .hero-headline {
          font-size: clamp(40px, 6vw, 72px); letter-spacing: -0.04em;
          max-width: 800px; margin-bottom: 20px; line-height: 1;
        }
        .hero-deck {
          font-size: clamp(16px, 2vw, 20px); color: rgba(255,255,255,0.65);
          max-width: 560px; margin-bottom: 36px; line-height: 1.4;
        }
        .button-group { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
        .btn {
          padding: 14px 28px; border-radius: 9999px; font-size: 16px; font-weight: 500;
          text-decoration: none; transition: all 0.2s; display: inline-block;
        }
        .btn-primary {
          background: #fff; color: #000; border: 1px solid #fff;
        }
        .btn-primary:hover { background: #38b2ac; color: #fff; border-color: #38b2ac; }
        .btn-secondary {
          background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.3);
        }
        .btn-secondary:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.5); }

        .hero-trust { margin-top: 60px; display: flex; flex-direction: column; align-items: center; gap: 16px; opacity: 0.5; }
        .hero-trust-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.6); }
        .trust-logos { display: flex; gap: 32px; align-items: center; flex-wrap: wrap; justify-content: center; }
        .demo-hint { margin-top: 16px; font-size: 0.8rem; color: rgba(255,255,255,0.4); }

        /* ===== Features (light) ===== */
        .section-light {
          padding: 100px 24px; display: flex; flex-direction: column; align-items: center;
          background: #f8f9fb; color: #000;
        }
        .section-header { text-align: center; max-width: 600px; margin-bottom: 60px; }
        .section-eyebrow { font-size: 13px; color: #1863dc; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; display: block; }
        .section-title { font-size: clamp(28px, 4vw, 44px); margin-bottom: 20px; color: #000; }
        .section-desc { font-size: 17px; color: #555; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; width: 100%; max-width: 1100px; }
        .feature-card {
          background: #fff; border: 1px solid #e8eaee; border-radius: 18px; padding: 32px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .feature-icon {
          width: 44px; height: 44px; border-radius: 10px;
          background: #f0f2f5; display: flex; align-items: center;
          justify-content: center; color: #1863dc; margin-bottom: 4px;
        }
        .feature-title { font-size: 22px; color: #000; }
        .feature-text { color: #555; font-size: 15px; line-height: 1.5; }

        /* ===== Testimonial (light) ===== */
        .testimonial-section {
          background: #f0f2f5; padding: 100px 24px; text-align: center;
        }
        .testimonial-card { max-width: 720px; margin: 0 auto; }
        .pull-quote {
          font-size: clamp(24px, 3.5vw, 36px); line-height: 1.2; color: #000;
          margin-bottom: 32px;
        }
        .pull-quote::before {
          content: '\u201C'; display: block; font-size: 60px; color: #ccc; line-height: 0.5; margin-bottom: 12px;
        }
        .author-info { display: flex; align-items: center; justify-content: center; gap: 12px; }
        .author-avatar {
          width: 48px; height: 48px; border-radius: 50%; background: #d0d4dd;
          display: flex; align-items: center; justify-content: center; font-weight: 500; color: #555;
        }
        .author-name { font-weight: 500; color: #000; font-size: 15px; }
        .author-role { font-size: 13px; color: #666; }

        /* ===== Footer ===== */
        footer {
          padding: 32px 24px; border-top: 1px solid #e8eaee; text-align: center;
          font-size: 13px; color: #888; display: flex; justify-content: space-between;
          max-width: 1100px; margin: 0 auto; width: 100%;
        }
        @media (max-width: 768px) { footer { flex-direction: column; gap: 12px; } }
      `}</style>

      {/* === HERO === */}
      <section className="hero">
        <div className="mesh-container">
          <div className="mesh-blob mesh-teal" />
          <div className="mesh-blob mesh-purple" />
          <div className="mesh-blob mesh-dark" />
        </div>
        <div className="hero-grid" />

        <nav className="nav">
          <div className="logo">myAwesomeApp</div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href={loginUrl}>Log in</a>
          </div>
        </nav>

        <div className="hero-content-wrapper">
          <div className="text-glow" />
          <h1 className="hero-headline">Manage subscriptions effortlessly.</h1>
          <p className="hero-deck">The enterprise-grade platform to scale your billing, reduce churn, and automate revenue operations.</p>

          <div className="button-group">
            <a href={registerUrl} className="btn btn-primary">Start for free</a>
            <a href={loginUrl} className="btn btn-secondary">Log in</a>
          </div>

          <div className="hero-trust">
            <span className="hero-trust-label">Trusted by fast-growing teams</span>
            <div className="trust-logos">
              <svg width="80" height="24" viewBox="0 0 80 24" fill="rgba(255,255,255,0.5)"><circle cx="12" cy="12" r="8"/><circle cx="40" cy="12" r="8"/><circle cx="68" cy="12" r="8"/></svg>
              <svg width="80" height="24" viewBox="0 0 80 24" fill="rgba(255,255,255,0.5)"><rect x="4" y="4" width="16" height="16" rx="3"/><rect x="32" y="4" width="16" height="16" rx="3"/><rect x="60" y="4" width="16" height="16" rx="3"/></svg>
            </div>
          </div>

          <p className="demo-hint">Demo: demo / demo</p>
        </div>
      </section>

      {/* === FEATURES === */}
      <section className="section-light" id="features">
        <div className="section-header">
          <span className="section-eyebrow">Infrastructure</span>
          <h2 className="section-title">Built for modern revenue operations</h2>
          <p className="section-desc">Automate your entire billing lifecycle without writing a single line of custom logic.</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
            </div>
            <h3 className="feature-title">Smart Invoicing</h3>
            <p className="feature-text">Automatically handle prorations, upgrades, and complex usage-based models with zero manual intervention.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h3 className="feature-title">Global Tax &amp; Compliance</h3>
            <p className="feature-text">Collect exactly the right amount of tax in 130+ countries. Stay compliant without thinking about it.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <h3 className="feature-title">Churn Recovery</h3>
            <p className="feature-text">Recover failed payments with machine-learning optimized retry schedules and automated dunning emails.</p>
          </div>
        </div>
      </section>

      {/* === TESTIMONIAL === */}
      <section className="testimonial-section">
        <div className="testimonial-card">
          <p className="pull-quote">Since moving to myAwesomeApp, we&rsquo;ve completely eliminated billing support tickets. It just works quietly in the background.</p>
          <div className="author-info">
            <div className="author-avatar">JD</div>
            <div className="author-text" style={{ textAlign: 'left' }}>
              <div className="author-name">Jane Doe</div>
              <div className="author-role">CTO, ScaleTech</div>
            </div>
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer>
        <div>&copy; 2026 myAwesomeApp, Inc.</div>
        <div>Built for Generative UI Global Hackathon</div>
      </footer>
    </>
  );
}
