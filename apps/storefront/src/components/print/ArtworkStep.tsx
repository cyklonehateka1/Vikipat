import React, { useState } from 'react';
import { AlertCircle, Clock, FileCheck2, Link2, Paintbrush, Upload } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import { cedisFromPesewas } from '../../lib/format';
import { Loader } from '../Dots';
import { ArtworkOption, ArtworkState } from './types';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp';

/** Step three: how the artwork reaches us. */
export function ArtworkStep({
  artwork,
  setArtwork,
  onUploading,
  designFromPesewas,
  summary,
  onEditSize,
  linkError,
}: {
  artwork: ArtworkState;
  setArtwork: (next: ArtworkState) => void;
  onUploading: (busy: boolean) => void;
  designFromPesewas: number | null;
  summary: string;
  onEditSize: () => void;
  linkError: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const options: { value: ArtworkOption; title: string; note: string; icon: typeof Upload }[] = [
    { value: 'upload', title: 'Upload a file', note: 'PDF, PNG, JPG or WebP, up to 10 MB', icon: Upload },
    { value: 'link', title: 'Share a link', note: 'Google Drive, WeTransfer or Dropbox. Best for AI and EPS files', icon: Link2 },
    {
      value: 'design_service',
      title: 'Design it for me',
      note: designFromPesewas
        ? `From ${cedisFromPesewas(designFromPesewas)}. We confirm the design price before you pay`
        : 'We confirm the design price before you pay',
      icon: Paintbrush,
    },
    { value: 'later', title: 'Send it later', note: 'On WhatsApp after you order', icon: Clock },
  ];

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setUploadError('That file is over 10 MB. Share it as a link instead.');
      return;
    }
    setUploading(true);
    onUploading(true);
    setUploadError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch(`${API_BASE}/quotes/media`, { method: 'POST', body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'The upload did not go through. Try a PDF, PNG, JPG or WebP file.');
      setArtwork({ ...artwork, url: data.url, name: data.name || file.name });
    } catch (thrown) {
      setUploadError(thrown instanceof Error ? thrown.message : 'The upload did not go through. Please try again.');
    } finally {
      setUploading(false);
      onUploading(false);
    }
  };

  return (
    <div className="print-step print-artwork print-flow">
      <header className="print-head">
        <h1>Send us your artwork</h1>
        <p>Choose how the design reaches us.</p>
      </header>

      <div className="opt is-static print-summary">
        <span className="opt-body">
          <span className="opt-title">Your job</span>
          <span className="opt-note">{summary}</span>
        </span>
        <button type="button" className="opt-link" onClick={onEditSize}>
          Edit
        </button>
      </div>

      <fieldset className="print-fieldset print-group">
        <legend className="print-group-title">Artwork</legend>
        <div className="opt-list">
          {options.map(({ value, title, note, icon: Icon }) => (
            <label className="opt" key={value}>
              <input
                type="radio"
                name="artwork"
                className="opt-input"
                checked={artwork.option === value}
                onChange={() => setArtwork({ ...artwork, option: value })}
              />
              <span className="opt-icon" aria-hidden="true">
                <Icon />
              </span>
              <span className="opt-body">
                <span className="opt-title">{title}</span>
                <span className="opt-note">{note}</span>
              </span>
              <span className="opt-radio" aria-hidden="true" />
            </label>
          ))}
        </div>
      </fieldset>

      {artwork.option === 'upload' && (
        <div className="print-upload">
          {artwork.url && !uploading ? (
            <div className="print-file">
              <FileCheck2 aria-hidden="true" />
              <span className="print-file-name">{artwork.name}</span>
              <label className="btn btn-ghost">
                Replace
                <input type="file" accept={ACCEPT} onChange={upload} className="visually-hidden" />
              </label>
            </div>
          ) : (
            <label className={`print-drop${uploading ? ' is-busy' : ''}`}>
              {uploading ? (
                <>
                  <Loader label="Uploading" />
                  <span className="print-drop-title">Uploading your file</span>
                </>
              ) : (
                <>
                  <Upload aria-hidden="true" />
                  <span className="print-drop-title">Choose a file</span>
                  <span className="print-drop-note">PDF, PNG, JPG or WebP, up to 10 MB</span>
                </>
              )}
              <input type="file" accept={ACCEPT} onChange={upload} disabled={uploading} className="visually-hidden" />
            </label>
          )}
          {uploadError && (
            <p className="field-error" role="alert">
              <AlertCircle aria-hidden="true" />
              {uploadError}
            </p>
          )}
        </div>
      )}

      {artwork.option === 'link' && (
        <div className="field print-link">
          <label className="field-label" htmlFor="artwork-link">
            Link to your file
          </label>
          <input
            id="artwork-link"
            className="input"
            type="url"
            inputMode="url"
            placeholder="https://drive.google.com/..."
            value={artwork.link}
            aria-invalid={linkError}
            aria-describedby="artwork-link-hint"
            onChange={(event) => setArtwork({ ...artwork, link: event.target.value })}
          />
          {linkError ? (
            <p className="field-error" id="artwork-link-hint">
              <AlertCircle aria-hidden="true" />
              Paste the full link, starting with https://
            </p>
          ) : (
            <p className="field-hint" id="artwork-link-hint">
              Make sure anyone with the link can open it.
            </p>
          )}
        </div>
      )}

      <div className="field print-notes">
        <label className="field-label" htmlFor="artwork-notes">
          {artwork.option === 'design_service' ? 'What should the design say?' : 'Notes for our team'}{' '}
          <span className="field-optional">(optional)</span>
        </label>
        <textarea
          id="artwork-notes"
          className="textarea"
          placeholder={
            artwork.option === 'design_service'
              ? 'Business name, phone number, colours, the message you want'
              : 'Eyelets on all corners, matte finish, and so on'
          }
          value={artwork.notes}
          onChange={(event) => setArtwork({ ...artwork, notes: event.target.value })}
        />
      </div>
    </div>
  );
}
