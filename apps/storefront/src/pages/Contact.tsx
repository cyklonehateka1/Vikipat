import { useState } from 'react';
import { AlertCircle, ChevronDown, Clock, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { Layout, PageHead } from '../components/Layout';
import { Crumbs, Label } from '../components/Primitives';
import { site } from '../site';
import { telLink, whatsappLink } from '../lib/format';
import { useTitle } from '../lib/useReveal';

type Fields = {
  name: string;
  company: string;
  phone: string;
  email: string;
  need: string;
  quantity: string;
  size: string;
  material: string;
  deadline: string;
  location: string;
  message: string;
};
type Errors = Partial<Record<keyof Fields, string>>;

const empty: Fields = { name: '', company: '', phone: '', email: '', need: 'Labels', quantity: '', size: '', material: '', deadline: '', location: '', message: '' };

const subjects = ['Labels', 'Packaging', 'DTF', 'Large Format', 'Corporate Branding', 'Souvenirs', 'Events'];
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

function validate(fields: Fields): Errors {
  const errors: Errors = {};
  if (fields.name.trim().length < 2)
    errors.name = 'Please provide your name or business name.';
  if (!/^[\d\s+()-]{9,}$/.test(fields.phone.trim()))
    errors.phone = 'Please provide a valid phone or WhatsApp number.';
  if (fields.email && !/^\S+@\S+\.\S+$/.test(fields.email)) errors.email = 'Please provide a valid email address.';
  if (!fields.quantity.trim()) errors.quantity = 'Please tell us the quantity required.';
  return errors;
}

export default function Contact() {
  useTitle(`Contact Studio & Custom Quotes | ${site.fullName}`);

  const [fields, setFields] = useState<Fields>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof Fields, boolean>>>({});
  const [artwork, setArtwork] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const set =
    (key: keyof Fields) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const next = { ...fields, [key]: event.target.value };
      setFields(next);
      if (touched[key]) setErrors(validate(next));
    };

  const blur = (key: keyof Fields) => () => {
    setTouched((state) => ({ ...state, [key]: true }));
    setErrors(validate(fields));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate(fields);
    setErrors(found);
    setTouched(Object.fromEntries(Object.keys(fields).map((key) => [key, true])) as Record<keyof Fields, boolean>);

    const firstInvalid = (Object.keys(found) as (keyof Fields)[])[0];
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setBusy(true);
    setSubmitError('');
    let artworkUrl = '';
    try {
      if (artwork) {
        const body = new FormData();
        body.append('file', artwork);
        const upload = await fetch(`${API_URL}/quotes/media`, { method: 'POST', body });
        const uploaded = await upload.json();
        if (!upload.ok) throw new Error(Array.isArray(uploaded.message) ? uploaded.message.join('. ') : uploaded.message || 'Artwork upload failed.');
        artworkUrl = uploaded.url;
      }
      const response = await fetch(`${API_URL}/quotes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fields, email: fields.email || undefined, artworkUrl: artworkUrl || undefined, artworkName: artwork?.name || '', website: '' }) });
      const result = await response.json();
      if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join('. ') : result.message || 'Quote request could not be saved.');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Quote request could not be saved. Please try again.');
      setBusy(false);
      return;
    }

    window.location.href = whatsappLink(
      `Hello ${site.name},\n\n*QUOTE REQUEST*\n*Name:* ${fields.name.trim()}\n*Company:* ${fields.company.trim() || 'Not provided'}\n*Phone/WhatsApp:* ${fields.phone.trim()}\n*Email:* ${fields.email.trim() || 'Not provided'}\n*What I need:* ${fields.need}\n*Quantity:* ${fields.quantity.trim()}\n*Size:* ${fields.size.trim() || 'To be discussed'}\n*Material:* ${fields.material.trim() || 'Please advise'}\n*Deadline:* ${fields.deadline || 'Flexible'}\n*Delivery location:* ${fields.location.trim() || 'To be confirmed'}\n*Artwork:* ${artwork ? `${artwork.name} — I will attach it in this chat` : 'I need artwork/design support'}\n\n*Additional information:*\n${fields.message.trim() || 'None'}`,
    );
  };

  const fieldProps = (key: keyof Fields) => ({
    id: key,
    name: key,
    value: fields[key],
    onChange: set(key),
    onBlur: blur(key),
    'aria-invalid': Boolean(errors[key] && touched[key]),
    'aria-describedby': errors[key] && touched[key] ? `${key}-error` : undefined,
  });

  const showError = (key: keyof Fields) =>
    errors[key] && touched[key] ? (
      <p className="field-error" id={`${key}-error`} role="alert">
        <AlertCircle aria-hidden="true" />
        {errors[key]}
      </p>
    ) : null;

  return (
    <Layout>
      <PageHead
        title="Contact Our Studio &amp; Request a Quote"
        lede="Have a question or custom design specifications? Connect directly with our Accra production engineers via WhatsApp, phone call, or send your project brief below."
      >
        <Crumbs trail={[{ label: 'Home', to: '/' }, { label: 'Contact & Quotes' }]} />
      </PageHead>

      <section className="shell section-tight">
        <div className="contact">
          {/* Left Column: Direct Directory */}
          <div className="stack-lg">
            <div className="stack">
              <Label micro>Studio Contact Directory</Label>
              <div className="directory">
                <div className="directory-row">
                  <span>WhatsApp</span>
                  <a href={whatsappLink(`Hello ${site.name}`)} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageCircle aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--whatsapp)' }} />
                    <span>{site.whatsappDisplay}</span>
                  </a>
                </div>
                <div className="directory-row">
                  <span>Phone</span>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <Phone aria-hidden="true" style={{ width: 15, height: 15 }} />
                    <a href={telLink}>{site.phoneDisplay}</a>
                    <span aria-hidden="true">/</span>
                    <a href={`tel:${site.whatsappDial}`}>{site.whatsappDisplay}</a>
                  </p>
                </div>
                <div className="directory-row">
                  <span>Email</span>
                  <a href={`mailto:${site.email}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail aria-hidden="true" style={{ width: 15, height: 15 }} />
                    <span>{site.email}</span>
                  </a>
                </div>
                <div className="directory-row">
                  <span>Workshop</span>
                  <p style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <MapPin aria-hidden="true" style={{ width: 16, height: 16, flex: 'none', color: 'var(--brand-primary)', marginTop: 2 }} />
                    <span>
                      {site.address.line1}, {site.address.line2}
                    </span>
                  </p>
                </div>
                <div className="directory-row">
                  <span>Coverage</span>
                  <p>{site.deliveryArea}</p>
                </div>
                <div className="directory-row">
                  <span>Accepted</span>
                  <p>{site.payment}</p>
                </div>
              </div>
            </div>

            <div className="stack">
              <Label micro>Workshop &amp; Counter Hours</Label>
              <div style={{ background: '#ffffff', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--brand-primary)', fontWeight: 700, fontSize: '0.85rem' }}>
                  <Clock aria-hidden="true" style={{ width: 16, height: 16 }} />
                  <span>Production Schedule</span>
                </div>
                {site.hours.map((row) => (
                  <div className="hours-row" key={row.days}>
                    <span>{row.days}</span>
                    <span style={{ fontWeight: 600 }}>{row.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="row row-wrap" style={{ gap: '12px' }}>
              <a className="btn btn-whatsapp" href={whatsappLink(`Hello ${site.name}`)}>
                <MessageCircle aria-hidden="true" />
                <span>Chat on WhatsApp</span>
              </a>
              <a className="btn btn-secondary" href={telLink}>
                <Phone aria-hidden="true" />
                <span>Call Studio</span>
              </a>
            </div>
          </div>

          {/* Right Column: Interactive Brief Form */}
          <div className="form-panel">
            <Label micro>Request a Custom Quote</Label>
            <h2 className="h2" style={{ marginTop: 'var(--s2)' }}>
              Tell Us About Your Project
            </h2>

            <form onSubmit={submit} noValidate>
              <div className="form-body">
                <div className="form-grid-2">
                  <div className="field">
                    <label className="label-micro" htmlFor="name">
                      Your Name <span className="field-req">*</span>
                    </label>
                    <input className="input" type="text" autoComplete="name" placeholder="e.g. Kwame Mensah" {...fieldProps('name')} />
                    {showError('name')}
                  </div>

                  <div className="field">
                    <label className="label-micro" htmlFor="company">Company Name</label>
                    <input className="input" type="text" autoComplete="organization" placeholder="e.g. Apex Technologies" {...fieldProps('company')} />
                  </div>

                  <div className="field">
                    <label className="label-micro" htmlFor="phone">
                      WhatsApp or Phone Number <span className="field-req">*</span>
                    </label>
                    <input
                      className="input"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="054 000 0000"
                      {...fieldProps('phone')}
                    />
                    {showError('phone')}
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="field">
                    <label className="label-micro" htmlFor="email">Email Address</label>
                    <input className="input" type="email" autoComplete="email" placeholder="name@company.com" {...fieldProps('email')} />
                    {showError('email')}
                  </div>
                  <div className="field">
                    <label className="label-micro" htmlFor="need">What Do You Need?</label>
                    <span className="select-wrap"><select className="select" id="need" name="need" value={fields.need} onChange={set('need')}>{subjects.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown aria-hidden="true" /></span>
                  </div>
                </div>

                <div className="field">
                  <div className="form-grid-2">
                    <div className="field"><label className="label-micro" htmlFor="quantity">Quantity <span className="field-req">*</span></label><input className="input" placeholder="e.g. 500 pieces" {...fieldProps('quantity')} />{showError('quantity')}</div>
                    <div className="field"><label className="label-micro" htmlFor="size">Size</label><input className="input" placeholder="e.g. A5 or 2m × 1m" {...fieldProps('size')} /></div>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="field"><label className="label-micro" htmlFor="material">Material</label><input className="input" placeholder="e.g. Vinyl, kraft paper, cotton" {...fieldProps('material')} /></div>
                  <div className="field"><label className="label-micro" htmlFor="deadline">Deadline</label><input className="input" type="date" {...fieldProps('deadline')} /></div>
                </div>

                <div className="field"><label className="label-micro" htmlFor="location">Delivery Location</label><input className="input" autoComplete="street-address" placeholder="Area, city or full delivery address" {...fieldProps('location')} /></div>

                <div className="field"><label className="label-micro" htmlFor="artwork">Upload Artwork</label><label className="artwork-drop" htmlFor="artwork"><span>{artwork ? artwork.name : 'Choose your artwork or drag it here'}</span><small>PDF, PNG, JPG or WebP · maximum 10MB</small></label><input className="visually-hidden" id="artwork" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(event) => { const file = event.target.files?.[0] || null; if (file && file.size > 10 * 1024 * 1024) { window.alert('Artwork must be 10MB or smaller.'); event.target.value = ''; setArtwork(null); return; } setArtwork(file); }} /></div>

                <div className="field">
                  <label className="label-micro" htmlFor="message">
                    Additional Information
                  </label>
                  <textarea
                    className="textarea"
                    placeholder="Finishing preferences, colours, special instructions or anything else we should know..."
                    {...fieldProps('message')}
                  />
                  <p className="field-help">
                    Submitting opens WhatsApp with your complete brief. If you selected artwork, attach the named file in the WhatsApp conversation.
                  </p>
                </div>
              </div>

              <div className="form-foot">
                {submitError && <p className="field-error" role="alert"><AlertCircle aria-hidden="true" />{submitError}</p>}
                <p>We review inquiries promptly during studio hours (typically within 15–30 minutes).</p>
                <button className="btn btn-whatsapp btn-lg" type="submit" disabled={busy}>
                  <Send aria-hidden="true" style={{ width: 16, height: 16 }} />
                  <span>{busy ? 'Saving Request…' : 'Submit Quote Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </Layout>
  );
}
