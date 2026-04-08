# Chinabidding

**Mode**: 🔐 Browser · **Domain**: `www.chinabidding.com.cn`

## Commands

| Command | Description |
|---------|-------------|
| `opencli chinabidding search "<query>" --limit <n>` | Search Chinabidding notices and return normalized result rows |

## Usage Examples

```bash
opencli chinabidding search "elevator" --limit 20 -f json
opencli chinabidding search "升降机" --limit 10 -f json
```

## Notes

- This adapter extracts visible notice links from `chinabidding.com.cn`.
- The `date` field is normalized to `YYYY-MM-DD` when detectable.
- Results are deduplicated by `title + url`.
