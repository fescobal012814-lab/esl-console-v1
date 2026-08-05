# ESL Console

A booking / feedback / billing console for ESL tutoring, built with React + Tailwind.

## Running locally (optional, only if you want to preview before deploying)
```
npm install
npm run dev
```

## Deploying
See the deployment guide provided separately. Short version:
1. Push this whole folder to a new GitHub repository.
2. Go to vercel.com, sign in with GitHub, "Add New Project", pick this repo.
3. Vercel auto-detects Vite — just click Deploy.

## Known limitation
This version stores all data (students, bookings, payments) only in the browser's memory for
that one session/device. Nothing is saved to a shared database yet, so different people opening
the site (or the same person on a different device) will NOT see each other's data. That's a
planned next step, not a bug.
