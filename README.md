# Laurel Aesthetics

The studio app for Laurel Aesthetics, Silver Lakes Golf Estate, Pretoria East.

- **Studio side** (`/`): diary, booking requests, clients, money and receipts, SARS tax planner, stock, planner, price list and settings. Needs a staff login.
- **Client side** (`/book`): clients choose a treatment and a free time and send a booking request, and can ask the FAQ chat. No login.

It runs as an installable web app (PWA) on Vercel, with data, logins and receipt photos in Supabase. The FAQ chat can use Claude through a Supabase Edge Function.

Without Supabase settings it runs as an on-device demo with example data (`npm run dev`).

## Go-live setup (about 30 minutes, once)

### 1. Supabase (database, login, receipts)

1. Sign up at [supabase.com](https://supabase.com) and create a new project called `laurel-aesthetics`. Choose the region closest to South Africa that it offers, and save the database password somewhere safe.
2. Open **SQL Editor**, paste in all of `supabase/migrations/0001_init.sql`, then click **Run**.
3. Start a new query, paste in `supabase/seed.sql`, then click **Run**. This adds the starting price list, opening hours and FAQ answers. You can change all of them later in the app.
4. Under **Authentication → Sign In / Providers**, turn off **Allow new users to sign up**. Only accounts you create can sign in to the studio side.
5. Under **Authentication → Users**, click **Add user → Create new user**. Enter your sister's email and a password, and tick **Auto confirm user**.
6. Back in **SQL Editor**, make that account studio staff. Use her email in place of the example address:

   ```sql
   insert into public.staff (user_id)
   select id from auth.users where email = 'her-email@example.com';
   ```

7. Under **Project Settings → API**, copy the **Project URL** and the **anon / publishable key**. You need both for Vercel. The anon key is safe in the app. The security rules decide what it can reach.

### 2. Vercel (the website and app)

1. Sign up at [vercel.com](https://vercel.com) with your GitHub account.
2. Click **Add New → Project** and import the `laurel-aesthetics` repository. Vercel detects Vite automatically.
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: the Project URL from Supabase
   - `VITE_SUPABASE_ANON_KEY`: the anon key from Supabase
   - `VITE_AI_CHAT`: `off` (change it to `on` later, see step 4)
4. Click **Deploy**. You get an address like `laurel-aesthetics.vercel.app`.
5. In Supabase, go to **Authentication → URL Configuration** and set **Site URL** to that address, so password-reset emails link back to the app.

Optional: add your own domain (for example `laurelaesthetics.co.za`) under the Vercel project's **Settings → Domains**.

### 3. Put it on her phone

Open the Vercel address on her phone and sign in. Then:

- **iPhone (Safari):** tap Share, then **Add to Home Screen**.
- **Android (Chrome):** tap the menu, then **Install app**.

The client booking link is the same address with `/book` on the end. On the **Today** screen, **Copy booking link** copies it for WhatsApp, Instagram or Google.

### 4. Turn on the AI chatbot (once the wording is agreed)

1. Create an API key at [platform.claude.com](https://platform.claude.com) and add some credit.
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then run:

   ```bash
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   supabase functions deploy chat
   ```

3. In Vercel, set `VITE_AI_CHAT` to `on` and redeploy.

The bot's knowledge comes from the app itself: the price list, opening hours and FAQ answers under **Studio**. When you change those, the bot changes with them. The guardrails (no medical advice, no discounts, no card details) are in `supabase/functions/chat/index.ts`. Until it's switched on, the chat answers from the FAQ list by keyword.

## Security

- Client personal information (names, numbers, notes, bookings) can only be read by signed-in staff. Row-level security enforces this in the database, not just in the app.
- The public booking page can only read the menu and the times that are taken (with no names or treatments), and send a booking request through `request_booking`. That function checks opening hours and blocks double bookings.
- Receipt photos are in a private storage bucket, shown through short-lived links.

## Development

```bash
npm install
cp .env.example .env.local   # leave it empty to run the demo
npm run dev
```

Tests (need Playwright and Chromium):

- `tests/e2e.cjs`: the full owner and client flows in demo mode. Run it against `npm run build && npx vite preview --port 4173`.
- `tests/live-mock.cjs`: the Supabase wiring with the API mocked.
