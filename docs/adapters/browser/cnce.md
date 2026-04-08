# Cnce

**Mode**: 🔐 Browser · **Domain**: `scm.esinochem.com`

## Commands

| Command | Description |
|---------|-------------|
| `opencli cnce search "<query>" --limit <n>` | Search CNCE procurement notices and return normalized result rows |

## Usage Examples

```bash
opencli cnce search "elevator" --limit 20 -f json
opencli cnce search "化工 电梯" --limit 10 -f json
```

## Notes

- This adapter targets the notice pages under `scm.esinochem.com`.
- The `date` field is normalized to `YYYY-MM-DD` when detectable.
- Results are deduplicated by `title + url`.
