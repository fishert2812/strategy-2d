# patch_site.py <экспорт> <папка> <sha>: wasm частями по 13 МБ, pck как .wasm, хук fetch с ?v=sha, касания Safari, значок и полный экран на iPhone.
import sys, os, json, shutil
raw, out, sha = sys.argv[1:4]
os.makedirs(out)
PART = 13_000_000
wasm = open(os.path.join(raw, "index.wasm"), "rb").read()
parts = []
for i in range(0, len(wasm), PART):
    n = "index.wasm.part%d.wasm" % (i // PART); parts.append(n)
    open(os.path.join(out, n), "wb").write(wasm[i:i + PART])
shutil.copy(os.path.join(raw, "index.pck"), os.path.join(out, "index.pck.wasm"))
for n in os.listdir(raw):
    if n not in ("index.wasm", "index.pck", "index.html"):
        shutil.copy(os.path.join(raw, n), os.path.join(out, n))
html = open(os.path.join(raw, "index.html"), encoding="utf-8").read()
head = '''<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
		<meta name="apple-mobile-web-app-capable" content="yes">
		<meta name="mobile-web-app-capable" content="yes">
		<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
		<meta name="apple-mobile-web-app-title" content="Война троп">
		<link rel="manifest" href="manifest.json">'''
old_vp = '<meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0">'
assert old_vp in html; html = html.replace(old_vp, head)
css_old = "body {\n\tcolor: white;"
assert css_old in html
html = html.replace(css_old, "html, body, #canvas {\n\ttouch-action: none;\n\t-webkit-user-select: none;\n\tuser-select: none;\n\t-webkit-touch-callout: none;\n\t-webkit-tap-highlight-color: transparent;\n}\n\n" + css_old, 1)
html = html.replace("<title>Strategy 2d</title>", "<title>Война троп</title>")
html = html.replace('"ensureCrossOriginIsolationHeaders":true', '"ensureCrossOriginIsolationHeaders":false')
hook = '''<script>
document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
document.addEventListener('dblclick', function (e) { e.preventDefault(); }, {passive: false});
(function () {
  var realFetch = window.fetch.bind(window);
  var V = '?v=%s';
  var PARTS = %s;
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input.url;
    var m = /(index\\.(?:wasm|pck))(\\?.*)?$/.exec(url);
    if (!m) return realFetch(input, init);
    var base = url.slice(0, m.index);
    var names = m[1] === 'index.wasm' ? PARTS : ['index.pck.wasm'];
    return Promise.all(names.map(function (n) {
      return realFetch(base + n + V, {cache: 'no-cache'}).then(function (r) {
        if (!r.ok) throw new Error(n + ' ' + r.status);
        return r.arrayBuffer();
      });
    })).then(function (bufs) {
      var len = bufs.reduce(function (s, b) { return s + b.byteLength; }, 0);
      var all = new Uint8Array(len), off = 0;
      bufs.forEach(function (b) { all.set(new Uint8Array(b), off); off += b.byteLength; });
      var type = m[1] === 'index.wasm' ? 'application/wasm' : 'application/octet-stream';
      return new Response(all, {status: 200, headers: {'Content-Type': type, 'Content-Length': String(len)}});
    });
  };
})();
</script>
''' % (sha, json.dumps(parts))
tag = '<script src="index.js"></script>'
assert tag in html
html = html.replace(tag, hook + '\t\t<script src="index.js?v=%s"></script>' % sha)
open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(html)
icons = [{"src": "index.apple-touch-icon.png", "sizes": "180x180", "type": "image/png"}]
if os.path.exists(os.path.join(out, "index.144x144.png")):
    icons.append({"src": "index.144x144.png", "sizes": "144x144", "type": "image/png"})
json.dump({"name": "Война троп", "short_name": "Война троп", "start_url": "./index.html", "scope": "./",
           "display": "fullscreen", "orientation": "portrait", "background_color": "#000000",
           "theme_color": "#000000", "icons": icons}, open(os.path.join(out, "manifest.json"), "w"), ensure_ascii=False)
open(os.path.join(out, "version.txt"), "w").write(sha + "\n")
print("parts", len(parts), "html", len(html))
