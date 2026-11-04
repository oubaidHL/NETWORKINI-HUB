"""Builds public/data/tools.json from curated "Awesome" lists.

Design notes
- Previous output is used as a cache: if GitHub rate-limits us or a source is
  down, existing tools keep their last known metadata instead of losing it.
- GitHub lookups run in a small thread pool and stop cleanly on rate limit.
- A second file, meta.json, records when/what was generated (shown in the UI).
"""
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
OUTPUT_FILE = 'public/data/tools.json'
META_FILE = 'public/data/meta.json'
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
    'devops': ['https://raw.githubusercontent.com/wmariuss/awesome-devops/master/README.md'],
    'cicd': ['https://raw.githubusercontent.com/cicdops/awesome-ciandcd/master/README.md'],
    'monitoring': ['https://raw.githubusercontent.com/crazy-canux/awesome-monitoring/master/README.md'],
}

TOOL_RE = re.compile(r'^\s*[-*]\s*\[(.*?)\]\((.*?)\)\s*[-–:]?\s*(.*)')
HEADER_RE = re.compile(r'^#{2,4}\s+(.*)')
GITHUB_REPO_RE = re.compile(r'^https?://(?:www\.)?github\.com/([^/\s]+)/([^/\s#?]+)', re.I)
ENRICHED_KEYS = ('stars', 'language', 'topics', 'last_updated', 'license',
                 'github_description', 'install_cmd', 'archived', 'forks')

rate_limited = False


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
    if rate_limited or not m:
        return None
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
        'license': (d.get('license') or {}).get('name'),
        'github_description': d.get('description'),
        'archived': bool(d.get('archived')),
        'install_cmd': install,
    }


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
        if meta:
            tool.update(meta)
            if not tool['description'] and meta.get('github_description'):
                tool['description'] = meta['github_description']
    return tool


def load_previous():
    try:
        with open(OUTPUT_FILE, encoding='utf-8') as f:
            return {dedupe_key(t['url']): t for t in json.load(f)}
    except (OSError, ValueError):
        return {}


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

    start = time.time()
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        tools = list(pool.map(enrich, tools))
    print(f'Enriched {len(tools)} tools in {time.time() - start:.0f}s')

    tools.sort(key=lambda t: (-(t.get('stars') or 0), t['name'].lower()))
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(tools, f, indent=2, ensure_ascii=False)
        f.write('\n')
    with open(META_FILE, 'w', encoding='utf-8') as f:
        json.dump({'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
                   'total': len(tools), 'rate_limited': rate_limited}, f, indent=2)
        f.write('\n')
    print(f'Saved {len(tools)} tools to {OUTPUT_FILE}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
