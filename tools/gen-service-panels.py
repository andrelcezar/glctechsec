#!/usr/bin/env python3
"""
Builds two brand-consistent console illustrations:

  assets/services/glc-endpoint-security.svg  (replaces kaspersky.webp/png —
      teal/green, off-brand, and led with a single vendor logo, which contradicts
      the page's own vendor-agnostic positioning)
  assets/services/glc-backup-continuity.svg  (replaces veeam.webp/png — cyan,
      off-brand, and the wordmark was misspelt "VEEEAM")
"""
import math

RED, GREEN, AMBER = "#e6262c", "#4ade80", "#e6a826"
WHITE, GRAY, DIM, DARK = "#ffffff", "#c9c9c9", "#8a8a8a", "#6f6f6f"
PANEL, BASE, BORD = "#262626", "#1f1f1f", "#3d3d3d"

W, H, PAD = 1000, 600, 28


def header(A, title, subtitle):
    A(f'<rect width="{W}" height="{H}" fill="{BASE}"/>')
    A(f'<text x="{PAD}" y="{PAD+22}" fill="{WHITE}" font-size="19" font-weight="700" '
      f'font-family="Syne, sans-serif">{title}</text>')
    A(f'<text x="{PAD}" y="{PAD+44}" fill="{DIM}" font-size="12">{subtitle}</text>')
    A(f'<circle cx="{W-PAD-96}" cy="{PAD+16}" r="4" fill="{GREEN}"/>')
    A(f'<text x="{W-PAD-84}" y="{PAD+20}" fill="{GREEN}" font-size="11" font-weight="600" '
      f'letter-spacing="1.2">MONITORED</text>')
    A(f'<line x1="{PAD}" y1="{PAD+60}" x2="{W-PAD}" y2="{PAD+60}" stroke="{BORD}"/>')


def panel(A, x, y, w, h, label=None):
    A(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{PANEL}" stroke="{BORD}"/>')
    if label:
        A(f'<text x="{x+16}" y="{y+24}" fill="{DIM}" font-size="10.5" font-weight="600" '
          f'letter-spacing="1.3">{label}</text>')


def kpi(A, x, y, w, label, value, unit, sub, dot):
    panel(A, x, y, w, 92)
    A(f'<circle cx="{x+16}" cy="{y+20}" r="4" fill="{dot}"/>')
    A(f'<text x="{x+28}" y="{y+24}" fill="{DIM}" font-size="10" font-weight="600" '
      f'letter-spacing="1.3">{label}</text>')
    A(f'<text x="{x+16}" y="{y+60}" fill="{WHITE}" font-size="29" font-weight="700" '
      f'font-family="Syne, sans-serif">{value}<tspan fill="{RED}" font-size="17">{unit}</tspan></text>')
    A(f'<text x="{x+16}" y="{y+80}" fill="{DARK}" font-size="10.5">{sub}</text>')


def pill(A, x, y, text, colour, anchor="start"):
    w = len(text) * 5.9 + 18
    px = x if anchor == "start" else x - w
    A(f'<rect x="{px:.1f}" y="{y-11}" width="{w:.1f}" height="17" rx="8.5" fill="{colour}" '
      f'fill-opacity="0.15" stroke="{colour}" stroke-opacity="0.45"/>')
    A(f'<text x="{px+w/2:.1f}" y="{y+1}" fill="{colour}" font-size="9.5" font-weight="600" '
      f'text-anchor="middle">{text}</text>')


# ───────────────────────── ENDPOINT SECURITY ──────────────────────────────
def endpoint_security():
    out = []; A = out.append
    A(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" '
      f'aria-labelledby="ep-t ep-d" font-family="DM Sans, Segoe UI, sans-serif">')
    A('<title id="ep-t">Managed endpoint security console</title>')
    A('<desc id="ep-d">Example console: 184 of 184 endpoints protected, 1,204 threats '
      'blocked this month, 98 percent policy compliance and 4 devices needing attention, '
      'with a platform-selection panel and a recent detections list.</desc>')
    header(A, "Managed endpoint security", "Platform selected per client risk profile · reviewed quarterly")

    y = 112
    cw = (W - 2 * PAD - 3 * 14) / 4
    kpi(A, PAD + 0 * (cw + 14), y, cw, "ENDPOINTS PROTECTED", "184", "/184", "agents reporting", GREEN)
    kpi(A, PAD + 1 * (cw + 14), y, cw, "THREATS BLOCKED", "1,204", "", "this month", GREEN)
    kpi(A, PAD + 2 * (cw + 14), y, cw, "POLICY COMPLIANCE", "98", "%", "against baseline", GREEN)
    kpi(A, PAD + 3 * (cw + 14), y, cw, "NEEDS ATTENTION", "4", "", "3 updates · 1 review", AMBER)

    # platform selection — the point of the page
    py = 222
    pw = (W - 2 * PAD - 14) / 2
    panel(A, PAD, py, pw, 212, "PLATFORM SELECTION")
    vendors = [
        ("Microsoft Defender for Business", "M365-native estates", GREEN),
        ("Bitdefender GravityZone", "Mixed OS, low overhead", GREEN),
        ("Sophos Intercept X", "Firewall-integrated sites", GREEN),
        ("Kaspersky Endpoint Security", "Where sector rules permit", AMBER),
    ]
    for i, (name, why, colour) in enumerate(vendors):
        ry = py + 58 + i * 36
        A(f'<rect x="{PAD+16}" y="{ry-16}" width="{pw-32}" height="28" rx="4" fill="#2d2d2d"/>')
        A(f'<circle cx="{PAD+30}" cy="{ry-2}" r="3.5" fill="{colour}"/>')
        A(f'<text x="{PAD+42}" y="{ry+2}" fill="{GRAY}" font-size="11.5">{name}</text>')
        A(f'<text x="{PAD+pw-24}" y="{ry+2}" fill="{DARK}" font-size="10" text-anchor="end">{why}</text>')
    A(f'<text x="{PAD+16}" y="{py+198}" fill="{DARK}" font-size="10">'
      f'Selection and rationale documented for your compliance file.</text>')

    # detections
    dx = PAD + pw + 14
    panel(A, dx, py, pw, 212, "RECENT DETECTIONS")
    rows = [
        ("Phishing URL blocked", "finance-04", "Blocked", GREEN),
        ("Ransomware behaviour halted", "ops-11", "Quarantined", RED),
        ("Unsigned macro prevented", "admin-02", "Blocked", GREEN),
        ("USB device denied by policy", "recep-01", "Blocked", GREEN),
    ]
    for i, (ev, host, state, colour) in enumerate(rows):
        ry = py + 58 + i * 36
        A(f'<text x="{dx+16}" y="{ry+2}" fill="{GRAY}" font-size="11.5">{ev}</text>')
        A(f'<text x="{dx+16}" y="{ry+18}" fill="{DARK}" font-size="10">{host}</text>')
        pill(A, dx + pw - 16, ry + 2, state, colour, anchor="end")

    # coverage bar
    by = 448
    panel(A, PAD, by, W - 2 * PAD, 88, "COVERAGE BY DEVICE TYPE")
    segs = [("Workstations", 96, GREEN), ("Laptops", 68, GREEN), ("Servers", 16, GREEN), ("Mobile", 4, AMBER)]
    total = sum(s[1] for s in segs)
    bx = PAD + 16
    bw = W - 2 * PAD - 32
    cx = bx
    for name, val, colour in segs:
        seg_w = bw * val / total
        A(f'<rect x="{cx:.1f}" y="{by+40}" width="{max(seg_w-3,2):.1f}" height="12" rx="3" fill="{colour}" '
          f'fill-opacity="{0.85 if colour==GREEN else 1}"/>')
        cx += seg_w
    for i, (name, val, colour) in enumerate(segs):
        lx = bx + i * (bw / len(segs))
        A(f'<circle cx="{lx+3:.1f}" cy="{by+68}" r="3.5" fill="{colour}"/>')
        A(f'<text x="{lx+13:.1f}" y="{by+72}" fill="{DIM}" font-size="10">{name} <tspan fill="{WHITE}">{val}</tspan></text>')

    # footer note
    A(f'<text x="{PAD}" y="{H-24}" fill="{DARK}" font-size="10.5">'
      f'Illustrative view of a managed estate. Vendor names are trademarks of their respective owners.</text>')
    A('</svg>')
    return "\n".join(out)


# ───────────────────────── BACKUP &amp; CONTINUITY ───────────────────────────
def backup_continuity():
    out = []; A = out.append
    A(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" '
      f'aria-labelledby="bk-t bk-d" font-family="DM Sans, Segoe UI, sans-serif">')
    A('<title id="bk-t">Backup and continuity console</title>')
    A('<desc id="bk-d">Example console: last successful backup 41 minutes ago, 12 minute '
      'recovery point objective, 100 percent job success over 30 days and 28 recovery '
      'points retained, with a 3-2-1 copy diagram and recent job list.</desc>')
    header(A, "Backup &amp; continuity", "Recovery tested monthly · restore evidence supplied to your auditor")

    y = 112
    cw = (W - 2 * PAD - 3 * 14) / 4
    kpi(A, PAD + 0 * (cw + 14), y, cw, "LAST SUCCESSFUL BACKUP", "41", " min ago", "all protected workloads", GREEN)
    kpi(A, PAD + 1 * (cw + 14), y, cw, "RECOVERY POINT (RPO)", "12", " min", "against a 15 min target", GREEN)
    kpi(A, PAD + 2 * (cw + 14), y, cw, "JOB SUCCESS RATE", "100", "%", "rolling 30 days", GREEN)
    kpi(A, PAD + 3 * (cw + 14), y, cw, "RECOVERY POINTS", "28", "", "14 daily · 8 weekly · 6 monthly", GREEN)

    # 3-2-1 diagram
    py = 222
    pw = (W - 2 * PAD - 14) / 2
    panel(A, PAD, py, pw, 212, "3-2-1 COPY RULE")
    nodes = [
        ("Production", "Primary workloads", PAD + 82, RED),
        ("On-site copy", "Local repository", PAD + pw / 2, GREEN),
        ("Off-site copy", "Immutable, air-gapped", PAD + pw - 82, GREEN),
    ]
    ny = py + 104
    for i, (name, sub, nx, colour) in enumerate(nodes):
        if i:
            prev = nodes[i - 1][2]
            A(f'<line x1="{prev+30}" y1="{ny}" x2="{nx-30}" y2="{ny}" stroke="{BORD}" stroke-width="1.5"/>')
            mid = (prev + 30 + nx - 30) / 2
            A(f'<path d="M {mid-4} {ny-4} L {mid+4} {ny} L {mid-4} {ny+4} Z" fill="{DIM}"/>')
        A(f'<circle cx="{nx}" cy="{ny}" r="26" fill="#2d2d2d" stroke="{colour}" stroke-width="1.5"/>')
        A(f'<circle cx="{nx}" cy="{ny}" r="7" fill="{colour}"/>')
        A(f'<text x="{nx}" y="{ny+48}" fill="{GRAY}" font-size="11" text-anchor="middle">{name}</text>')
        A(f'<text x="{nx}" y="{ny+64}" fill="{DARK}" font-size="9.5" text-anchor="middle">{sub}</text>')
    A(f'<text x="{PAD+16}" y="{py+198}" fill="{DARK}" font-size="10">'
      f'Three copies, two media types, one held off-site and immutable.</text>')

    # jobs
    jx = PAD + pw + 14
    panel(A, jx, py, pw, 212, "LAST NIGHT&#39;S JOBS")
    jobs = [
        ("File server", "820 GB", "Success", GREEN),
        ("SQL database", "156 GB", "Success", GREEN),
        ("Mail store", "412 GB", "Success", GREEN),
        ("Virtual hosts", "1.4 TB", "Success", GREEN),
    ]
    for i, (name, size, state, colour) in enumerate(jobs):
        ry = py + 58 + i * 36
        A(f'<text x="{jx+16}" y="{ry+2}" fill="{GRAY}" font-size="11.5">{name}</text>')
        A(f'<text x="{jx+16}" y="{ry+18}" fill="{DARK}" font-size="10">{size} transferred</text>')
        pill(A, jx + pw - 16, ry + 2, state, colour, anchor="end")

    # restore drill timeline
    by = 448
    panel(A, PAD, by, W - 2 * PAD, 88, "LAST RESTORE TEST · FULL FILE SERVER RECOVERY")
    steps = [("Request", "0 min"), ("Mount", "2 min"), ("Verify", "9 min"), ("Live", "18 min")]
    sx = PAD + 40
    span = (W - 2 * PAD - 110) / (len(steps) - 1)
    A(f'<line x1="{sx}" y1="{by+50}" x2="{sx+span*(len(steps)-1)}" y2="{by+50}" stroke="{BORD}" stroke-width="2"/>')
    A(f'<line x1="{sx}" y1="{by+50}" x2="{sx+span*(len(steps)-1)}" y2="{by+50}" stroke="{GREEN}" stroke-width="2"/>')
    for i, (name, when) in enumerate(steps):
        px = sx + i * span
        A(f'<circle cx="{px:.1f}" cy="{by+50}" r="6" fill="{BASE}" stroke="{GREEN}" stroke-width="2"/>')
        A(f'<text x="{px:.1f}" y="{by+40}" fill="{GRAY}" font-size="10.5" text-anchor="middle">{name}</text>')
        A(f'<text x="{px:.1f}" y="{by+72}" fill="{DARK}" font-size="10" text-anchor="middle">{when}</text>')
    pill(A, W - PAD - 16, by + 24, "Within RTO target", GREEN, anchor="end")

    A(f'<text x="{PAD}" y="{H-24}" fill="{DARK}" font-size="10.5">'
      f'Illustrative view of a protected estate. Vendor names are trademarks of their respective owners.</text>')
    A('</svg>')
    return "\n".join(out)


open('assets/services/glc-endpoint-security.svg', 'w').write(endpoint_security())
open('assets/services/glc-backup-continuity.svg', 'w').write(backup_continuity())
print("ok")
