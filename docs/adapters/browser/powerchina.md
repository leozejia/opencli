# PowerChina

**Mode**: 🔐 Browser · **Domain**: `bid.powerchina.cn`

## Commands

| Command | Description |
|---------|-------------|
| `opencli powerchina search "<query>" --limit <n>` | Search PowerChina procurement notices (V2 structured contract) |
| `opencli powerchina detail "<url>"` | Extract detail-page evidence blocks from a search URL |

## Usage Examples

```bash
# Search by keyword
opencli powerchina search "procurement" --limit 20 -f json

# Search with another keyword
opencli powerchina search "substation" --limit 10 -f json

# Extract structured detail evidence
opencli powerchina detail "https://bid.powerchina.cn/...." -f json
```

## Prerequisites

- Chrome running with an active `bid.powerchina.cn` session
- [Browser Bridge extension](/guide/browser-bridge) installed

## Notes

- This adapter probes multiple search entry URLs and returns merged rows.
- `search` returns V2 fields (`content_type`, `publish_time`, `snippet`, `quality_flags`, etc.) and keeps `date/summary` for compatibility.
- `detail` returns the same structured fields and adds `detail_text` + `evidence_blocks`.
- Date fields are normalized to `YYYY-MM-DD` when date text is detectable.
- Results are deduplicated by `title + url`.
- `--limit` defaults to `20` and is capped at `50`.

## Troubleshooting

- If the site asks for login/verification, complete it in Chrome and retry.
- If results are all navigation/portal noise, adapter returns taxonomy-style extraction errors instead of weak candidate rows.
