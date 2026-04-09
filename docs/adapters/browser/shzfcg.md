# Shzfcg

**Mode**: 🔐 Browser · **Domain**: `www.zfcg.sh.gov.cn`

## Commands

| Command | Description |
|---------|-------------|
| `opencli shzfcg search "<query>" --limit <n>` | Search Shanghai government procurement notices (V2 structured contract) |
| `opencli shzfcg detail "<url>"` | Extract detail-page evidence blocks from a search URL |

## Usage Examples

```bash
opencli shzfcg search "elevator" --limit 20 -f json
opencli shzfcg search "升降机" --limit 10 -f json
opencli shzfcg detail "https://www.zfcg.sh.gov.cn/...." -f json
```

## Notes

- This adapter focuses on links under `zfcg.sh.gov.cn`.
- `search` returns V2 fields (`content_type`, `publish_time`, `snippet`, `quality_flags`, etc.) and keeps `date/summary` for compatibility.
- `detail` returns the same structured fields and adds `detail_text` + `evidence_blocks`.
- Date fields are normalized to `YYYY-MM-DD` when detectable.
- Results are deduplicated by `title + url`.
