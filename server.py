"""Local dev server with review_sync.json read/write + auto git pull from GitHub."""
import http.server
import json
import os
import shutil
import subprocess
import sys
import urllib.parse

HOST = "127.0.0.1"
PORT = 8080
ROOT = os.path.dirname(os.path.abspath(__file__))
SYNC_FILE = os.path.join(ROOT, "review_sync.json")
WWW_REPO = r"D:\AAA考研\英语复习助手\www"
WWW_SYNC = os.path.join(WWW_REPO, "daily", "review_sync.json")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/api/save":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                with open(SYNC_FILE, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'{"ok":true,"saved":true}')
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(e)}).encode())
            return

        if parsed.path == "/api/git-pull":
            try:
                r = subprocess.run(
                    ["git", "-C", WWW_REPO, "pull", "origin", "main"],
                    capture_output=True, text=True, timeout=30
                )
                # Copy pulled file so local server serves the latest
                if os.path.exists(WWW_SYNC):
                    shutil.copy2(WWW_SYNC, SYNC_FILE)
                self.send_response(200)
                self.end_headers()
                msg = r.stdout.strip() or "Already up to date."
                self.wfile.write(json.dumps({"ok": True, "output": msg}).encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(e)}).encode())
            return

        if parsed.path == "/api/git-push":
            try:
                subprocess.run(
                    ["git", "-C", WWW_REPO, "add", WWW_SYNC],
                    capture_output=True, timeout=10
                )
                subprocess.run(
                    ["git", "-C", WWW_REPO, "commit", "-m", "复习数据同步"],
                    capture_output=True, timeout=10
                )
                r = subprocess.run(
                    ["git", "-C", WWW_REPO, "push", "origin", "main"],
                    capture_output=True, text=True, timeout=30
                )
                self.send_response(200)
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True, "output": r.stdout.strip() or "pushed"}).encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(e)}).encode())
            return

        self.send_response(404)
        self.end_headers()
        self.wfile.write(b'{"error":"not found"}')


if __name__ == "__main__":
    print(f" 考研复习助手 · 本地服务器")
    print(f" http://{HOST}:{PORT}")
    print(f" 数据文件: {SYNC_FILE}")
    print(f" POST /api/save    — 写入复习数据")
    print(f" POST /api/git-pull — 从 GitHub 拉取最新")
    print(f" POST /api/git-push — 推送复习数据到 GitHub")
    print(f" Ctrl+C 停止")
    http.server.HTTPServer((HOST, PORT), Handler).serve_forever()
