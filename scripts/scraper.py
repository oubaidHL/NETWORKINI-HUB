import os
import re
import json
import time
import requests
from bs4 import BeautifulSoup

# Configuration
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
OUTPUT_FILE = 'public/data/tools.json'

# Target Awesome Lists - DevOps Focus Only
# key: category -> list of URLs
SOURCES = {
    'docker': [
        'https://raw.githubusercontent.com/veggiemonk/awesome-docker/master/README.md'
    ],
    'kubernetes': [
        'https://raw.githubusercontent.com/ramitsurana/awesome-kubernetes/master/README.md',
        'https://raw.githubusercontent.com/tomhuang12/awesome-k8s-resources/master/README.md'
    ],
    'ansible': [
        'https://raw.githubusercontent.com/ansible-community/awesome-ansible/main/README.md'
    ],
    'terraform': [
        'https://raw.githubusercontent.com/shuaibiyy/awesome-terraform/master/README.md'
    ],
    'devops': [
        'https://raw.githubusercontent.com/wmariuss/awesome-devops/master/README.md'
    ],
    'cicd': [
        'https://raw.githubusercontent.com/cicdops/awesome-ciandcd/master/README.md'
    ],
    'monitoring': [
        'https://raw.githubusercontent.com/crazy-canux/awesome-monitoring/master/README.md'
    ]
}

HEADERS = {
    'Authorization': f'token {GITHUB_TOKEN}' if GITHUB_TOKEN else None,
    'Accept': 'application/vnd.github.v3+json'
}

# Global flag to track GitHub rate limit status
GITHUB_RATE_LIMIT_HIT = False

def fetch_markdown(url):
    """Fetches raw markdown content from a URL."""
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def parse_markdown_sections(markdown, category):
    """
    Parses markdown to extract links [Name](URL) - Description
    AND capture the current header/section as subcategory.
    """
    tools = []
    
    # Regex for tool link: [Name](URL) - Description
    # Improved regex to handle variations
    tool_pattern = re.compile(r'^\s*[-*]\s*\[(.*?)\]\((.*?)\)\s*[-–:]\s*(.*)')
    
    # Regex for header: ## Section Name
    header_pattern = re.compile(r'^#{2,4}\s+(.*)')
    
    current_subcategory = "General"
    
    lines = markdown.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check for header
        header_match = header_pattern.match(line)
        if header_match:
            current_subcategory = header_match.group(1).strip()
            continue
            
        # Check for tool
        tool_match = tool_pattern.match(line)
        if tool_match:
            name, url, description = tool_match.groups()
            
            # Filter for valid/useful links
            if 'github.com' in url or 'hub.docker.com' in url or 'gitlab.com' in url:
                tools.append({
                    'name': name.strip(),
                    'url': url.strip(),
                    'description': description.strip(),
                    'category': category,
                    'subcategory': current_subcategory
                })
    return tools

def get_docker_hub_stats(url):
    """Enriches with Docker Hub stats if applicable."""
    if 'hub.docker.com' not in url:
        return {}
        
    try:
        # url format: https://hub.docker.com/r/prom/prometheus or /_/alpine
        parts = url.replace('https://hub.docker.com/', '').strip('/').split('/')
        
        # Handling /r/ namespace or official /_/
        if 'r/' in parts:
             # promoteus/prometheus
             idx = parts.index('r')
             if len(parts) > idx + 2:
                 namespace = parts[idx+1]
                 repo = parts[idx+2]
             else:
                 return {}
        elif '_/' in parts:
             # official library
             idx = parts.index('_')
             if len(parts) > idx + 1:
                 namespace = 'library'
                 repo = parts[idx+1]
             else: 
                 return {}
        elif len(parts) == 2:
             # user/repo style directly?
             namespace = parts[0]
             repo = parts[1]
        else:
             return {}

        api_url = f"https://hub.docker.com/v2/repositories/{namespace}/{repo}/"
        res = requests.get(api_url)
        if res.status_code == 200:
            data = res.json()
            return {
                'docker_pulls': data.get('pull_count', 0),
                'docker_stars': data.get('star_count', 0),
                'is_docker': True
            }
    except Exception as e:
        print(f"Error fetching Docker Hub stats: {e}")
    
    return {'is_docker': True} # At least mark it as docker related

def get_github_metadata(repo_url):
    """Fetches metadata from GitHub API."""
    global GITHUB_RATE_LIMIT_HIT
    
    if GITHUB_RATE_LIMIT_HIT:
        return None

    if 'github.com' not in repo_url:
        return None

    try:
        parts = repo_url.rstrip('/').split('/')
        if len(parts) < 2:
            return None
        owner, repo = parts[-2], parts[-1]
        
        api_url = f"https://api.github.com/repos/{owner}/{repo}"
        
        response = requests.get(api_url, headers=HEADERS)
        
        if response.status_code == 403:
            remaining = int(response.headers.get('X-RateLimit-Remaining', 0))
            if remaining == 0:
                print("GitHub Rate limit hit! Switching to offline extraction.")
                GITHUB_RATE_LIMIT_HIT = True
                return None

        if response.status_code == 200:
            data = response.json()
            
            # Simple install command detection based on language/content
            install_cmd = None
            if data.get('language') == 'Python':
                install_cmd = f"pip install {repo}"
            elif data.get('language') == 'Go':
                install_cmd = f"go get github.com/{owner}/{repo}"
            
            # Check for Dockerfile
            has_dockerfile = False
            # naive check logic, for robustness we'd need file listing API call
            # minimizing API calls for now.
            
            return {
                'stars': data.get('stargazers_count', 0),
                'language': data.get('language'),
                'topics': data.get('topics', []),
                'last_updated': data.get('pushed_at'),
                'license': data.get('license', {}).get('name') if data.get('license') else None,
                'github_description': data.get('description'),
                'install_cmd': install_cmd
            }
    except Exception as e:
        print(f"Error fetching GitHub metadata for {repo_url}: {e}")
    
    return None

def main():
    all_tools = []
    
    if not GITHUB_TOKEN:
        print("WARNING: GITHUB_TOKEN not found. Rate limits will be strict (60 req/hr).")

    print(f"Starting Scraper v2... Target output: {OUTPUT_FILE}")

    for category, urls in SOURCES.items():
        print(f"== Processing Category: {category} ==")
        for url in urls:
            print(f"Fetching list: {url}")
            md = fetch_markdown(url)
            if md:
                parsed = parse_markdown_sections(md, category)
                print(f"Found {len(parsed)} tools in {url}...")
                
                # Enrich logic
                for i, tool in enumerate(parsed):
                    # Progress log every 50 items
                    if i % 50 == 0:
                        print(f"Processed {i}/{len(parsed)} items...")

                    # 1. Docker Hub Stats (No Rate Limit usually)
                    if 'hub.docker.com' in tool['url']:
                        d_stats = get_docker_hub_stats(tool['url'])
                        tool.update(d_stats)
                    
                    # 2. GitHub Stats (Rate Limited)
                    if 'github.com' in tool['url'] and not GITHUB_RATE_LIMIT_HIT:
                        gh_stats = get_github_metadata(tool['url'])
                        if gh_stats:
                            tool.update(gh_stats)
                            # Prefer GitHub desc if available
                            if not tool['description'] and tool['github_description']:
                                tool['description'] = tool['github_description']
                        
                        time.sleep(0.2) # Throttling

                    all_tools.append(tool)

    # Dedup by URL
    unique_tools = {t['url']: t for t in all_tools}.values()
    final_list = list(unique_tools)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_list, f, indent=2)
    
    print(f"Scraping complete. Saved {len(final_list)} tools to {OUTPUT_FILE}.")

if __name__ == "__main__":
    main()
