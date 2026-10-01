# CalmStudy
    npm install && npm run dev   # mic needs HTTPS or localhost
    npm run build                # then deploy to Vercel (vercel.json handles SPA routing)
Before shipping: verify MODEL_ID in src/audio/classifier.ts (ID, labels, size, license), and add PNG icons (192/512) in /public.
