import { Rss, Mail, MessageCircle, Send } from 'lucide-react';

// Public, non-secret settings injected at build time (see deploy.yml).
const BUTTONDOWN_USER = import.meta.env.VITE_BUTTONDOWN_USER;
const DISCORD_INVITE = import.meta.env.VITE_DISCORD_INVITE;
const TELEGRAM_CHANNEL = import.meta.env.VITE_TELEGRAM_CHANNEL;
const DATA_URL = `${import.meta.env.BASE_URL}data/`;

const FollowBox = ({ categories = [] }) => (
  <section className="follow-box" aria-label="Follow new tools">
    <h3>Follow new tools</h3>
    <p className="muted-note">Get notified when new tools land in the hub. Subscribers are handled by the email provider; nothing is stored in this repository.</p>

    {BUTTONDOWN_USER && (
      <form
        className="follow-form"
        action={`https://buttondown.com/api/emails/embed-subscribe/${encodeURIComponent(BUTTONDOWN_USER)}`}
        method="post"
        target="popupwindow"
        onSubmit={() => window.open(`https://buttondown.com/${encodeURIComponent(BUTTONDOWN_USER)}`, 'popupwindow')}
      >
        <Mail size={18} />
        <input type="email" name="email" placeholder="you@example.com" required aria-label="Email address" />
        <button type="submit" className="chip active">Subscribe</button>
      </form>
    )}

    <div className="chips">
      <a className="chip" href={`${DATA_URL}feed.xml`} target="_blank" rel="noopener noreferrer"><Rss size={13} /> RSS (all)</a>
      {DISCORD_INVITE && <a className="chip" href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"><MessageCircle size={13} /> Discord</a>}
      {TELEGRAM_CHANNEL && <a className="chip" href={TELEGRAM_CHANNEL} target="_blank" rel="noopener noreferrer"><Send size={13} /> Telegram</a>}
    </div>

    {categories.length > 0 && (
      <details>
        <summary>Follow one topic only</summary>
        <div className="chips">
          {categories.map((c) => (
            <a key={c} className="chip small" href={`${DATA_URL}feed-${c}.xml`} target="_blank" rel="noopener noreferrer"><Rss size={11} /> {c}</a>
          ))}
        </div>
      </details>
    )}
  </section>
);

export default FollowBox;
