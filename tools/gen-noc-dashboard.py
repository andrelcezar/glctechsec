#!/usr/bin/env python3
"""
Builds assets/hero/glc-noc-dashboard.svg — a NOC dashboard rendered strictly from
the site's own design tokens. Replaces assets/hero/zabbix_fk.webp, which was an
AI-generated image containing invented Portuguese labels and non-sequential axes.
"""
import math, random

RED   = "#e6262c"
GREEN = "#4ade80"
AMBER = "#e6a826"
WHITE = "#ffffff"
GRAY  = "#c9c9c9"
DIM   = "#8a8a8a"
DARK  = "#8f8f8f"
PANEL = "#262626"
BASE  = "#1f1f1f"
BORD  = "#3d3d3d"

W, H = 1200, 620
PAD, GAP = 24, 16
COL = (W - 2 * PAD - 3 * GAP) / 4          # 276

def x(c):  return PAD + c * (COL + GAP)
def w(n):  return n * COL + (n - 1) * GAP

out = []
A = out.append

A(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
  f'role="img" aria-labelledby="noc-title noc-desc" font-family="DM Sans, Segoe UI, sans-serif">')
A('<title id="noc-title">GLCTech network operations dashboard</title>')
A('<desc id="noc-desc">Example operations view: 61 active hosts, 3 open problems, '
  '99.98 percent availability and 42 millisecond average response time, with charts '
  'for problems by severity, memory, network throughput and per-host status.</desc>')
A(f'<rect width="{W}" height="{H}" fill="{BASE}"/>')

def panel(px, py, pw, ph, label=None):
    A(f'<rect x="{px}" y="{py}" width="{pw}" height="{ph}" rx="6" fill="{PANEL}" stroke="{BORD}"/>')
    if label:
        A(f'<text x="{px+16}" y="{py+24}" fill="{DIM}" font-size="11" font-weight="600" '
          f'letter-spacing="1.4">{label}</text>')

# ── KPI ROW ────────────────────────────────────────────────────────────────
kpis = [
    ("ACTIVE HOSTS",    "61",      "",       WHITE, GREEN, "all reporting"),
    ("OPEN PROBLEMS",   "3",       "",       WHITE, AMBER, "2 warning · 1 average"),
    ("AVAILABILITY",    "99.98",   "%",      WHITE, GREEN, "rolling 30 days"),
    ("AVG RESPONSE",    "42",      " ms",    WHITE, GREEN, "across all checks"),
]
for i, (lab, val, unit, vc, dot, sub) in enumerate(kpis):
    px, py = x(i), 24
    panel(px, py, COL, 88)
    A(f'<circle cx="{px+16}" cy="{py+20}" r="4" fill="{dot}"/>')
    A(f'<text x="{px+28}" y="{py+24}" fill="{DIM}" font-size="10.5" font-weight="600" '
      f'letter-spacing="1.4">{lab}</text>')
    A(f'<text x="{px+16}" y="{py+58}" fill="{vc}" font-size="30" font-weight="700" '
      f'font-family="Syne, sans-serif">{val}<tspan fill="{RED}" font-size="19">{unit}</tspan></text>')
    A(f'<text x="{px+16}" y="{py+76}" fill="{DARK}" font-size="10.5">{sub}</text>')

# ── MIDDLE ROW ─────────────────────────────────────────────────────────────
MY, MH = 128, 236
HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"]

# 1. CPU headroom gauge
gx = x(0)
panel(gx, MY, COL, MH, "CLUSTER CPU")
cx, cy, r = gx + COL / 2, MY + 132, 68
start, end = math.pi * 0.8, math.pi * 2.2      # 252° sweep
def arc(frm, to, colour, width):
    x1, y1 = cx + r * math.cos(frm), cy + r * math.sin(frm)
    x2, y2 = cx + r * math.cos(to),  cy + r * math.sin(to)
    large = 1 if (to - frm) > math.pi else 0
    A(f'<path d="M {x1:.1f} {y1:.1f} A {r} {r} 0 {large} 1 {x2:.1f} {y2:.1f}" '
      f'fill="none" stroke="{colour}" stroke-width="{width}" stroke-linecap="round"/>')
PCT = 38
arc(start, end, "#3f3f3f", 13)
arc(start, start + (end - start) * PCT / 100, GREEN, 13)
A(f'<text x="{cx}" y="{cy+6}" fill="{WHITE}" font-size="34" font-weight="700" '
  f'font-family="Syne, sans-serif" text-anchor="middle">{PCT}<tspan font-size="18" fill="{DIM}">%</tspan></text>')
A(f'<text x="{cx}" y="{cy+26}" fill="{DARK}" font-size="10.5" text-anchor="middle">62% headroom</text>')
A(f'<text x="{cx}" y="{MY+MH-18}" fill="{DIM}" font-size="10.5" text-anchor="middle">'
  f'peak today 61% · 14:20</text>')

# 2. Problems by severity, stacked bars over a real sequential day
bx = x(1)
panel(bx, MY, w(2), MH, "PROBLEMS BY SEVERITY")
plot_x, plot_y = bx + 44, MY + 44
plot_w, plot_h = w(2) - 62, MH - 82
for i in range(4):                                  # gridlines + y axis
    gy = plot_y + plot_h - i * plot_h / 3
    A(f'<line x1="{plot_x}" y1="{gy:.1f}" x2="{plot_x+plot_w}" y2="{gy:.1f}" '
      f'stroke="#323232" stroke-width="1"/>')
    A(f'<text x="{plot_x-10}" y="{gy+4:.1f}" fill="{DARK}" font-size="10" text-anchor="end">{i*3}</text>')

random.seed(7)
series = [  # (info, warning, average) per 20-minute bucket
    (1,0,0),(2,0,0),(1,1,0),(3,0,0),(2,1,0),(1,0,0),(2,0,0),
    (4,1,0),(2,2,0),(3,1,1),(5,2,1),(3,1,0),(2,1,0),(4,0,0),
    (2,0,0),(3,1,0),(1,1,0),(2,0,0),(4,1,0),(3,2,1),(2,1,0),
]
n = len(series)
bw = plot_w / n * 0.62
step = plot_w / n
unit_h = plot_h / 9
for i, (info, warn, avg) in enumerate(series):
    bx0 = plot_x + i * step + (step - bw) / 2
    y0 = plot_y + plot_h
    for value, colour in ((info, "#5a5a5a"), (warn, AMBER), (avg, RED)):
        if value:
            bh = value * unit_h
            y0 -= bh
            A(f'<rect x="{bx0:.1f}" y="{y0:.1f}" width="{bw:.1f}" height="{bh:.1f}" fill="{colour}" rx="1"/>')
for i, hour in enumerate(HOURS):                     # x axis, strictly sequential
    hx = plot_x + (i + 0.5) * plot_w / len(HOURS)
    A(f'<text x="{hx:.1f}" y="{plot_y+plot_h+18}" fill="{DARK}" font-size="10" '
      f'text-anchor="middle">{hour}</text>')
legend = [("Information", "#5a5a5a"), ("Warning", AMBER), ("Average", RED)]
lx = bx + w(2) - 16
for lab, colour in reversed(legend):
    lx -= len(lab) * 5.6 + 22
    A(f'<circle cx="{lx:.1f}" cy="{MY+21}" r="3.5" fill="{colour}"/>')
    A(f'<text x="{lx+9:.1f}" y="{MY+25}" fill="{DIM}" font-size="10">{lab}</text>')

# 3. Memory utilisation
mx_ = x(3)
panel(mx_, MY, COL, MH, "MEMORY UTILISATION")
rows = [("web-01", 64), ("app-01", 71), ("db-01", 83), ("bkp-01", 46), ("mail-01", 58)]
for i, (host, pct) in enumerate(rows):
    ry = MY + 52 + i * 34
    A(f'<text x="{mx_+16}" y="{ry}" fill="{GRAY}" font-size="11.5">{host}</text>')
    A(f'<text x="{mx_+COL-16}" y="{ry}" fill="{DIM}" font-size="11.5" text-anchor="end">{pct}%</text>')
    A(f'<rect x="{mx_+16}" y="{ry+7}" width="{COL-32}" height="5" rx="2.5" fill="#333333"/>')
    colour = AMBER if pct >= 80 else GREEN
    A(f'<rect x="{mx_+16}" y="{ry+7}" width="{(COL-32)*pct/100:.1f}" height="5" rx="2.5" fill="{colour}"/>')

# ── BOTTOM ROW ─────────────────────────────────────────────────────────────
BY, BH = 380, 216

# Network throughput
nx = x(0)
panel(nx, BY, w(2), BH, "NETWORK THROUGHPUT · Gbps")
px0, py0 = nx + 44, BY + 44
pw0, ph0 = w(2) - 62, BH - 78
for i in range(4):
    gy = py0 + ph0 - i * ph0 / 3
    A(f'<line x1="{px0}" y1="{gy:.1f}" x2="{px0+pw0}" y2="{gy:.1f}" stroke="#323232"/>')
    A(f'<text x="{px0-10}" y="{gy+4:.1f}" fill="{DARK}" font-size="10" text-anchor="end">{i*3}</text>')

random.seed(11)
def make_series(base, jitter, points=44):
    vals, v = [], base
    for _ in range(points):
        v = max(0.4, min(8.6, v + random.uniform(-jitter, jitter)))
        vals.append(v)
    return vals
rx_vals = make_series(5.2, 0.85)
tx_vals = make_series(2.4, 0.5)

def area(vals, colour, fill_op):
    pts = []
    for i, v in enumerate(vals):
        vx = px0 + i * pw0 / (len(vals) - 1)
        vy = py0 + ph0 - (v / 9) * ph0
        pts.append(f"{vx:.1f},{vy:.1f}")
    A(f'<polygon points="{px0},{py0+ph0} {" ".join(pts)} {px0+pw0},{py0+ph0}" '
      f'fill="{colour}" fill-opacity="{fill_op}"/>')
    A(f'<polyline points="{" ".join(pts)}" fill="none" stroke="{colour}" stroke-width="1.8"/>')
area(rx_vals, RED, 0.16)
area(tx_vals, "#7a7a7a", 0.12)
for i, hour in enumerate(HOURS):
    hx = px0 + (i + 0.5) * pw0 / len(HOURS)
    A(f'<text x="{hx:.1f}" y="{py0+ph0+18}" fill="{DARK}" font-size="10" text-anchor="middle">{hour}</text>')
lx = nx + w(2) - 16
for lab, colour in (("Outbound", "#7a7a7a"), ("Inbound", RED)):
    lx -= len(lab) * 5.6 + 22
    A(f'<circle cx="{lx:.1f}" cy="{BY+21}" r="3.5" fill="{colour}"/>')
    A(f'<text x="{lx+9:.1f}" y="{BY+25}" fill="{DIM}" font-size="10">{lab}</text>')

# Host status table
tx_ = x(2)
panel(tx_, BY, w(2), BH, "LATEST EVENTS")
cols = [("TIME", 16), ("HOST", 86), ("EVENT", 200), ("SEVERITY", w(2) - 96)]
for lab, off in cols:
    anchor = 'end' if lab == "SEVERITY" else 'start'
    A(f'<text x="{tx_+off}" y="{BY+46}" fill="{DARK}" font-size="9.5" font-weight="600" '
      f'letter-spacing="1.1" text-anchor="{anchor}">{lab}</text>')
A(f'<line x1="{tx_+16}" y1="{BY+54}" x2="{tx_+w(2)-16}" y2="{BY+54}" stroke="{BORD}"/>')
events = [
    ("14:52", "db-01",   "Memory usage above 80%",        "Average", RED),
    ("14:20", "gw-core", "Interface eth1 high utilisation","Warning", AMBER),
    ("13:07", "web-02",  "Service restarted successfully", "Resolved", GREEN),
    ("11:41", "app-01",  "Response time above baseline",   "Warning", AMBER),
    ("09:58", "bkp-01",  "Backup job completed",           "Information", "#6f6f6f"),
]
for i, (t, host, ev, sev, colour) in enumerate(events):
    ry = BY + 78 + i * 27
    A(f'<text x="{tx_+16}" y="{ry}" fill="{DIM}" font-size="11">{t}</text>')
    A(f'<text x="{tx_+86}" y="{ry}" fill="{GRAY}" font-size="11">{host}</text>')
    A(f'<text x="{tx_+200}" y="{ry}" fill="{GRAY}" font-size="11">{ev}</text>')
    label_w = len(sev) * 5.9 + 16
    A(f'<rect x="{tx_+w(2)-16-label_w:.1f}" y="{ry-11}" width="{label_w:.1f}" height="16" rx="8" '
      f'fill="{colour}" fill-opacity="0.16" stroke="{colour}" stroke-opacity="0.45"/>')
    A(f'<text x="{tx_+w(2)-24:.1f}" y="{ry}" fill="{colour}" font-size="9.5" font-weight="600" '
      f'text-anchor="end">{sev}</text>')

A('</svg>')

with open('assets/hero/glc-noc-dashboard.svg', 'w') as f:
    f.write("\n".join(out))
print("written", sum(len(o) for o in out), "bytes")
