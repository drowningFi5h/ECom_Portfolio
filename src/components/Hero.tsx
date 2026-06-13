export default function Hero() {
  return (
    <section className="hero section-shell">
      <div className="hero-content">
        <p className="eyebrow">Amazon marketplace support for growing sellers</p>
        <h1>Professional Amazon store operations, catalog, creative, and marketing support.</h1>
        <p className="hero-copy">
          Rahul Business Services helps marketplace brands organize product data, improve listings, manage seller workflows, and run campaigns with dependable delivery teams.
        </p>
        <div className="hero-actions">
          <a className="button button-primary" href="#contact">Discuss Your Project</a>
          <a className="button button-secondary" href="#services">Explore Services</a>
        </div>
      </div>
      <div className="hero-card" aria-label="Marketplace performance dashboard placeholder">
        <div className="dashboard-header">
          <span /><span /><span />
        </div>
        <div className="metric-grid">
          <div><strong>34%</strong><span>Listing quality lift</span></div>
          <div><strong>2.8x</strong><span>Faster catalog updates</span></div>
          <div><strong>18k</strong><span>SKUs supported</span></div>
          <div><strong>24/5</strong><span>Ops coverage</span></div>
        </div>
        <div className="chart-placeholder"><span /></div>
      </div>
    </section>
  );
}
