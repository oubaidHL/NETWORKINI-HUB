# Security

Please report vulnerabilities privately via GitHub's "Report a vulnerability" button (Security tab) rather than a public issue.

How the hub is hardened:
- Scraped data is untrusted: only `http(s)` URLs on `github.com`, `gitlab.com` and `hub.docker.com` pointing at a repository are accepted, and `scripts/blocklist.txt` can ban owners or repos.
- READMEs are rendered through an HTML sanitizer, and production builds ship a strict Content-Security-Policy.
- Announcements (Discord, email) neutralise markdown, links and mentions coming from scraped text.
- No secrets live in the repository; API keys and webhooks are GitHub Actions secrets. Subscriber emails are stored by the email provider, never in the repo.
