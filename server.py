#!/usr/bin/env python3
"""
简单的 HTTP 服务器，支持 TypeScript 文件编译
使用 esm.sh 来编译 TypeScript 文件
"""
import http.server
import socketserver
import os
import urllib.parse
from pathlib import Path

PORT = 8000

class TypeScriptHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # 解析路径
        parsed_path = urllib.parse.urlparse(self.path)
        file_path = parsed_path.path.lstrip('/')
        
        # 如果是 TypeScript 文件，通过 esm.sh 编译
        if file_path.endswith('.tsx') or file_path.endswith('.ts'):
            if os.path.exists(file_path):
                # 读取文件内容
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # 通过 esm.sh 编译
                # 使用 esm.sh 的编译 API
                import base64
                import json
                
                # 将内容编码为 base64
                encoded = base64.b64encode(content.encode('utf-8')).decode('utf-8')
                
                # 构建 esm.sh URL
                loader = 'tsx' if file_path.endswith('.tsx') else 'ts'
                esm_url = f"https://esm.sh/?{loader}={encoded}"
                
                # 重定向到 esm.sh
                self.send_response(302)
                self.send_header('Location', esm_url)
                self.end_headers()
                return
        
        # 其他文件正常处理
        super().do_GET()
    
    def end_headers(self):
        # 设置正确的 MIME 类型
        if self.path.endswith('.tsx') or self.path.endswith('.ts'):
            self.send_header('Content-Type', 'application/javascript; charset=utf-8')
        elif self.path.endswith('.jsx'):
            self.send_header('Content-Type', 'application/javascript; charset=utf-8')
        super().end_headers()
    
    def log_message(self, format, *args):
        # 简化日志输出
        pass

if __name__ == "__main__":
    os.chdir(Path(__file__).parent)
    
    with socketserver.TCPServer(("", PORT), TypeScriptHandler) as httpd:
        print(f"🚀 服务器运行在 http://localhost:{PORT}")
        print(f"📂 访问 http://localhost:{PORT}/index.html")
        print("按 Ctrl+C 停止服务器")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n服务器已停止")
