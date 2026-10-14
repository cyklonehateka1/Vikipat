import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Mail, MapPin, MessageCircle, Phone, Upload } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Loader } from '../components/Dots';
import { API_BASE } from '../lib/api';
import { greetingLink, mapsLink, telLink, whatsappLink } from '../lib/format';
import { useTitle } from '../lib/useTitle';
import { site } from '../site';
import '../styles/pages/content.css';

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

/** Values are the API's catalogue categories; labels are how customers say it. */
const needs: { value: string; label: string }[] = [
  { value: 'Large Format', label: 'Banners and signs' },
  { value: 'DTF', label: 'Shirt printing (DTF)' },
  { value: 'Corporate Branding', label: 'Uniforms and corporate branding' },
  { value: 'Labels', label: 'Labels and stickers' },
  { value: 'Souvenirs', label: 'Mugs and gifts' },
  { value: 'Packaging', label: 'Packaging' },
  { value: 'Events', label: 'Event printing' },
];

const empty: Fields = {
  name: '',
  company: '',
  phone: '',
  email: '',
  need: 'Large Format',
  quantity: '',
  size: '',
  material: '',
  deadline: '',
  location: '',
  message: '',
};

function validate(fields: Fields): Errors {
  const errors: Errors = {};
  if (fields.name.trim().length < 2) errors.name = 'Enter your name or business name.';
  if (!/^[+0-9 ()-]{8,24}$/.test(fields.phone.trim())) errors.phone = 'Enter a phone number we can reach, like 024 000 0000.';
  if (fields.email && !/^\S+@\S+\.\S+$/.test(fields.email.trim())) errors.email = 'Check the email address.';
  if (!fields.quantity.trim()) errors.quantity = 'Tell us roughly how many you need.';
  return errors;
}

const order: (keyof Fields)[] = ['name', 'phone', 'email', 'quantity'];

export default function Contact() {
  useTitle(`Contact and quotes | ${site.fullName}`);
  const [fields, setFields] = useState<Fields>(empty);
  const [touched, setTouched] = useState<Partial<Record<keyof Fields, boolean>>>({});
  const [artwork, setArtwork] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [sent, setSent] = useState(false);

  const errors = validate(fields);
  const shown = (key: keyof Fields) => (touched[key] ? errors[key] : undefined);

  const set = (key: keyof Fields) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));

  const props = (key: keyof Fields) => ({
    id: `q-${key}`,
    name: key,
    value: fields[key],
    onChange: set(key),
    onBlur: () => setTouched((current) => ({ ...current, [key]: true })),
    'aria-invalid': Boolean(shown(key)),
    'aria-describedby': shown(key) ? `q-${key}-error` : undefined,
  });

  const error = (key: keyof Fields) =>
    shown(key) ? (
      <p className="field-error" id={`q-${key}-error`}>
        <AlertCircle aria-hidden="true" />
        {shown(key)}
      </p>
    ) : null;

  const needLabel = needs.find((item) => item.value === fields.need)?.label ?? fields.need;
  const summary = `Hello ${site.name}, I just sent a quote request on your website.\n\nName: ${fields.name.trim()}\nWhat I need: ${needLabel}\nQuantity: ${fields.quantity.trim()}${fields.size.trim() ? `\nSize: ${fields.size.trim()}` : ''}${fields.deadline ? `\nNeeded by: ${fields.deadline}` : ''}${artwork ? `\nArtwork: ${artwork.name}` : ''}`;

  const submit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate(fields);
    setTouched({ name: true, phone: true, email: true, quantity: true });
    const first = order.find((key) => found[key]);
    if (first) {
      document.getElementById(`q-${first}`)?.focus();
      return;
    }

    setBusy(true);
    setSubmitError('');
    try {
      let artworkUrl = '';
      if (artwork) {
        if (artwork.size > 10 * 1024 * 1024) throw new Error('That file is over 10 MB. Send it on WhatsApp instead.');
        const body = new FormData();
        body.append('file', artwork);
        const upload = await fetch(`${API_BASE}/quotes/media`, { method: 'POST', body });
        const uploaded = await upload.json().catch(() => ({}));
        if (!upload.ok)
          throw new Error(
            Array.isArray(uploaded.message) ? uploaded.message.join('. ') : uploaded.message || 'The file did not upload.',
          );
        artworkUrl = uploaded.url;
      }
      const response = await fetch(`${API_BASE}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fields,
          email: fields.email || undefined,
          artworkUrl: artworkUrl || undefined,
          artworkName: artwork?.name || '',
          website: '',
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          Array.isArray(result.message) ? result.message.join('. ') : result.message || 'Your request was not saved.',
        );
      setSent(true);
      window.scrollTo({ top: 0 });
    } catch (thrown) {
      setSubmitError(
        thrown instanceof TypeError
          ? 'We could not reach Vikipat. Check your connection and try again.'
          : thrown instanceof Error
            ? thrown.message
            : 'Your request was not saved. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Contact" back="/">
      <div className="container content">
        <header className="page-intro">
          <h1 className="title">Contact and quotes</h1>
          <p>Ask us anything, or tell us about a job that is not on the site and we will price it for you.</p>
        </header>

        <ul className="contact-ways">
          <li>
            <a className="contact-way is-primary" href={greetingLink} target="_blank" rel="noreferrer">
              <MessageCircle aria-hidden="true" />
              <span>
                <strong>WhatsApp</strong>
                <span>{site.whatsappDisplay}</span>
              </span>
            </a>
          </li>
          <li>
            <a className="contact-way" href={telLink}>
              <Phone aria-hidden="true" />
              <span>
                <strong>Call</strong>
                <span>{site.phoneDisplay}</span>
              </span>
            </a>
          </li>
          <li>
            <a className="contact-way" href={`mailto:${site.email}`}>
              <Mail aria-hidden="true" />
              <span>
                <strong>Email</strong>
                <span>{site.email}</span>
              </span>
            </a>
          </li>
          <li>
            <a className="contact-way" href={mapsLink} target="_blank" rel="noreferrer">
              <MapPin aria-hidden="true" />
              <span>
                <strong>Visit</strong>
                <span>{site.address.line1}</span>
              </span>
            </a>
          </li>
        </ul>

        <section className="section" aria-labelledby="quote-title">
          {sent ? (
            <div className="quote-sent" role="status">
              <span className="confirm-mark" aria-hidden="true">
                <CheckCircle2 />
              </span>
              <h2 className="title" id="quote-title">
                Request sent
              </h2>
              <p>
                Thank you, {fields.name.trim().split(' ')[0]}. We will get back to you on {fields.phone.trim()} with a
                price.
              </p>
              <a className="btn btn-secondary" href={whatsappLink(summary)} target="_blank" rel="noreferrer">
                <MessageCircle className="wa" aria-hidden="true" />
                Also message us on WhatsApp
              </a>
            </div>
          ) : (
            <form className="quote-form" onSubmit={submit} noValidate>
              <h2 className="title" id="quote-title">
                Ask for a quote
              </h2>

              <div className="form-grid form-grid-2">
                <div className="field">
                  <label className="field-label" htmlFor="q-name">
                    Name
                  </label>
                  <input className="input" autoComplete="name" {...props('name')} />
                  {error('name')}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="q-company">
                    Business or organisation <span className="field-optional">(optional)</span>
                  </label>
                  <input className="input" autoComplete="organization" {...props('company')} />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="q-phone">
                    Phone or WhatsApp number
                  </label>
                  <input className="input" type="tel" inputMode="tel" autoComplete="tel" {...props('phone')} />
                  {error('phone')}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="q-email">
                    Email <span className="field-optional">(optional)</span>
                  </label>
                  <input className="input" type="email" inputMode="email" autoComplete="email" {...props('email')} />
                  {error('email')}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="q-need">
                    What do you need?
                  </label>
                  <select className="select" {...props('need')}>
                    {needs.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="q-quantity">
                    How many?
                  </label>
                  <input className="input" inputMode="numeric" placeholder="50 shirts, 2 banners" {...props('quantity')} />
                  {error('quantity')}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="q-size">
                    Size <span className="field-optional">(optional)</span>
                  </label>
                  <input className="input" placeholder="8 × 4 ft, A5, adult sizes" {...props('size')} />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="q-deadline">
                    Needed by <span className="field-optional">(optional)</span>
                  </label>
                  <input className="input" type="date" {...props('deadline')} />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="q-material">
                    Material or finish <span className="field-optional">(optional)</span>
                  </label>
                  <input className="input" placeholder="Not sure? Leave it blank" {...props('material')} />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="q-location">
                    Delivery area <span className="field-optional">(optional)</span>
                  </label>
                  <input className="input" placeholder="Pickup, or your area" {...props('location')} />
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="q-message">
                  Anything else? <span className="field-optional">(optional)</span>
                </label>
                <textarea className="textarea" placeholder="Colours, wording, where it will be used" {...props('message')} />
              </div>

              <div className="field">
                <span className="field-label">
                  Artwork or photo <span className="field-optional">(optional)</span>
                </span>
                <label className="quote-file">
                  <Upload aria-hidden="true" />
                  <span>{artwork ? artwork.name : 'Choose a file (PDF, PNG, JPG or WebP, up to 10 MB)'}</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="visually-hidden"
                    onChange={(event) => setArtwork(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              {submitError && (
                <p className="form-alert" role="alert">
                  <AlertCircle aria-hidden="true" />
                  <span>{submitError}</span>
                </p>
              )}

              <button className="btn btn-primary btn-lg quote-submit" disabled={busy}>
                {busy ? <Loader label="Sending" /> : 'Send request'}
              </button>
            </form>
          )}
        </section>
      </div>
    </AppShell>
  );
}
