# Figure generators

The four SVG illustrations in `assets/` are generated, not drawn by hand, so the
numbers stay internally consistent and the palette stays tied to the site tokens.

```
python3 tools/gen-noc-dashboard.py      # assets/hero/glc-noc-dashboard.svg
python3 tools/gen-service-panels.py     # assets/services/glc-{endpoint-security,backup-continuity}.svg
python3 tools/gen-monitored-estate.py   # assets/hero/glc-monitored-estate.svg
```

Run them from the project root — each writes straight to its `assets/` path.
If a figure changes materially, re-render the matching 1200x630 social card in
`assets/og/` too (`cairosvg` + Pillow; see REVISION-3-CHANGELOG.md §4).

Colours are declared at the top of each script and mirror `:root` in the pages:
`--red #e6262c`, `--dark #2d2d2d`, `--dark-mid #242424`, `--dark-border #484848`.
