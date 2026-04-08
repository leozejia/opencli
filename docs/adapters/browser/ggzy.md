# Ggzy

**Mode**: 🔐 Browser · **Domain**: `www.ggzy.gov.cn`

## Commands

| Command | Description |
|---------|-------------|
| `opencli ggzy search "<query>" --limit <n>` | Search GGZY public resource notices and return normalized result rows |

## Usage Examples

```bash
opencli ggzy search "elevator" --limit 20 -f json
opencli ggzy search "防爆电梯" --limit 10 -f json
```

## Notes

- This adapter extracts visible notice links from `ggzy.gov.cn`.
- The `date` field is normalized to `YYYY-MM-DD` when detectable.
- Results are deduplicated by `title + url`.
