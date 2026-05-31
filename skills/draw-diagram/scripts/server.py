import http.server
import json
import sys
import os
import glob
import shutil
import threading
import time
from urllib.parse import urlparse, parse_qs

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Translate web assets to the configured resources directory, and diagrams to the workspace/file path
        parsed_path = urlparse(path)
        filename = os.path.basename(parsed_path.path)
        
        # 1. Translate JSON requests to the configured workspace directory/file
        if filename.endswith('.json'):
            if self.server.active_file:
                if filename == os.path.basename(self.server.active_file):
                    return self.server.active_file
            return os.path.join(self.server.workspace_dir, filename)
            
        # 2. Serve static assets directly from the web_dir folder structure
        # Strip leading slash and resolve it in web_dir
        rel_path = parsed_path.path.lstrip('/')
        if not rel_path or rel_path == 'index.html':
            return os.path.join(self.server.web_dir, 'index.html')
            
        target_web_path = os.path.join(self.server.web_dir, rel_path)
        # Prevent directory traversal attacks by checking path resolution
        if os.path.abspath(target_web_path).startswith(os.path.abspath(self.server.web_dir)):
            return target_web_path
            
        # 3. Fall back to standard path translation
        return super().translate_path(path)

    def do_GET(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/list':
            try:
                examples_dir = os.path.join(os.path.dirname(self.server.web_dir), 'examples')
                
                # Seeding and listing logic
                if self.server.active_file:
                    base = os.path.basename(self.server.active_file)
                    # If the file does not exist, check if we can seed it from examples
                    if not os.path.exists(self.server.active_file):
                        # Ensure folder of active_file exists
                        file_dir = os.path.dirname(self.server.active_file)
                        if file_dir and not os.path.exists(file_dir):
                            os.makedirs(file_dir, exist_ok=True)
                        # Look for matching preset template
                        preset_src = os.path.join(examples_dir, base)
                        if os.path.exists(preset_src):
                            shutil.copy(preset_src, self.server.active_file)
                        else:
                            # Or seed default diagram template
                            default_src = os.path.join(examples_dir, 'diagram.json')
                            if os.path.exists(default_src):
                                shutil.copy(default_src, self.server.active_file)
                    
                    json_files = [base]
                else:
                    # Normal directory listing & seeding
                    if not os.path.exists(self.server.workspace_dir):
                        os.makedirs(self.server.workspace_dir, exist_ok=True)
                        
                    # Copy example json files if they don't exist in workspace
                    if os.path.exists(examples_dir):
                        for f in glob.glob(os.path.join(examples_dir, '*.json')):
                            base = os.path.basename(f)
                            target = os.path.join(self.server.workspace_dir, base)
                            if not os.path.exists(target):
                                try:
                                    shutil.copy(f, target)
                                except Exception as copy_err:
                                    sys.stderr.write(f"Warning: failed to seed {base}: {str(copy_err)}\n")
                    
                    # Find all .json files in the configured workspace directory
                    json_files = [os.path.basename(f) for f in glob.glob(os.path.join(self.server.workspace_dir, '*.json'))]
                    json_files.sort()
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(json_files).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))
        else:
            super().do_GET()

    def do_POST(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/save':
            query = parse_qs(parsed_path.query)
            filename = query.get('file', ['diagram.json'])[0]
            filename = os.path.basename(filename)
            
            # Determine save target path
            if self.server.active_file and filename == os.path.basename(self.server.active_file):
                target_path = self.server.active_file
            else:
                target_path = os.path.join(self.server.workspace_dir, filename)

            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                
                # Ensure parent directory exists
                target_dir = os.path.dirname(target_path)
                if target_dir and not os.path.exists(target_dir):
                    os.makedirs(target_dir, exist_ok=True)
                    
                with open(target_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(f"Error saving file {filename}: {str(e)}".encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        sys.stderr.write("%s - - [%s] %s\n" %
                         (self.address_string(),
                          self.log_date_time_string(),
                          format%args))

def do_render(args):
    """Headless render mode: start a temporary server and screenshot the diagram with Playwright."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Error: playwright is required for render mode.")
        print("Install it with: pip install playwright && playwright install chromium")
        sys.exit(1)

    # Determine paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    skill_dir = os.path.dirname(script_dir)
    repo_root = os.path.dirname(os.path.dirname(skill_dir))
    
    dist_dir = os.path.join(repo_root, 'frontend', 'dist')
    legacy_web_dir = os.path.join(skill_dir, 'resources')
    default_web_dir = dist_dir if os.path.exists(dist_dir) else legacy_web_dir

    web_dir = os.path.abspath(args.web_dir) if args.web_dir else default_web_dir
    workspace_dir = os.path.abspath(args.dir)

    if not os.path.exists(web_dir):
        print(f"Error: web resource directory not found at: {web_dir}")
        sys.exit(1)

    # Resolve the diagram file
    render_file = os.path.abspath(args.render)
    if not os.path.exists(render_file):
        print(f"Error: render file not found: {render_file}")
        sys.exit(1)

    output_path = os.path.abspath(args.output) if args.output else os.path.join(os.getcwd(), 'output.png')

    # Start server on a random port
    server_address = ('127.0.0.1', 0)
    httpd = http.server.HTTPServer(server_address, CustomHandler)
    port = httpd.server_address[1]
    
    httpd.workspace_dir = workspace_dir
    httpd.active_file = render_file
    httpd.web_dir = web_dir
    httpd.port = port

    # Start server in a background thread
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    time.sleep(0.3)  # Brief wait for server to be ready

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1280, "height": 900})
            
            # Navigate to the app
            page.goto(f"http://127.0.0.1:{port}/", wait_until="domcontentloaded")
            
            # Wait for the file select dropdown to be rendered by React
            page.wait_for_selector("select#file-select", timeout=15000)
            
            # Get the basename of the render file
            target_filename = os.path.basename(render_file)
            
            # Select the file in the dropdown
            page.locator("select#file-select").select_option(target_filename)
            
            # Trigger change event so React picks it up
            page.evaluate("""() => {
                const sel = document.querySelector('select#file-select');
                if (sel) sel.dispatchEvent(new Event('change', { bubbles: true }));
            }""")
            
            # Wait for the SVG to render (id="svg-render")
            try:
                page.wait_for_selector("#svg-render", timeout=15000)
            except Exception:
                # If no SVG appears, still try to screenshot whatever is on the page
                print("Warning: SVG render element not detected, taking screenshot of page state")
            
            # Small extra wait for rendering to finish
            page.wait_for_timeout(1000)
            
            # Use the Export PNG button for full-resolution canvas export
            # The button renders at 2x the diagram dimensions, not viewport-constrained
            try:
                # Click export PNG button and intercept the download
                with page.expect_download() as download_info:
                    page.click("#btn-export-png")
                
                download = download_info.value
                download.save_as(output_path)
                print(f"Headless render complete: {output_path} ({download.suggested_filename})")
            except Exception as e:
                print(f"Export PNG failed ({e}), falling back to page screenshot")
                page.screenshot(path=output_path, full_page=True)
                print(f"Headless render complete (screenshot fallback): {output_path}")
            
            browser.close()
    finally:
        # Shutdown the server
        httpd.shutdown()

    sys.exit(0)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description="FlowCraft Live Preview Server")
    parser.add_argument('--dir', default='.', help="Directory containing workspace diagrams (defaults to '.')")
    parser.add_argument('--file', default=None, help="Directly specify a single diagram JSON file to render")
    parser.add_argument('--web-dir', default=None, help="Directory containing web assets (index.html, app.js, styles.css)")
    parser.add_argument('--port', type=int, default=8000, help="Port to run the server on (defaults to 8000)")
    parser.add_argument('--render', default=None, help="Path to a diagram JSON file for headless rendering via Playwright")
    parser.add_argument('--output', default=None, help="Output PNG path for headless render mode (default: output.png)")
    args = parser.parse_args()

    # If --render is passed, enter headless render mode
    if args.render:
        do_render(args)
        sys.exit(0)

    # Determine default paths relative to script location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    skill_dir = os.path.dirname(script_dir)
    repo_root = os.path.dirname(os.path.dirname(skill_dir))
    
    dist_dir = os.path.join(repo_root, 'frontend', 'dist')
    legacy_web_dir = os.path.join(skill_dir, 'resources')
    
    default_web_dir = dist_dir if os.path.exists(dist_dir) else legacy_web_dir

    web_dir = os.path.abspath(args.web_dir) if args.web_dir else default_web_dir
    workspace_dir = os.path.abspath(args.dir)
    active_file = os.path.abspath(args.file) if args.file else None

    # Verify web dir exists
    if not os.path.exists(web_dir):
        print(f"Error: web resource directory not found at: {web_dir}")
        print("Please check the path or use --web-dir to override it.")
        sys.exit(1)

    server_address = ('', args.port)
    httpd = http.server.HTTPServer(server_address, CustomHandler)
    
    # Bind settings to server instance
    httpd.workspace_dir = workspace_dir
    httpd.active_file = active_file
    httpd.web_dir = web_dir
    httpd.port = args.port

    print(f"FlowCraft Server running on port {args.port}...")
    print(f" - Workspace directory: {workspace_dir}")
    if active_file:
        print(f" - Active file: {active_file}")
    print(f" - Web UI assets: {web_dir}")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        sys.exit(0)
