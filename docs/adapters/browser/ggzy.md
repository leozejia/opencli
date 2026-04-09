# Ggzy

**Mode**: 🔐 Browser · **Domain**: `www.ggzy.gov.cn`

## Commands

| Command | Description |
|---------|-------------|
| `opencli ggzy search "<query>" --limit <n>` | Search GGZY public resource notices (V2 structured contract) |
| `opencli ggzy detail "<url>"` | Extract detail-page evidence blocks from a search URL |

## Usage Examples

```bash
opencli ggzy search "elevator" --limit 20 -f json
opencli ggzy search "防爆电梯" --limit 10 -f json
opencli ggzy detail "https://www.ggzy.gov.cn/...." -f json
```

## Notes

- This adapter extracts visible notice links from `ggzy.gov.cn`.
- `search` returns V2 fields (`content_type`, `publish_time`, `snippet`, `quality_flags`, etc.) and keeps `date/summary` for compatibility.
- `detail` returns the same structured fields and adds `detail_text` + `evidence_blocks`.
- Date fields are normalized to `YYYY-MM-DD` when detectable.
- Results are deduplicated by `title + url`.
