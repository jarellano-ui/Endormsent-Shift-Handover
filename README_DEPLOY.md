# Deployment Guide: Free Hosting Services (No Credit Card Required)

This full-stack application includes a **Node.js/Express backend (`server.ts`)** and a **Vite + React frontend**. Because of this, static-only services like **GitHub Pages** cannot run the app. You need a platform that runs Node.js or Docker.

Here are the best 100% free hosting options that **do not require any credit card** to set up:

---

## Option 1: Hugging Face Spaces (Docker Sandbox) — ⭐ Recommended
Hugging Face Spaces is 100% free, highly stable, and allows running full Docker containers without requiring any billing verification.

### How to Deploy:
1. Sign up/Log in on [Hugging Face](https://huggingface.co/).
2. Click on **Spaces** in the top navigation, and click **Create Space**.
3. Choose a name (e.g., `hcit-handover-protocol`).
4. Select **Docker** as the SDK (instead of Streamlit or Gradio).
5. Choose **Blank** (or choose a template, but Blank is perfect).
6. Set space visibility to **Public** (or Private if you prefer).
7. Under "Space Hardware", select the **Free CPU Basic (16GB RAM · 2 vCPU)** — which requires **no credit card**!
8. Click **Create Space**.
9. In your new Space, go to **Settings** > **Variables and Secrets**. Add all env variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET` (You can type any long random string for securing sessions)
10. Commit your code to your GitHub repository (ensure our `Dockerfile` is at the root directory).
11. Link your GitHub repo to your Hugging Face Space, or push the code directly to HF using their git instructions. It will build and run automatically!

---

## Option 2: Glitch (Super Fast & Simple)
Glitch is a playground for server-side Apps that supports full Node.js runtimes with zero credit cards.

### How to Deploy:
1. Log in on [Glitch.com](https://glitch.com/) with your GitHub account.
2. Click **New Project** in the top right, then choose **Import from GitHub**.
3. Paste your GitHub repository URL (e.g., `https://github.com/yourusername/reponame`).
4. Once loaded, open the `.env` file in the Glitch editor and insert your secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET`
5. Glitch runs `npm install` and your `start` script (`npm run start`) automatically. Your app is online instantly! *(Note: Free Glitch apps go to sleep if they aren't visited for 5 minutes, but wake up instantly when loaded).*

---

## Option 3: Zeabur 
Zeabur is a modern cloud deployment platform with a fully functional Hobby Tier.

### How to Deploy:
1. Log in to [Zeabur](https://zeabur.com/) via your GitHub profile.
2. Click **Create Project**, then click **Deploy Service** and choose **GitHub**.
3. Select your repository.
4. Go to the service **Config** tab and find **Environment Variables** to inject your Supabase credentials:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET`
5. Click **Deploy**. Zeabur will detect `package.json`, build the React frontend, bundle the backend, and expose it instantly. Go to **Domains** tab and click **Generate Domain** for an easy public link.

---

### Why GitHub Pages of Render Failed:
* **GitHub Pages:** Only hosts static assets (`.html`, `.js`, `.css`). It has no runtime environment to execute the Express API backend.
* **Render:** Demands valid credit details on signup for identity verification purposes even when deploying fully free instances.
