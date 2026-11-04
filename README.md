# NETWORKINI-HUB 🚀

**The Ultimate DevOps Tools Dashboard**  
Hosted at: [hub.networkini.com](https://hub.networkini.com)  
Source: [github.com/oubaidHL/NETWORKINI-HUB](https://github.com/oubaidHL/NETWORKINI-HUB)
Linkedin: [linkedin.com/in/oubaidhlaimi/](https://linkedin.com/in/oubaidhlaimi/)

---

## 🌟 Overview

NETWORKINI-HUB is a dynamic, searchable, and always-up-to-date registry of the best DevOps tools. It aggregates data from curated "Awesome" lists, Docker Hub, and GitHub to provide a single pane of glass for discovering tools.

### Key Features
- **🔍 Smart Search**: Fuzzy search by name, description, topics or category (`Ctrl/⌘ + K` or `/`).
- **🧭 Filters & sorting**: category chips with live counts, language filter, "recently active" filter, sort by stars / last update / name / Docker pulls.
- **🔗 Shareable views**: every filter lives in the URL.
- **❤️ Saved tools**: bookmark tools locally and filter to them.
- **📊 Rich metadata**: stars, forks, license, topics, freshness, archived flag, Docker pulls, install command.
- **🔥 Trending**: stars gained per week, per domain (Infrastructure, CI/CD, Observability, Security, Data), measured from daily snapshots.
- **✨ New**: newly discovered tools are highlighted on the homepage, listed in a changelog and published as an RSS feed (`/data/feed.xml`).
- **🧱 Stack builder**: pick needs (containers, IaC, GitOps, security…), get suggested tools, export your stack as Markdown or a shareable link.
- **🖥️ Grid / list views**, dark/light/system theme, keyboard-friendly, skeleton loading and error retry.
- **🛠️ Automated**: a daily GitHub Action refreshes the data (keeping cached metadata if rate-limited) and redeploys the site.

---

## 🚀 How to Run Locally

### Using Docker (Recommended)
```bash
git clone https://github.com/oubaidHL/NETWORKINI-HUB.git
cd NETWORKINI-HUB
docker-compose up -d
```
Access the app at `http://localhost:5173`.

### Manual Setup
**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Scraper:**
```bash
pip install -r scripts/requirements.txt
python scripts/scraper.py
```

---

## 🛠️ Tech Stack
- **Frontend**: React, Vite, Fuse.js
- **Backend/Data**: Python (BeautifulSoup4), GitHub Actions
- **Containerization**: Docker, Docker Compose

---

## 🤝 Contributing
Contributions are welcome! Please open an issue or PR on the GitHub repo.

## 📄 License
MIT License.

---
*Created by [Oubaid Hlaimi](https://linkedin.com/in/oubaidhlaimi/)*

---

## 🔔 Following new tools (RSS, email, chat)

- **RSS**: `https://hub.networkini.com/data/feed.xml` (all) or `data/feed-<category>.xml` (one topic, e.g. `feed-kubernetes.xml`). Browsers/readers auto-discover it.
- **Email, no backend**: the site embeds a [Buttondown](https://buttondown.com) subscribe form. Buttondown stores and protects the addresses (double opt-in, unsubscribe link). **No email is ever written to this public repo.**
- **Chat**: optional Discord / Telegram announcements.

After each daily refresh, `scripts/notify.py` announces newly discovered tools on every channel that is configured. A channel is skipped when its secret is missing.

### One-time setup (repository *Settings → Secrets and variables → Actions*)

| Kind | Name | Purpose |
| --- | --- | --- |
| Variable | `BUTTONDOWN_USER` | Buttondown username → shows the subscribe form on the site |
| Secret | `BUTTONDOWN_API_KEY` | lets the workflow create the digest email |
| Variable | `BUTTONDOWN_AUTO_SEND` | `true` = send automatically; unset = saved as a **draft** to review first |
| Secret | `DISCORD_WEBHOOK_URL` | post to a Discord channel |
| Variable | `DISCORD_INVITE` | invite link shown on the site |
| Secrets | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | post to a Telegram channel |
| Variable | `TELEGRAM_CHANNEL` | channel link shown on the site |

Variables are public settings; secrets stay private to Actions.
