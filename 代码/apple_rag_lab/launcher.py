"""Open the local question page, reusing a running service when possible."""
import argparse
import json
import threading
import webbrowser
from urllib.error import URLError
from urllib.request import urlopen

import server


def is_lab_running(port):
    try:
        with urlopen(f'http://127.0.0.1:{port}/api/state', timeout=2) as response:
            data = json.load(response)
        return isinstance(data, dict) and 'corpus_hash' in data and isinstance(data.get('config', {}).get('profiles'), list)
    except (OSError, URLError, ValueError):
        return False


def main():
    parser = argparse.ArgumentParser(description='Open the Apple QA program')
    parser.add_argument('--port', type=int, default=8766)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error('Port must be between 1 and 65535.')
    url = f'http://127.0.0.1:{args.port}/#qa'
    if is_lab_running(args.port):
        print(f'Using the running service: {url}', flush=True)
        if not args.no_browser:
            webbrowser.open(url)
        return
    server.initialize()
    print('Loading embedding model and index (about 15 s) ...', flush=True)
    try:
        seconds = server.warm_up()
        print('Embedding warm-up: ' + (f'{seconds:.1f}s' if seconds is not None else 'no dense index'), flush=True)
    except Exception as e:  # remote embedding may need a key that is supplied later
        print(f'Embedding warm-up skipped: {e}', flush=True)
    try:
        http = server.ThreadingHTTPServer(('127.0.0.1', args.port), server.Handler)
    except OSError:
        print(f'Cannot bind port {args.port}. Try: python launcher.py --port 8767', flush=True)
        raise SystemExit(1)
    print(f'Apple QA: {url}\nKeep this window open. Press Ctrl+C to stop.', flush=True)
    if not args.no_browser:
        opener = threading.Timer(0.4, webbrowser.open, args=(url,))
        opener.daemon = True
        opener.start()
    try:
        http.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.', flush=True)
    finally:
        http.server_close()


if __name__ == '__main__':
    main()
