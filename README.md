# Grill N Chill (Next.js)

Multi-location frontend for **Grill N Chill**, powered by the Digitallisbon Restaurant API. Built from the thainmaki.pt storefront with location switching for restaurant IDs 2, 3, and 4.

## Configuration

Copy `.env.example` to `.env` / `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://restaurant.digitallisbon.pt/api
NEXT_PUBLIC_RESTAURANT_ID1=2
NEXT_PUBLIC_RESTAURANT_ID2=3
NEXT_PUBLIC_RESTAURANT_ID3=4
NEXT_PUBLIC_RESTAURANT_NAME_PREFIX=Grill N Chill
NEXT_PUBLIC_SITE_URL=https://grillnchill.pt
```

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3004](http://localhost:3004).

## Features

- **Location hub** on `/` — pick Praça do Chile, Intendente, or Bakery
- **Menu / book / checkout** scoped to the active location
- **Owner dashboard** overview across all configured venues
- Auth, Stripe, Pusher, and web push from the Digitallisbon platform
