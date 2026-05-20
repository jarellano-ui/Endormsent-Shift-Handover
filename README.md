---
title: Endorsement Shift Handover
emoji: 🤝
colorFrom: blue
colorTo: green
sdk: docker
app_port: 3000
pinned: false
---

# IT Endorsement & Handover Protocol

This is the official IT Endorsement Task and Monitoring Protocol for **Hello Connect**.

## Local Development

To run this application locally:

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

The server runs on http://localhost:3000

## Deploying to Hugging Face Spaces (Docker SDK)

This Space is configured to deploy automatically from GitHub using **GitHub Actions**.

### Required Environment Variables / Secrets (under Space Settings):
- `SUPABASE_URL`: Your Supabase database endpoint.
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase security key.
- `SESSION_SECRET`: A secure random password string used to sign cookies.
