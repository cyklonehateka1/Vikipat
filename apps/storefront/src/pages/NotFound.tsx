import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { site } from '../site';
import { whatsappLink } from '../lib/format';
import { useTitle } from '../lib/useReveal';

export default function NotFound({ reason }: { reason?: string }) {
  useTitle(`Page Not Found | ${site.fullName}`);

  return (
    <Layout>
      <div className="shell notfound">
        <p className="code" aria-hidden="true">
          404
        </p>
        <h1 className="h1">Page Not Found</h1>
        <p className="lede" style={{ textAlign: 'center', maxWidth: '50ch' }}>
          {reason ?? 'The page you requested might have moved, or the link may be outdated.'} Our full commercial printing and branding catalogue is readily available.
        </p>
        <div className="state-actions" style={{ marginTop: '16px' }}>
          <Link className="btn btn-primary btn-lg" to="/shop">
            <span>Explore All Products</span>
            <ArrowRight aria-hidden="true" style={{ width: 16, height: 16 }} />
          </Link>
          <a className="btn btn-whatsapp btn-lg" href={whatsappLink(`Hello ${site.name}, I need help finding a page or product.`)}>
            <MessageCircle aria-hidden="true" />
            <span>Ask Us on WhatsApp</span>
          </a>
        </div>
      </div>
    </Layout>
  );
}
