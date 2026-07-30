# 🚀 LifeFlow Cloudflare Deployment Guide

This guide walks you through deploying your **LifeFlow** application to **Cloudflare** for free. We will set up **Cloudflare Pages** for the frontend website and a **Cloudflare Worker** for the backend database sync.

---

## ⚡ Part 1: Deploy Frontend via Cloudflare Pages (Free Hosting)

Since your code is already pushed to GitHub, Cloudflare Pages can host it automatically and update it every time you push new code!

1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and sign in.
2. In the left-hand sidebar, click **Workers & Pages**.
3. Click the **Create** button, and select the **Pages** tab.
4. Click **Connect to Git**:
   - Log in using your GitHub account and authorize Cloudflare.
   - Select your repository: **`life-flow`**.
   - Click **Begin setup**.
5. Under **Build settings**:
   - Framework preset: **None**.
   - Build command: *Leave empty*.
   - Build output directory: *Leave empty* (or select root `/`).
6. Click **Save and Deploy**.
7. In 10 seconds, your site will be live on a public domain (e.g., `https://life-flow.pages.dev`)!

---

## 🛠️ Part 2: Deploy Backend via Cloudflare Workers (Edge Database)

We will deploy your Edge Worker API directly inside the browser using the Cloudflare online code editor.

1. In your Cloudflare Dashboard, go to **Workers & Pages**.
2. Click **Create**, then select the **Workers** tab.
3. Click **Create Worker**:
   - Give it a name (e.g., `lifeflow-api`).
   - Click **Deploy**.
4. Once deployed, click **Edit Code** (this opens Cloudflare's built-in web editor).
5. Open your local code file [worker.js](file:///c:/Users/prane/OneDrive/Documents/Zoom/cloudflare/worker.js) in your text editor.
6. **Copy all the code** inside `worker.js` and **paste it** into the Cloudflare web editor (replacing the default placeholder code completely).
7. Click **Save and deploy** at the top right of the editor.
8. Click the back arrow to return to your Worker dashboard, and copy your Worker's public address (e.g., `https://lifeflow-api.your-subdomain.workers.dev`).

---

## 📂 Part 3: Bind the KV Database to your Worker

We must give your Worker a database namespace to store user checklists and habits.

1. In the left-hand sidebar of your Cloudflare Dashboard, expand **Workers & Pages** and click **KV**.
2. Click **Create namespace**:
   - Enter Namespace Name: **`LIFEFLOW_KV`** (this exact name is required!).
   - Click **Add**.
3. Go back to **Workers & Pages** -> select your worker (`lifeflow-api`).
4. Go to the **Settings** tab.
5. In the settings submenu, click **Variables** (or scroll to bindings).
6. Scroll down to the **KV Namespace Bindings** section and click **Add binding**:
   - Variable Name: **`LIFEFLOW_KV`**
   - KV Namespace: Select the **`LIFEFLOW_KV`** namespace you created.
7. Click **Save and deploy** (or Save).

---

## 🔌 Part 4: Connect the Frontend to the Worker

1. Open your live app link in your browser (e.g., `https://life-flow.pages.dev`).
2. Go to the **Profile** tab on the sidebar.
3. Under **Cloud Account Sync**, click **Sign In / Sign Up**.
4. Expand **Cloudflare Edge settings** at the bottom of the pop-up modal.
5. Paste your Cloudflare Worker URL (e.g., `https://lifeflow-api.your-subdomain.workers.dev`) into the text box and click **Save & Connect**.

**🎉 Congratulations!** Your full-stack Edge app is now fully live, secure, and running on Cloudflare!
