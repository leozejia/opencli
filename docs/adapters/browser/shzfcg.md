# Shzfcg

**Mode**: 🔐 Browser · **Domain**: `www.zfcg.sh.gov.cn`

## Commands

| Command | Description |
|---------|-------------|
| `opencli shzfcg search "<query>" --limit <n>` | Search Shanghai government procurement notices and return normalized result rows |

## Usage Examples

```bash
opencli shzfcg search "elevator" --limit 20 -f json
opencli shzfcg search "升降机" --limit 10 -f json
```

## Notes

- This adapter focuses on links under `zfcg.sh.gov.cn`.
- The `date` field is normalized to `YYYY-MM-DD` when detectable.
- Results are deduplicated by `title + url`.
