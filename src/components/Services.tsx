import { serviceGroups } from '@/lib/data';

export default function Services() {
  return (
    <section className="services section-shell" id="services">
      <div className="section-heading">
        <p className="eyebrow">Service offerings</p>
        <h2>Focused support across eCommerce, marketplaces, engineering, creative, and marketing.</h2>
      </div>
      <div className="service-groups">
        {serviceGroups.map((group) => (
          <article className="service-group" id={group.id} key={group.id}>
            <h3>{group.title}</h3>
            <p>{group.text}</p>
            {'columns' in group && group.columns ? (
              <div className="service-sub-groups">
                {group.columns.map((col) => (
                  <div className="service-sub-group" key={col.heading}>
                    <h4>{col.heading}</h4>
                    <ul>
                      {col.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="service-chip-grid">
                {'items' in group && group.items?.map((item) => <span key={item}>{item}</span>)}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
