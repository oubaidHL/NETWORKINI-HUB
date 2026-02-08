# NETWORKINI-HUB 🚀

**The Ultimate DevOps Tools Dashboard**  
Hosted at: [hub.networkini.com](https://hub.networkini.com)  
Source: [github.com/oubaidHL/NETWORKINI-HUB](https://github.com/oubaidHL/NETWORKINI-HUB)
Linkedin: [linkedin.com/in/oubaidhlaimi/](https://linkedin.com/in/oubaidhlaimi/)

---

## 🌟 Overview

NETWORKINI-HUB is a dynamic, searchable, and always-up-to-date registry of the best DevOps tools. It aggregates data from curated "Awesome" lists, Docker Hub, and GitHub to provide a single pane of glass for discovering tools.

### Key Features
- **🔍 Smart Search**: Fuzzy search by name, description, or category (`Ctrl + K` / `Ctrl + F`).
- **📊 Rich Metadata**: Shows GitHub stars, Docker pull counts, and subcategories.
- **⚡ Performance**: Paginated, lazy-loaded interface handling thousands of tools.
- **🌙 Pro Interface**: System-aware Dark/Light mode.
- **🛠️ Automated**: Daily updates via GitHub Actions.

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
