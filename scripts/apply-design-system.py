from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
for page in sorted(root.glob('*.html')) + sorted((root / 'calculadora').glob('*.html')) + [root / 'admin' / 'index.html']:
    html = page.read_text(encoding='utf-8')
    prefix = '../' if page.parent != root else ''
    styles = (f'<link rel="stylesheet" href="{prefix}assets/css/tokens.css">\n'
              f'  <link rel="stylesheet" href="{prefix}assets/css/components.css">\n  ')
    if 'assets/css/tokens.css' not in html:
        html = re.sub(r'(<link\s+rel="stylesheet"\s+href=)', styles + r'\1', html, count=1)
    if 'fonts.googleapis.com/css2?family=Inter' not in html:
        html = html.replace('</head>', '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">\n</head>', 1)
    if page.parent.name not in ('admin', 'calculadora') and page.name not in ('admin-productos.html', 'acceso-kora.html'):
        html = re.sub(r'<html\b(?![^>]*data-density=)', '<html data-density="comfortable"', html, count=1, flags=re.I)
    html = re.sub(r'<body\b([^>]*)>', lambda m: '<body' + (re.sub(r'class="([^"]*)"', lambda c: 'class="ds-root ' + c.group(1) + '"' if 'ds-root' not in c.group(1).split() else c.group(0), m.group(1)) if 'class=' in m.group(1) else m.group(1) + ' class="ds-root"') + '>', html, count=1, flags=re.I)
    if page.name == 'index.html' and page.parent.name == 'admin':
        html = html.replace('<link rel="stylesheet" href="./css/tokens.css">\n  ', '').replace('<link rel="stylesheet" href="./css/components.css">\n  ', '')
    page.write_text(html, encoding='utf-8')
