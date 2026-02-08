"""
Basketball Highlights Server
Run this instead of `python -m http.server 8000`.
Serves static files AND handles POST /add-clip to add new clips to index.html.
"""

import http.server
import json
import os
import re

PORT = 8000
PASSWORD = "parker84"
INDEX_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
MARKER = "<!-- NEW CLIPS HERE -->"


def extract_video_id(url):
    """Extract the video ID from a YouTube Shorts URL."""
    patterns = [
        r"youtube\.com/shorts/([a-zA-Z0-9_-]+)",
        r"youtu\.be/([a-zA-Z0-9_-]+)",
        r"youtube\.com/watch\?v=([a-zA-Z0-9_-]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None



class ClipHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/add-clip":
            self.send_error(404, "Not found")
            return

        # Read request body
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self._json_response(400, {"error": "Invalid JSON"})
            return

        password = data.get("password", "")
        url = data.get("url", "")
        title = data.get("title", "")

        # Validate password
        if password != PASSWORD:
            self._json_response(403, {"error": "Wrong password"})
            return

        # Validate URL
        video_id = extract_video_id(url)
        if not video_id:
            self._json_response(400, {"error": "Invalid YouTube URL. Use a youtube.com/shorts/... link."})
            return

        # Validate title
        title = title.strip()
        if not title:
            self._json_response(400, {"error": "Title cannot be empty"})
            return

        # Read index.html
        try:
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                html = f.read()
        except FileNotFoundError:
            self._json_response(500, {"error": "index.html not found"})
            return

        if MARKER not in html:
            self._json_response(500, {"error": "Marker not found in index.html"})
            return

        # Build new clip block
        # Escape title for HTML
        safe_title = title.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
        new_clip = (
            f"\n            <!-- Clip: {safe_title} -->\n"
            f"            <div class=\"video-card\">\n"
            f"                <div class=\"video-wrapper\">\n"
            f"                    <iframe src=\"https://www.youtube.com/embed/{video_id}\" allowfullscreen></iframe>\n"
            f"                </div>\n"
            f"                <h3>{safe_title}</h3>\n"
            f"            </div>\n"
        )

        # Insert after marker
        html = html.replace(MARKER, MARKER + new_clip, 1)

        # Write back
        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            f.write(html)

        self._json_response(200, {"success": True, "videoId": video_id, "title": safe_title})

    def _json_response(self, status_code, data):
        response = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with http.server.HTTPServer(("", PORT), ClipHandler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        print(f"Open http://localhost:{PORT}/index.html")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down.")
