# Sinopec

**Mode**: 🔐 Browser · **Domain**: `bidding.epec.com`

## Commands

| Command | Description |
|---------|-------------|
| `opencli sinopec search "<query>" --limit <n>` | Search Sinopec tender notices (V2 structured contract) |
| `opencli sinopec detail "<url>"` | Extract detail-page evidence blocks from a search URL |

## Usage Examples

```bash
opencli sinopec search "elevator" --limit 20 -f json
opencli sinopec search "防爆电梯" --limit 10 -f json
opencli sinopec detail "https://bidding.epec.com/...." -f json
```

## Notes

- This adapter probes multiple entry URLs and query-key variants.
- `search` returns V2 fields (`content_type`, `publish_time`, `snippet`, `quality_flags`, etc.) and keeps `date/summary` for compatibility.
- `detail` returns the same structured fields and adds `detail_text` + `evidence_blocks`.
- Date fields are normalized to `YYYY-MM-DD` when detectable.
- Results are deduplicated by `title + url`.
