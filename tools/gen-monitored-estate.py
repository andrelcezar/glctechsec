#!/usr/bin/env python3
"""
Builds assets/hero/glc-monitored-estate.svg — a monitored-estate topology.
Replaces assets/hero/escritorio.webp, an AI-generated office interior carrying a
Portuguese wall sign, used with alt text claiming to show the team.
"""
import math

RED, GREEN, AMBER = "#e6262c", "#4ade80", "#e6a826"
WHITE, GRAY, DIM, DARK = "#ffffff", "#c9c9c9", "#8a8a8a", "#6f6f6f"
PANEL, BASE, BORD = "#262626", "#1f1f1f", "#3d3d3d"

W, H = 900, 720
PAD = 28

out = []
A = out.append
A(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" '
  f'aria-labelledby="est-t est-d" font-family="DM Sans, Segoe UI, sans-serif">')
A('<title id="est-t">A monitored estate</title>')
A('<desc id="est-d">Topology of a typical monitored client estate: internet edge and '
  'firewall feeding a core switch, which serves virtualisation hosts, physical servers, '
  'network devices and endpoints, with every layer reporting into GLCTech monitoring '
  'over SNMP and agents.</desc>')
A(f'<rect width="{W}" height="{H}" fill="{BASE}"/>')

# subtle grid, matching the hero grid on the homepage
A(f'<defs><pattern id="grid" width="45" height="45" patternUnits="userSpaceOnUse">'
  f'<path d="M 45 0 L 0 0 0 45" fill="none" stroke="#2b2b2b" stroke-width="1"/>'
  f'</pattern></defs>')
A(f'<rect width="{W}" height="{H}" fill="url(#grid)"/>')

A(f'<text x="{PAD}" y="{PAD+20}" fill="{WHITE}" font-size="18" font-weight="700" '
  f'font-family="Syne, sans-serif">What we watch</text>')
A(f'<text x="{PAD}" y="{PAD+42}" fill="{DIM}" font-size="12">'
  f'Every layer reports in — so a failure is a ticket, not a phone call from your client.</text>')
A(f'<line x1="{PAD}" y1="{PAD+58}" x2="{W-PAD}" y2="{PAD+58}" stroke="{BORD}"/>')

CX = W / 2

def node(x, y, w, h, title, sub, status, icon_bars=0):
    colour = {"ok": GREEN, "warn": AMBER, "alert": RED}[status]
    A(f'<rect x="{x-w/2:.1f}" y="{y-h/2:.1f}" width="{w}" height="{h}" rx="6" '
      f'fill="{PANEL}" stroke="{BORD}"/>')
    A(f'<rect x="{x-w/2:.1f}" y="{y-h/2:.1f}" width="3" height="{h}" rx="1.5" fill="{colour}"/>')
    A(f'<text x="{x-w/2+16:.1f}" y="{y-2:.1f}" fill="{GRAY}" font-size="12.5">{title}</text>')
    A(f'<text x="{x-w/2+16:.1f}" y="{y+15:.1f}" fill="{DARK}" font-size="10">{sub}</text>')
    A(f'<circle cx="{x+w/2-16:.1f}" cy="{y-6:.1f}" r="4" fill="{colour}"/>')

def link(x1, y1, x2, y2, live=True):
    A(f'<path d="M {x1:.1f} {y1:.1f} C {x1:.1f} {(y1+y2)/2:.1f} {x2:.1f} {(y1+y2)/2:.1f} {x2:.1f} {y2:.1f}" '
      f'fill="none" stroke="{"#4a4a4a" if live else "#383838"}" stroke-width="1.5"/>')

# ── spine ────────────────────────────────────────────────────────────────
Y_EDGE, Y_FW, Y_CORE = 132, 226, 320
link(CX, Y_EDGE + 22, CX, Y_FW - 22)
link(CX, Y_FW + 22, CX, Y_CORE - 22)
node(CX, Y_EDGE, 260, 44, "Internet edge", "2 circuits · failover tested", "ok")
node(CX, Y_FW, 260, 44, "Firewall", "policy + IDS/IPS", "ok")
node(CX, Y_CORE, 260, 44, "Core switch", "LACP · 10 Gbps uplinks", "ok")

# ── leaf row ─────────────────────────────────────────────────────────────
Y_LEAF = 452
leaves = [
    (CX - 300, "Virtual hosts", "12 VMs · 3 hosts", "ok"),
    (CX - 100, "Servers", "file · mail · SQL", "warn"),
    (CX + 100, "Network devices", "APs, switches, UPS", "ok"),
    (CX + 300, "Endpoints", "184 agents", "ok"),
]
for lx, title, sub, status in leaves:
    link(CX, Y_CORE + 22, lx, Y_LEAF - 22)
    node(lx, Y_LEAF, 176, 44, title, sub, status)

# ── collector ────────────────────────────────────────────────────────────
Y_COL = 566
for lx, *_ in leaves:
    A(f'<path d="M {lx:.1f} {Y_LEAF+22:.1f} L {lx:.1f} {Y_COL-26:.1f}" stroke="{RED}" '
      f'stroke-width="1.2" stroke-opacity="0.5" stroke-dasharray="3 4"/>')
A(f'<rect x="{CX-330:.1f}" y="{Y_COL-26}" width="660" height="52" rx="6" fill="#2d2d2d" '
  f'stroke="{RED}" stroke-opacity="0.55"/>')
A(f'<circle cx="{CX-306:.1f}" cy="{Y_COL}" r="5" fill="{RED}"/>')
A(f'<text x="{CX-290:.1f}" y="{Y_COL-2:.1f}" fill="{WHITE}" font-size="13" font-weight="600">'
  f'GLCTech monitoring</text>')
A(f'<text x="{CX-290:.1f}" y="{Y_COL+15:.1f}" fill="{DIM}" font-size="10.5">'
  f'SNMP · agents · API checks — 24/7, with escalation</text>')
A(f'<text x="{CX+306:.1f}" y="{Y_COL+4:.1f}" fill="{GREEN}" font-size="11" font-weight="600" '
  f'text-anchor="end">99.98% availability</text>')

# ── footer stats ─────────────────────────────────────────────────────────
stats = [("144+", "devices under SNMP"), ("3k+", "monitoring capacity"), ("24/7", "eyes on the alerts")]
sx = PAD
for value, label in stats:
    A(f'<text x="{sx}" y="{H-52}" fill="{WHITE}" font-size="20" font-weight="700" '
      f'font-family="Syne, sans-serif">{value}</text>')
    A(f'<text x="{sx}" y="{H-34}" fill="{DARK}" font-size="10.5">{label}</text>')
    sx += 250
A(f'<line x1="{PAD}" y1="{H-78}" x2="{W-PAD}" y2="{H-78}" stroke="{BORD}"/>')

A('</svg>')
open('assets/hero/glc-monitored-estate.svg', 'w').write("\n".join(out))
print("ok")
