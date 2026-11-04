"""Pulls last week's anonymous usage (tool opens / saves) from GoatCounter into
public/data/interactions.json so the hub can rank tools by community interest.

Optional: needs repository variable GOATCOUNTER_CODE and secret GOATCOUNTER_TOKEN
(a GoatCounter API token with "statistics" access). No personal data is involved;
GoatCounter only stores aggregate counts per path. Failures never break the pipeline.
"""
import json
import os
import sys
from datetime import datetime, timedelta, timezone

import requests

OUT = 'public/data/interactions.json'
WEIGHTS = {'tool/': 1, 'save/': 3, 'compare/': 1}


def main():
    code, token = os.getenv('GOATCOUNTER_CODE'), os.getenv('GOATCOUNTER_TOKEN')
    if not code or not token:
        print('GoatCounter not configured; skipping interactions.')
        return 0
    start = (datetime.now(timezone.utc) - timedelta(days=7)).strftime('%Y-%m-%dT00:00:00Z')
    try:
        r = requests.get(f'https://{code}.goatcounter.com/api/v0/stats/hits',
                         headers={'Authorization': f'Bearer {token}'},
                         params={'start': start, 'limit': 100}, timeout=30)
        r.raise_for_status()
        hits = r.json().get('hits', [])
    except (requests.RequestException, ValueError) as e:
        print(f'GoatCounter request failed ({e}); keeping previous interactions.')
        return 0

    scores = {}
    for h in hits:
        path = (h.get('path') or '').lstrip('/')
        for prefix, weight in WEIGHTS.items():
            if path.startswith(prefix):
                key = path[len(prefix):]
                scores[key] = scores.get(key, 0) + weight * int(h.get('count', 0))
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump({'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'scores': scores}, f)
        f.write('\n')
    print(f'Saved interaction scores for {len(scores)} tools.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
