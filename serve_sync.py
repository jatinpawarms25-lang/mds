#!/usr/bin/env python3
# ==============================================================================
# NEET-MDS Top-10 Planner — Local Server & Sync Relay
# Built with Python standard library only (No external dependencies required)
# Supports: Static file serving, /api/ip, /api/sync, and /api/update-proxy
# Strict ASCII Quotes Only
# ==============================================================================

import http.server
import socketserver
import socket
import os
import sys
import json
import urllib.request
import urllib.parse
import re
from datetime import datetime

PORT = 8765

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def fetch_live_notices():
    sources = [
        {
            'id': 'nbems',
            'name': 'NBEMS Official (NEET-MDS)',
            'url': 'https://natboard.edu.in/viewnbeexam?exam=neetmds',
            'keywords': ['neet-mds', 'mds', 'bulletin', 'application', 'eligibility', 'admit']
        },
        {
            'id': 'mcc',
            'name': 'MCC MDS Counselling',
            'url': 'https://mcc.nic.in/mds-counselling/',
            'keywords': ['mds', 'counselling', 'allotment', 'seat matrix', 'stray', 'round']
        },
        {
            'id': 'dci',
            'name': 'Dental Council of India (DCI / NDC)',
            'url': 'https://dciindia.gov.in/',
            'keywords': ['mds', 'internship', 'regulations', 'notification']
        }
    ]

    results = {}
    now_iso = datetime.utcnow().isoformat() + 'Z'

    for src in sources:
        try:
            req = urllib.request.Request(
                src['url'],
                headers={
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                status_code = resp.getcode()
                html = resp.read(250000).decode('utf-8', errors='ignore')

                if 'cf-browser-verification' in html or 'turnstile' in html or 'Cloudflare' in html:
                    results[src['id']] = {
                        'name': src['name'],
                        'url': src['url'],
                        'status': 'blocked',
                        'statusText': 'Manual check needed',
                        'details': 'Cloudflare bot challenge active on official portal.',
                        'notices': []
                    }
                else:
                    links = re.findall(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>([\s\S]*?)</a>', html, re.I)
                    extracted = []
                    for href, text in links:
                        clean_text = re.sub(r'<[^>]+>', ' ', text).strip()
                        clean_text = re.sub(r'\s+', ' ', clean_text)
                        if 10 < len(clean_text) < 200:
                            lower = clean_text.lower()
                            if any(k in lower for k in src['keywords']):
                                full_url = urllib.parse.urljoin(src['url'], href)
                                if not any(e['url'] == full_url for e in extracted):
                                    extracted.append({
                                        'title': clean_text,
                                        'url': full_url,
                                        'date': datetime.utcnow().strftime('%Y-%m-%d')
                                    })
                                if len(extracted) >= 6:
                                    break
                    results[src['id']] = {
                        'name': src['name'],
                        'url': src['url'],
                        'status': 'ok',
                        'statusText': 'Notices Parsed' if extracted else 'Portal Checked (No new notice)',
                        'notices': extracted
                    }
        except Exception as e:
            results[src['id']] = {
                'name': src['name'],
                'url': src['url'],
                'status': 'blocked',
                'statusText': 'Manual check needed',
                'details': str(e),
                'notices': []
            }

    return {
        'status': 'completed',
        'lastChecked': now_iso,
        'packVersion': '2026-11-15.1',
        'sources': results
    }

class SyncHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/sync':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                with open('sync_state.json', 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status":"ok","message":"Synced to Mac successfully"}')
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
            return
        super().do_POST()

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        if self.path in ['/download-report', '/download-pdf', '/api/download-report', '/report.pdf']:
            pdf_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'MDS_OS_AI_Handover_Master_Report.pdf')
            if os.path.exists(pdf_path):
                self.send_response(200)
                self.send_header('Content-Type', 'application/pdf')
                self.send_header('Content-Disposition', 'attachment; filename="MDS_OS_AI_Handover_Master_Report.pdf"')
                self.send_header('Content-Length', str(os.path.getsize(pdf_path)))
                self.end_headers()
                with open(pdf_path, 'rb') as f_pdf:
                    self.wfile.write(f_pdf.read())
                return
            else:
                self.send_error(404, 'PDF file not found')
                return

        if self.path == '/api/ip':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ip': get_local_ip(), 'port': PORT}).encode('utf-8'))
            return
        if self.path == '/api/update-proxy':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            proxy_res = fetch_live_notices()
            self.wfile.write(json.dumps(proxy_res).encode('utf-8'))
            return
        if self.path == '/api/sync':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            if os.path.exists('sync_state.json'):
                with open('sync_state.json', 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.wfile.write(b'{}')
            return
        super().do_GET()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    local_ip = get_local_ip()
    url = f"http://{local_ip}:{PORT}"
    
    print("=" * 60)
    print("  MDS Desktop OS — AIR 1-10 Universal Workstation")
    print("=" * 60)
    print(f"  Mac / Desktop URL : http://localhost:{PORT}")
    print(f"  Android Phone URL : {url}")
    print("=" * 60)

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), SyncHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
