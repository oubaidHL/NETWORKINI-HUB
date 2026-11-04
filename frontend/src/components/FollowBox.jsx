import { useState } from 'react';
import { Rss, Mail, MessageCircle, Send, Check } from 'lucide-react';

// Public, non-secret settings injected at build time (see deploy.yml).
const BUTTONDOWN_USER = import.meta.env.VITE_BUTTONDOWN_USER;
const DISCORD_INVITE = import.meta.env.VITE_DISCORD_INVITE;
const TELEGRAM_CHANNEL = import.meta.env.VITE_TELEGRAM_CHANNEL;
const DATA_URL = `${import.meta.env.BASE_URL}data/`;

const feedUrl = (name) => new URL(`${DATA_URL}${name}`, window.location.href).href;

const FollowBox = ({ categories = [], onCopy }) => {
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const [shownAt] = useState(() => Date.now());

  const subscribe = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    // Bots fill hidden fields and submit instantly; pretend success, send nothing.
    if (form.get('website') || Date.now() - shownAt < 2000) { setState('done'); return; }
    setState('sending');
    try {
      // Buttondown's embed endpoint has no CORS headers, so the reply is opaque;
      // a resolved request means it was accepted and a confirmation email is on its way.
      await fetch(`https://buttondown.com/api/emails/embed-subscribe/${encodeURIComponent(BUTTONDOWN_USER)}`, {
        method: 'POST',
        mode: 'no-cors',
        body: form,
      });
      setState('done');
    } catch {
      setState('error');
    }
  };

  const copyFeed = (name) => onCopy(feedUrl(name), 'Feed URL copied: paste it in your RSS reader');

  return (
    <section className="follow-box" aria-label="Follow new tools">
      <h3>Follow new tools</h3>
      <p className="muted-note">Get notified when new tools land in the hub. Subscribers are handled by the email provider; nothing is stored in this repository.</p>

      {BUTTONDOWN_USER && (state === 'done' ? (
        <p className="follow-ok"><Check size={16} /> Almost there: check your inbox and confirm your email.</p>
      ) : (
        <form className="follow-form" onSubmit={subscribe}>
          <Mail size={18} />
          <input type="email" name="email" placeholder="you@example.com" required aria-label="Email address" />
          <input type="hidden" name="embed" value="1" />
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp-field" />
          <button type="submit" className="chip active" disabled={state === 'sending'}>
            {state === 'sending' ? 'Subscribing…' : 'Subscribe'}
          </button>
          {state === 'error' && <span className="follow-err">Could not subscribe. Please try again.</span>}
        </form>
      ))}

      <div className="chips">
        <button className="chip" onClick={() => copyFeed('feed.xml')} title="Copy the RSS feed URL"><Rss size={13} /> Copy RSS feed URL</button>
        {DISCORD_INVITE && <a className="chip" href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"><MessageCircle size={13} /> Discord</a>}
        {TELEGRAM_CHANNEL && <a className="chip" href={TELEGRAM_CHANNEL} target="_blank" rel="noopener noreferrer"><Send size={13} /> Telegram</a>}
      </div>

      {categories.length > 0 && (
        <details>
          <summary>Follow one topic only (copies that topic's feed URL)</summary>
          <div className="chips">
            {categories.map((c) => (
              <button key={c} className="chip small" onClick={() => copyFeed(`feed-${c}.xml`)}><Rss size={11} /> {c}</button>
            ))}
          </div>
        </details>
      )}
    </section>
  );
};

export default FollowBox;
