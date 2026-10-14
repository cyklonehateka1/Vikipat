import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { workItems } from '../content/work';

/** Three big photo cards with a notched corner that holds the arrow button. */
export function OurWork() {
  return (
    <section className="band on-dark home-work" aria-labelledby="work-title">
      <div className="container">
        <header className="work-head" data-reveal="">
          <span className="work-pill">Our work</span>
          <div className="work-head-row">
            <div>
              <h2 id="work-title">Our latest work</h2>
              <p>Banners, shirts and backdrops from our workshop in Accra. Have something similar in mind?</p>
            </div>
            <Link className="work-more" to="/print" viewTransition>
              Get a price
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        </header>

        <ul className="work-list">
          {workItems.map((item) => (
            <li key={item.id} className="work-item" data-reveal="pop">
              <Link className="work-card" to={item.to} viewTransition aria-label={`${item.title}, ${item.category}`}>
                <img
                  src={item.image.lg}
                  srcSet={`${item.image.sm} 720w, ${item.image.lg} 1400w`}
                  sizes="(min-width: 1024px) 30vw, 80vw"
                  alt={item.image.alt}
                  width={item.image.width}
                  height={item.image.height}
                  loading="lazy"
                  decoding="async"
                  style={{ objectPosition: item.image.position }}
                />
                <span className="work-notch" aria-hidden="true">
                  <span className="work-go">
                    <ArrowUpRight />
                  </span>
                </span>
                <span className="work-caption">
                  <b>{item.title}</b>
                  <small>{item.category}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
