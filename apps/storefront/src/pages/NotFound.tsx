import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { StatusPanel } from '../components/ProductGrid';
import { useTitle } from '../lib/useTitle';
import { site } from '../site';

export default function NotFound() {
  useTitle(`Page not found | ${site.fullName}`);

  return (
    <AppShell title="Not found" back="/">
      <div className="container section">
        <StatusPanel title="We can't find that page" note="The link may be old or mistyped. These will get you back on track.">
          <Link className="btn btn-primary" to="/">
            Go to the home page
          </Link>
          <Link className="btn btn-secondary" to="/shop">
            Browse the shop
          </Link>
          <Link className="btn btn-secondary" to="/track-order">
            Track an order
          </Link>
        </StatusPanel>
      </div>
    </AppShell>
  );
}
