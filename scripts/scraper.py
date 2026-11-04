"""Builds public/data/tools.json from curated "Awesome" lists.

Design notes
- Previous output is used as a cache: if GitHub rate-limits us or a source is
  down, existing tools keep their last known metadata instead of losing it.
- GitHub lookups run in a small thread pool and stop cleanly on rate limit.
- Per-run API budget: the stalest tools are refreshed first, so the 1000 req/h
  GITHUB_TOKEN limit is never hit and every tool is refreshed every few days.
- Star history (history.json) gives measured weekly star gains for "trending".
- changelog.json / feed.xml record newly discovered tools.
- meta.json records when/what was generated (shown in the UI).
"""
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from urllib.parse import quote
from xml.sax.saxutils import escape

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
OUTPUT_FILE = 'public/data/tools.json'
META_FILE = 'public/data/meta.json'
HISTORY_FILE = 'public/data/history.json'
CHANGELOG_FILE = 'public/data/changelog.json'
FEED_FILE = 'public/data/feed.xml'
SITE_URL = 'https://hub.networkini.com/'
REPO_BUDGET = int(os.getenv('REPO_BUDGET', 650))        # GitHub repo lookups per run
RELEASE_BUDGET = int(os.getenv('RELEASE_BUDGET', 150))  # latest-release lookups (popular tools only)
BASELINE = os.getenv('BASELINE') == '1'  # first import: don't flag everything as "new"
RELEASE_MIN_STARS = 1000
HISTORY_DAYS = 60
MAX_WORKERS = 8

SOURCES = {
    'docker': ['https://raw.githubusercontent.com/veggiemonk/awesome-docker/master/README.md'],
    'kubernetes': [
        'https://raw.githubusercontent.com/nubenetes/awesome-kubernetes/master/docs/kubernetes.md',
        'https://raw.githubusercontent.com/nubenetes/awesome-kubernetes/master/docs/helm.md',
        'https://raw.githubusercontent.com/nubenetes/awesome-kubernetes/master/docs/kubectl-commands.md',
        'https://raw.githubusercontent.com/ksoclabs/awesome-kubernetes-security/master/README.md',
    ],
    'ansible': ['https://raw.githubusercontent.com/ansible-community/awesome-ansible/main/README.md'],
    'terraform': ['https://raw.githubusercontent.com/shuaibiyy/awesome-terraform/master/README.md'],
    'security': [
        'https://raw.githubusercontent.com/sbilly/awesome-security/master/README.md',
        'https://raw.githubusercontent.com/devsecops/awesome-devsecops/master/README.md',
    ],
    'databases': ['https://raw.githubusercontent.com/mgramin/awesome-db-tools/master/README.md'],
    'observability': [
        'https://raw.githubusercontent.com/adriannovegil/awesome-observability/master/README.md',
        'https://raw.githubusercontent.com/dastergon/awesome-sre/master/README.md',
        'https://raw.githubusercontent.com/dastergon/awesome-chaos-engineering/master/README.md',
    ],
    'cloud': [
        'https://raw.githubusercontent.com/donnemartin/awesome-aws/master/README.md',
        'https://raw.githubusercontent.com/rootsongjc/awesome-cloud-native/master/README.md',
    ],
    'gitops': ['https://raw.githubusercontent.com/weaveworks/awesome-gitops/master/README.md'],
    'sysadmin': ['https://raw.githubusercontent.com/awesome-foss/awesome-sysadmin/master/README.md'],
    'devops': ['https://raw.githubusercontent.com/wmariuss/awesome-devops/master/README.md'],
    'cicd': ['https://raw.githubusercontent.com/cicdops/awesome-ciandcd/master/README.md',
        'https://raw.githubusercontent.com/sdras/awesome-actions/master/README.md',
        'https://raw.githubusercontent.com/meirwah/awesome-workflow-engines/master/README.md',],
    'monitoring': ['https://raw.githubusercontent.com/crazy-canux/awesome-monitoring/master/README.md'],
}

TOOL_RE = re.compile(r'^\s*[-*]\s*\[(.*?)\]\((.*?)\)\s*[-–:]?\s*(.*)')
HEADER_RE = re.compile(r'^#{2,4}\s+(.*)')
GITHUB_REPO_RE = re.compile(r'^https?://(?:www\.)?github\.com/([^/\s]+)/([^/\s#?]+)', re.I)
ENRICHED_KEYS = ('stars', 'language', 'topics', 'last_updated', 'license', 'github_description',
                 'install_cmd', 'archived', 'forks', 'created_at', 'latest_release', 'checked_at', 'first_seen')

rate_limited = False
repo_calls = 0
release_calls = 0
TODAY = date.today().isoformat()


def make_session():
    session = requests.Session()
    retry = Retry(total=3, backoff_factor=1, status_forcelist=(500, 502, 503, 504))
    session.mount('https://', HTTPAdapter(max_retries=retry, pool_maxsize=MAX_WORKERS))
    session.headers['User-Agent'] = 'networkini-hub-scraper'
    return session


SESSION = make_session()
GH_HEADERS = {'Accept': 'application/vnd.github+json'}
if GITHUB_TOKEN:
    GH_HEADERS['Authorization'] = f'Bearer {GITHUB_TOKEN}'


def normalize_url(url):
    url = url.strip().rstrip('/')
    m = GITHUB_REPO_RE.match(url)
    if m:
        repo = m.group(2).removesuffix('.git')
        return f'https://github.com/{m.group(1)}/{repo}'
    return url


def dedupe_key(url):
    return normalize_url(url).lower()


def clean_text(text):
    """Strips inline markdown (backticks, emphasis, links) from a description."""
    text = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', text)
    return re.sub(r'[`*_]{1,3}', '', text).strip()


def fetch_markdown(url):
    try:
        r = SESSION.get(url, timeout=30)
        r.raise_for_status()
        return r.text
    except requests.RequestException as e:
        print(f'  ! could not fetch {url}: {e}')
        return None


def parse_markdown(markdown, category):
    tools, subcategory = [], 'General'
    for line in markdown.split('\n'):
        line = line.strip()
        if not line:
            continue
        h = HEADER_RE.match(line)
        if h:
            subcategory = re.sub(r'[\*_`]|\[(.*?)\]\(.*?\)', r'\1', h.group(1)).strip() or 'General'
            continue
        m = TOOL_RE.match(line)
        if not m:
            continue
        name, url, description = (g.strip() for g in m.groups())
        if any(host in url for host in ('github.com', 'hub.docker.com', 'gitlab.com')):
            tools.append({
                'name': name,
                'url': normalize_url(url),
                'description': clean_text(description),
                'category': category,
                'subcategory': subcategory,
            })
    return tools


def docker_hub_stats(url):
    parts = [p for p in url.split('hub.docker.com', 1)[1].split('/') if p]
    if len(parts) >= 3 and parts[0] == 'r':
        namespace, repo = parts[1], parts[2]
    elif len(parts) >= 2 and parts[0] == '_':
        namespace, repo = 'library', parts[1]
    else:
        return {}
    try:
        r = SESSION.get(f'https://hub.docker.com/v2/repositories/{namespace}/{repo}/', timeout=20)
        if r.status_code == 200:
            d = r.json()
            return {'docker_pulls': d.get('pull_count', 0), 'docker_stars': d.get('star_count', 0),
                    'docker_url': url, 'is_docker': True}
    except requests.RequestException as e:
        print(f'  ! docker hub {url}: {e}')
    return {'docker_url': url, 'is_docker': True}


def github_metadata(url):
    global rate_limited
    m = GITHUB_REPO_RE.match(url)
    global repo_calls
    if rate_limited or not m or repo_calls >= REPO_BUDGET:
        return None
    repo_calls += 1
    owner, repo = m.group(1), m.group(2).removesuffix('.git')
    try:
        r = SESSION.get(f'https://api.github.com/repos/{owner}/{repo}', headers=GH_HEADERS, timeout=20)
    except requests.RequestException as e:
        print(f'  ! github {owner}/{repo}: {e}')
        return None
    if r.status_code in (403, 429) and r.headers.get('X-RateLimit-Remaining') == '0':
        rate_limited = True
        print('  ! GitHub rate limit reached; remaining tools keep cached metadata.')
        return None
    if r.headers.get('X-RateLimit-Remaining') == '0':
        rate_limited = True
    if r.status_code != 200:
        return None
    d = r.json()
    lang = d.get('language')
    install = {'Python': f'pip install {repo}', 'Go': f'go install github.com/{owner}/{repo}@latest',
               'JavaScript': f'npm install {repo}', 'TypeScript': f'npm install {repo}'}.get(lang)
    return {
        'stars': d.get('stargazers_count', 0),
        'forks': d.get('forks_count', 0),
        'language': lang,
        'topics': d.get('topics', []),
        'last_updated': d.get('pushed_at'),
        'created_at': d.get('created_at'),
        'checked_at': TODAY,
        'license': (d.get('license') or {}).get('name'),
        'github_description': d.get('description'),
        'archived': bool(d.get('archived')),
        'install_cmd': install,
    }


def latest_release(tool):
    global release_calls
    m = GITHUB_REPO_RE.match(tool['url'])
    if rate_limited or not m or release_calls >= RELEASE_BUDGET:
        return
    if (tool.get('stars') or 0) < RELEASE_MIN_STARS or tool.get('checked_at') != TODAY:
        return
    release_calls += 1
    try:
        r = SESSION.get(f'https://api.github.com/repos/{m.group(1)}/{m.group(2)}/releases/latest',
                        headers=GH_HEADERS, timeout=20)
        if r.status_code == 200:
            d = r.json()
            tool['latest_release'] = {'tag': d.get('tag_name'), 'published_at': d.get('published_at')}
    except requests.RequestException:
        pass


def enrich(tool):
    try:
        return _enrich(tool)
    except Exception as e:  # one bad entry must not abort the whole run
        print(f"  ! skipped enrichment for {tool['url']}: {e}")
        return tool


def _enrich(tool):
    if 'hub.docker.com' in tool['url']:
        tool.update(docker_hub_stats(tool['url']))
    else:
        meta = github_metadata(tool['url'])
        latest_release_pending = bool(meta)
        if meta:
            tool.update(meta)
            if not tool['description'] and meta.get('github_description'):
                tool['description'] = meta['github_description']
        if latest_release_pending:
            latest_release(tool)
    return tool


def load_previous():
    try:
        with open(OUTPUT_FILE, encoding='utf-8') as f:
            return {dedupe_key(t['url']): t for t in json.load(f)}
    except (OSError, ValueError):
        return {}


def write_json(path, data, indent=None):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=indent, ensure_ascii=False, separators=None if indent else (',', ':'))
        f.write('\n')


def read_json(path, default):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def update_history(tools):
    """One [date, stars] sample per tool per day, kept for HISTORY_DAYS."""
    history = read_json(HISTORY_FILE, {})
    cutoff = (date.today() - timedelta(days=HISTORY_DAYS)).isoformat()
    for t in tools:
        if t.get('stars') is None or t.get('checked_at') != TODAY:
            continue
        samples = [s for s in history.get(t['url'], []) if s[0] >= cutoff and s[0] != TODAY]
        samples.append([TODAY, t['stars']])
        history[t['url']] = samples
    return {u: h for u, h in history.items() if u in {t['url'] for t in tools}}


def add_trend(tool, samples):
    """`trend` = stars gained per week; measured from history when possible, else estimated."""
    tool.pop('trend', None)
    tool.pop('trend_measured', None)
    stars = tool.get('stars')
    if stars is None or tool.get('archived'):
        return
    pushed = tool.get('last_updated')
    if pushed and (datetime.now(timezone.utc) - datetime.fromisoformat(pushed.replace('Z', '+00:00'))).days > 180:
        return
    old = [s for s in samples if (date.today() - date.fromisoformat(s[0])).days >= 3]
    if old:
        base = old[-1]
        days = max((date.today() - date.fromisoformat(base[0])).days, 1)
        tool['trend'] = round((stars - base[1]) / days * 7)
        tool['trend_measured'] = True
        return
    created = tool.get('created_at')
    if created:
        age = max((datetime.now(timezone.utc) - datetime.fromisoformat(created.replace('Z', '+00:00'))).days, 30)
        if age <= 730:  # an old giant's lifetime average says nothing about momentum
            tool['trend'] = round(stars / age * 7)
            tool['trend_measured'] = False


def write_changelog(new_tools, categories=()):
    log = read_json(CHANGELOG_FILE, [])
    if new_tools:
        top = sorted(new_tools, key=lambda t: -(t.get('stars') or 0))[:30]
        log = [e for e in log if e['date'] != TODAY]
        log.insert(0, {'date': TODAY, 'count': len(new_tools),
                       'added': [{k: t.get(k) for k in ('name', 'url', 'category', 'description', 'stars')} for t in top]})
    log = log[:52]
    write_json(CHANGELOG_FILE, log, indent=1)
    write_feeds(log, categories)


def hub_link(url):
    key = url.replace('https://github.com/', '')
    return f'{SITE_URL}?tool={quote(key, safe="/")}'


def build_feed(title, entries, category=None):
    items = []
    for entry in entries[:10]:
        pub = datetime.fromisoformat(entry['date']).strftime('%a, %d %b %Y 00:00:00 +0000')
        for t in entry['added']:
            if category and t['category'] != category:
                continue
            items.append(
                f"<item><title>{escape(t['name'])}</title><link>{escape(hub_link(t['url']))}</link>"
                f"<guid isPermaLink=\"false\">{escape(t['url'])}</guid>"
                f"<category>{escape(t['category'] or '')}</category><pubDate>{pub}</pubDate>"
                f"<description>{escape(t.get('description') or '')}</description></item>")
    return ('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>'
            f'<title>{escape(title)}</title><link>{SITE_URL}</link>'
            '<description>Newly added DevOps tools</description>' + ''.join(items) + '</channel></rss>\n')


def write_feeds(log, categories=()):
    """feed.xml with everything, plus feed-<category>.xml so people can follow one topic."""
    out_dir = os.path.dirname(FEED_FILE)
    with open(FEED_FILE, 'w', encoding='utf-8') as f:
        f.write(build_feed('NETWORKINI-HUB: new tools', log))
    cats = sorted(set(categories) | {t['category'] for e in log for t in e['added'] if t.get('category')})
    for cat in cats:
        with open(os.path.join(out_dir, f'feed-{cat}.xml'), 'w', encoding='utf-8') as f:
            f.write(build_feed(f'NETWORKINI-HUB: new {cat} tools', log, cat))


GENERIC_NAMES = {'repo', 'link', 'here', 'website', 'homepage', 'source', 'github', 'code'}
NAME_PREFIX_RE = re.compile(r'^(github(\.com)?|gitlab(\.com)?)\s*[/:]\s*', re.I)


def polish(tool):
    """Tidy scraped names and fill empty descriptions from the repository."""
    m = GITHUB_REPO_RE.match(tool['url'])
    name = tool['name'].strip()
    if NAME_PREFIX_RE.match(name):
        # "github.com/owner: Nice Title - blurb" -> "Nice Title"
        name = NAME_PREFIX_RE.sub('', name)
        if ': ' in name:
            name = name.split(': ', 1)[1]
        name = re.sub(r'\s+[-–]\s+.*$', '', name)
    name = re.sub(r':[a-z0-9_+-]+:|[\U0001F300-\U0001FAFF\u2600-\u27BF]', '', name).strip(' :-')
    if m and (not name or '/' in name or name.lower() in GENERIC_NAMES):
        name = m.group(2).removesuffix('.git')
    tool['name'] = name
    if not tool.get('description') and tool.get('github_description'):
        tool['description'] = clean_text(tool['github_description'])
    return tool


def main():
    if not GITHUB_TOKEN:
        print('WARNING: GITHUB_TOKEN not set; GitHub API limit is 60 requests/hour.')
    previous = load_previous()
    scraped, ok_sources = {}, 0

    for category, urls in SOURCES.items():
        for src in urls:
            print(f'[{category}] {src}')
            md = fetch_markdown(src)
            if md is None:
                continue
            ok_sources += 1
            parsed = parse_markdown(md, category)
            print(f'  {len(parsed)} tools')
            for t in parsed:
                scraped.setdefault(dedupe_key(t['url']), t)

    if ok_sources == 0 or not scraped:
        print('No source could be read; keeping existing data.')
        return 1

    tools = list(scraped.values())
    # Seed with cached metadata so rate limiting never wipes known values.
    for t in tools:
        old = previous.get(dedupe_key(t['url']), {})
        for key in ENRICHED_KEYS + ('docker_pulls', 'docker_stars', 'docker_url', 'is_docker'):
            if key in old:
                t[key] = old[key]

    new_tools = []
    for t in tools:
        if previous and not BASELINE and dedupe_key(t['url']) not in previous:
            t['first_seen'] = TODAY
            new_tools.append(t)

    # Refresh never-checked / stalest tools first; the rest keep cached metadata.
    tools.sort(key=lambda t: t.get('checked_at') or '')
    start = time.time()
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        tools = list(pool.map(enrich, tools))
    print(f'Enriched {len(tools)} tools in {time.time() - start:.0f}s '
          f'({repo_calls} repo + {release_calls} release lookups)')

    tools = [polish(t) for t in tools]
    history = update_history(tools)
    for t in tools:
        add_trend(t, history.get(t['url'], []))

    tools.sort(key=lambda t: (-(t.get('stars') or 0), t['name'].lower()))
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    write_json(OUTPUT_FILE, tools, indent=2)
    write_json(HISTORY_FILE, history)
    write_changelog(new_tools, {t['category'] for t in tools})
    write_json(META_FILE, {'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
                           'total': len(tools), 'new_this_run': len(new_tools),
                           'rate_limited': rate_limited}, indent=2)
    print(f'Saved {len(tools)} tools ({len(new_tools)} new) to {OUTPUT_FILE}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
