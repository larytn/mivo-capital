# Mivo Capital

The launch workspace focuses on four areas:

- Backtesting Lab for historical market replay.
- Trade Journal for manual entries and MT5 trade sync.
- Community posts and discussions, including VIP Signals.
- One shared Trader Chat.

Fund Management, Copy Trading, and Mivo Academy remain in the codebase for later releases. Their pages and APIs are hidden in this launch build. Real Estate is also hidden until it is included in a release scope.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the required values.
3. Apply the pending database migrations with `npx prisma migrate deploy`.
4. Start the app with `npm run dev` and open [http://localhost:3000](http://localhost:3000).

The production build runs `prisma generate && next build`.

## Environment variables

Required for the launch services:

- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: private signing key for member and admin sessions. Set a strong, unique value in production.
- `META_API_TOKEN`: MetaApi token for connecting and syncing MT5 accounts.
- `CRON_SECRET`: secret used by Vercel's scheduled MT5 sync endpoint.

Optional integrations:

- `TWELVE_DATA_API_KEY`: additional historical candle source; the app has other market data sources where available.
- `OPENAI_API_KEY`: community post moderation. Without it, submitted posts stay private for admin review.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: image and chat media uploads. Built-in chat content remains available without uploads.
- `NEXT_PUBLIC_APP_URL`: public site URL used to generate account links.

Never commit `.env.local` or real secret values. The public Supabase CA used for verified TLS is stored at `prisma/certs/supabase-prod-ca-2021.crt`.

## Vercel deployment

Add the required variables in the Vercel project settings for each environment. The Hobby-safe MT5 sync schedule runs once daily at 03:00 UTC; members can also request a sync from the MT5 Journal Sync page. See Vercel's [cron usage and pricing limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Apply database migrations before sending members to the deployment. With a Git-connected Vercel project, pushing the approved release to its production branch starts a deployment. The Git repository is `https://github.com/larytn/mivo-capital`.

## Community review

Member Market Analysis and Discussion posts are reviewed before publication. Clearly suitable posts may publish immediately when the moderation integration is configured. Posts requiring review stay private in the admin queue. External links in post text are blocked; members can add a validated TradingView chart link in its dedicated field.
