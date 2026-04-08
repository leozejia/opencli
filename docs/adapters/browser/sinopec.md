# Sinopec

**Mode**: 🔐 Browser · **Domain**: `bidding.epec.com`

## Commands

| Command | Description |
|---------|-------------|
| `opencli sinopec search "<query>" --limit <n>` | Search Sinopec tender notices and return normalized result rows |

## Usage Examples

```bash
opencli sinopec search "elevator" --limit 20 -f json
opencli sinopec search "防爆电梯" --limit 10 -f json
```

## Notes

- This adapter probes multiple entry URLs and query-key variants.
- The `date` field is normalized to `YYYY-MM-DD` when detectable.
- Results are deduplicated by `title + url`.
