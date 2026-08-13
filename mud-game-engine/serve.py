#!/usr/bin/env python3
"""本地静态服务器，禁用缓存以确保每次都能获取最新资源。
用法: python3 serve.py [端口]   默认端口 8080
"""
import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 禁用缓存：浏览器每次都会重新向服务器获取最新文件
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


with socketserver.TCPServer(('', PORT), NoCacheHandler) as httpd:
    print(f'服务已启动（已禁用缓存）: http://localhost:{PORT}/mud-game-engine.html')
    httpd.serve_forever()
