# UI Validator - Deployment Guide

## Architecture

- **Frontend**: React + Vite → Deployed on **Vercel**
- **Backend API**: Express + Playwright → Deployed on **Railway**

---

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### 1.2 Deploy API
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Connect your GitHub account
4. Select your repository
5. Click **"Add variables"** and set:
   - `PORT` = `3001`
   - `FRONTEND_URL` = `https://your-vercel-app.vercel.app` (add after Vercel deploy)

### 1.3 Configure Build
In Railway dashboard:
- **Root Directory**: `api`
- **Build Command**: `npm install && npx playwright install chromium --with-deps`
- **Start Command**: `node index.js`

### 1.4 Get Railway URL
After deployment, copy your Railway URL (e.g., `https://ui-validator-api.railway.app`)

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub

### 2.2 Deploy Frontend
1. Click **"Add New Project"**
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (root)
   - **Build Command**: `npm run build:react`
   - **Output Directory**: `dist`

### 2.3 Add Environment Variables
In Vercel project settings → Environment Variables:
```
VITE_API_URL = https://your-railway-app.railway.app
```

### 2.4 Redeploy
After adding environment variables, trigger a new deployment.

---

## Step 3: Update Railway CORS

Go back to Railway and update:
```
FRONTEND_URL = https://your-vercel-app.vercel.app
```

---

## Verification

1. Open your Vercel URL
2. Go to **Locators** tab
3. Enter a URL and click **Extract**
4. Locators should appear!

---

## Local Development

```bash
# Install dependencies
npm install

# Run both frontend and API
npm run dev

# Frontend: http://localhost:5174
# API: http://localhost:3001
```

---

## Troubleshooting

### CORS Errors
- Ensure `FRONTEND_URL` is set correctly in Railway
- Check that `VITE_API_URL` doesn't have trailing slash

### Playwright Errors on Railway
- Use the Dockerfile in `/api` folder
- Or set build command: `npm install && npx playwright install chromium --with-deps`

### API Not Responding
- Check Railway logs for errors
- Ensure PORT environment variable is set

---

## Alternative: Deploy with Docker

```bash
cd api
docker build -t ui-validator-api .
docker run -p 3001:3001 ui-validator-api
```

---

## URLs After Deployment

- **Frontend**: `https://ui-validator.vercel.app`
- **API**: `https://ui-validator-api.railway.app`

Update these in your LinkedIn post! 🚀
