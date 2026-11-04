"""Sends the newest Buttondown draft (the daily digest written by notify.py)."""
import os
import sys

import requests

API = 'https://api.buttondown.com/v1/emails'


def main():
    key = os.getenv('BUTTONDOWN_API_KEY')
    if not key:
        print('BUTTONDOWN_API_KEY is not set.')
        return 1
    headers = {'Authorization': f'Token {key}'}
    r = requests.get(API, headers=headers, params={'status': 'draft', 'ordering': '-creation_date'}, timeout=30)
    r.raise_for_status()
    drafts = r.json().get('results', [])
    if not drafts:
        print('No draft to send.')
        return 1
    draft = drafts[0]
    r = requests.patch(f"{API}/{draft['id']}", headers=headers, json={'status': 'about_to_send'}, timeout=30)
    r.raise_for_status()
    print(f"Sending: {draft['subject']}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
