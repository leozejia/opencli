# Chinabidding

**Mode**: 🔐 Browser · **Domain**: `www.chinabidding.com.cn`

## Commands

| Command | Description |
|---------|-------------|
| `opencli chinabidding search "<query>" --limit <n>` | Search Chinabidding notices (V2 structured contract) |
| `opencli chinabidding detail "<url>"` | Extract detail-page evidence blocks from a search URL |

## Usage Examples

```bash
opencli chinabidding search "elevator" --limit 20 -f json
opencli chinabidding search "升降机" --limit 10 -f json
opencli chinabidding detail "https://www.chinabidding.com.cn/...." -f json
```

## Notes

- This adapter extracts visible notice links from `chinabidding.com.cn`.
- `search` returns V2 fields (`content_type`, `publish_time`, `snippet`, `quality_flags`, etc.) and keeps `date/summary` for compatibility.
- `detail` returns the same structured fields and adds `detail_text` + `evidence_blocks`.
- Date fields are normalized to `YYYY-MM-DD` when detectable.
- Results are deduplicated by `title + url`.
