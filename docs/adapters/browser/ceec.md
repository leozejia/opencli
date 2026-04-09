# Ceec

**Mode**: 🔐 Browser · **Domain**: `ec.ceec.net.cn`

## Commands

| Command | Description |
|---------|-------------|
| `opencli ceec search "<query>" --limit <n>` | Search CEEC procurement notices (V2 structured contract) |
| `opencli ceec detail "<url>"` | Extract detail-page evidence blocks from a search URL |

## Usage Examples

```bash
opencli ceec search "elevator" --limit 20 -f json
opencli ceec search "电力 电梯" --limit 10 -f json
opencli ceec detail "https://ec.ceec.net.cn/...." -f json
```

## Notes

- This adapter probes CEEC entry pages and extracts visible notice links.
- `search` returns V2 fields (`content_type`, `publish_time`, `snippet`, `quality_flags`, etc.) and keeps `date/summary` for compatibility.
- `detail` returns the same structured fields and adds `detail_text` + `evidence_blocks`.
- Date fields are normalized to `YYYY-MM-DD` when detectable.
- Results are deduplicated by `title + url`.
