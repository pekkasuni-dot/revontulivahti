# Tilapäinen: GitHub Pagesin kaltainen palvelin (gzip + max-age 600) mittausta varten.
import gzip, io, os, sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
TEXT = ('.html', '.js', '.css', '.json', '.txt', '.webmanifest', '.svg', '/')
class H(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header('Cache-Control', 'max-age=600')
        super().end_headers()
    def do_GET(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path): path = os.path.join(path, 'index.html')
        if 'gzip' in self.headers.get('Accept-Encoding', '') and path.endswith(TEXT) and os.path.isfile(path):
            data = gzip.compress(open(path, 'rb').read(), 6)
            self.send_response(200)
            self.send_header('Content-Type', self.guess_type(path))
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers(); self.wfile.write(data); return
        return super().do_GET()
ThreadingHTTPServer(('', 8080), H).serve_forever()
