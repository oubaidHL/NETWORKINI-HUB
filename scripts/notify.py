"""Announces newly discovered tools. Runs in GitHub Actions after the data refresh.

Every channel is optional and driven by repository secrets, so nothing about the
subscribers is ever stored in this (public) repository:

  BUTTONDOWN_API_KEY   email digest to your Buttondown subscribers (they sign up
                       through the form on the site; Buttondown stores the emails)
  BUTTONDOWN_AUTO_SEND 'true' sends immediately; anything else saves a draft and the Discord
                       message links to the one-click "Send digest" workflow to approve it
  DISCORD_WEBHOOK_URL  post to a Discord channel
  TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID   post to a Telegram channel/group
"""
import json
import os
import re
import sys
from datetime import date
from urllib.parse import quote

import requests

SITE_URL = 'https://hub.networkini.com/'
DATA = 'public/data'


def load(name, default):
    try:
        with open(os.path.join(DATA, name), encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def digest():
    meta = load('meta.json', {})
    log = load('changelog.json', [])
    if not meta.get('new_this_run') or not log or log[0]['date'] != date.today().isoformat():
        return None
    entry = log[0]
    return entry['count'], entry['added'][:10]


def tool_link(url):
    return f"{SITE_URL}?tool={quote(url.replace('https://github.com/', ''), safe='/')}"


def md_safe(text, limit=140):
    """Names/descriptions come from third-party lists: neutralise markdown, links and mentions."""
    text = re.sub(r'https?://\S+', '', text or '')
    text = re.sub(r'[\[\]()<>*_`~|@#\\]', '', text)
    text = ' '.join(text.split())
    return text[:limit] + ('…' if len(text) > limit else '')


def post(label, fn):
    try:
        r = fn()
        r.raise_for_status()
        print(f'{label}: ok')
        return r
    except requests.RequestException as e:
        print(f'{label}: failed ({e})')  # a broken channel must not fail the data pipeline
        return None


def main():
    d = digest()
    if not d:
        print('No new tools today; nothing to announce.')
        return 0
    count, tools = d
    subject = f'{count} new DevOps tools on NETWORKINI-HUB'

    md = [f'**{count} new tools** were added to the hub:\n']
    md += [f"- [{md_safe(t['name'], 60)}]({tool_link(t['url'])}) ({md_safe(t['category'], 30)}): {md_safe(t.get('description'))}" for t in tools]
    if count > len(tools):
        md.append(f'\n…and {count - len(tools)} more. [Browse what\'s new]({SITE_URL}?mode=new)')
    body = '\n'.join(md)

    review = ''
    if key := os.getenv('BUTTONDOWN_API_KEY'):
        status = 'about_to_send' if os.getenv('BUTTONDOWN_AUTO_SEND', '').lower() == 'true' else 'draft'
        res = post(f'buttondown ({status})', lambda: requests.post(
            'https://api.buttondown.com/v1/emails',
            headers={'Authorization': f'Token {key}'},
            json={'subject': subject, 'body': body, 'status': status}, timeout=30))
        if res is not None and status == 'draft':
            repo = os.getenv('GITHUB_REPOSITORY', 'oubaidHL/NETWORKINI-HUB')
            review = ('\n\n📬 **Email digest saved as a draft.**\n'
                      '• Review: <https://buttondown.com/emails>\n'
                      f'• Approve & send: <https://github.com/{repo}/actions/workflows/send-digest.yml> '
                      '→ *Run workflow*')

    if hook := os.getenv('DISCORD_WEBHOOK_URL'):
        post('discord', lambda: requests.post(hook, json={'content': (f'**{subject}**\n{body}'[:1700] + review)[:1990], 'allowed_mentions': {'parse': []}}, timeout=30))

    if (token := os.getenv('TELEGRAM_BOT_TOKEN')) and (chat := os.getenv('TELEGRAM_CHAT_ID')):
        post('telegram', lambda: requests.post(
            f'https://api.telegram.org/bot{token}/sendMessage',
            json={'chat_id': chat, 'text': f'{subject}\n\n{body}'[:4000], 'disable_web_page_preview': True},
            timeout=30))
    return 0


if __name__ == '__main__':
    sys.exit(main())
