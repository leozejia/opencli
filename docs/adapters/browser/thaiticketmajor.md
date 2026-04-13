# ThaiTicketMajor

**Mode**: 🔐 Browser · **Domain**: `thaiticketmajor.com`

## Commands

| Command | Description |
|---------|-------------|
| `opencli thaiticketmajor search "<query>" --limit <n>` | Search public event cards on the main site |
| `opencli thaiticketmajor detail "<event-url>"` | Read event detail, show times, price tiers and booking entry |
| `opencli thaiticketmajor session` | Inspect the current browser session stage |
| `opencli thaiticketmajor queue "<url>" --show "<label>" --wait` | Observe countdown / waiting-room / queue progress |
| `opencli thaiticketmajor zones "<booking-url>"` | List seating zones on the booking page |
| `opencli thaiticketmajor hold "<booking-url>" --zone "<pattern>" --quantity <n>` | Try to select a zone and hold seats with retry logic |
| `opencli thaiticketmajor checkout "<checkout-url>" --payment alipay --delivery venue-pickup` | Prepare checkout by selecting payment and delivery options |

## Usage Examples

```bash
opencli thaiticketmajor search "man with a mission" --limit 5 -f json
opencli thaiticketmajor detail "https://www.thaiticketmajor.com/concert/example.html" -f json
opencli thaiticketmajor session -f json
opencli thaiticketmajor queue "https://www.thaiticketmajor.com/concert/example.html" --show "2026-05-01 19:00" --wait -f json
opencli thaiticketmajor zones "https://booking.thaiticketmajor.com/show/example" -f json
opencli thaiticketmajor hold "https://booking.thaiticketmajor.com/show/example" --zone "Zone A" --quantity 2 --retry 5 -f json
opencli thaiticketmajor checkout "https://booking.thaiticketmajor.com/show/example" --payment alipay --delivery venue-pickup --confirm false -f json
```

## Prerequisites

- Chrome running with the [Browser Bridge extension](/guide/browser-bridge)
- A valid ThaiTicketMajor login session for booking flows
- For queue-heavy launches, a stable Thai / Southeast Asia IP is often required

## Coverage

This adapter is designed to cover the core QP flow:

1. `Enter Site`
2. Login page / human verification stop point
3. Event detail and show list discovery
4. Countdown page and Queue-it waiting room
5. Zone map and seat map entry
6. Seat hold retries and optional zone fallback
7. Payment method + venue pickup selection

## Important Limits

- Captcha / image verification is **not** bypassed automatically. Commands stop and report the blocking state.
- Access-restricted / gatekeeper pages are surfaced explicitly with IP hints.
- `checkout` defaults to **not** performing the final payment confirmation. Use this adapter as a human-in-the-loop helper, not an unattended auto-purchase bot.

