# Cnce

**Mode**: 🔐 Browser · **Domain**: `scm.esinochem.com`

## Commands

| Command | Description |
|---------|-------------|
| `opencli cnce search "<query>" --limit <n>` | Search CNCE procurement notices (V2 structured contract) |
| `opencli cnce detail "<url>"` | Extract detail-page evidence blocks from a search URL |

## Usage Examples

```bash
opencli cnce search "elevator" --limit 20 -f json
opencli cnce search "化工 电梯" --limit 10 -f json
opencli cnce detail "https://scm.esinochem.com/...." -f json
```

## Notes

- This adapter targets the notice pages under `scm.esinochem.com`.
- `search` returns V2 fields (`content_type`, `publish_time`, `snippet`, `quality_flags`, etc.) and keeps `date/summary` for compatibility.
- `detail` returns the same structured fields and adds `detail_text` + `evidence_blocks`.
- Date fields are normalized to `YYYY-MM-DD` when detectable.
- Results are deduplicated by `title + url`.
