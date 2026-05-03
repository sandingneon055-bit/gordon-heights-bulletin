# 🚀 Deployment Guide – Barangay Gordon Heights Bulletin System

This guide will get your system hosted online for FREE using:
- **GitHub** (stores your code)
- **Render** (runs your app 24/7)

Estimated time: 15–20 minutes

---

## STEP 1 — Create a GitHub Account
1. Go to https://github.com
2. Click **Sign Up** and create a free account
3. Verify your email

---

## STEP 2 — Upload Your Project to GitHub
1. Go to https://github.com/new
2. Repository name: `gordon-heights-bulletin`
3. Set to **Public**
4. Click **Create repository**
5. On the next page, click **uploading an existing file**
6. Drag and drop ALL files from your `gordon-heights` folder:
   - app.py
   - requirements.txt
   - render.yaml
   - Procfile
   - README.md
   - The entire `templates/` folder
   - The entire `static/` folder
   - The entire `data/` folder
7. Click **Commit changes**

---

## STEP 3 — Create a Render Account
1. Go to https://render.com
2. Click **Get Started for Free**
3. Sign up using your **GitHub account** (easiest)

---

## STEP 4 — Deploy on Render
1. On your Render dashboard, click **+ New** → **Web Service**
2. Click **Connect a repository**
3. Select your `gordon-heights-bulletin` repository
4. Fill in the settings:
   - **Name:** gordon-heights-bulletin
   - **Region:** Singapore (closest to Philippines)
   - **Branch:** main
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
5. Under **Instance Type** → select **Free**
6. Click **Create Web Service**

---

## STEP 5 — Wait for Deployment
- Render will build and deploy your app (takes 2–5 minutes)
- You'll see logs showing the build progress
- When it says **"Your service is live"** — you're done! ✅

---

## STEP 6 — Get Your URL
Your app will be live at:
```
https://gordon-heights-bulletin.onrender.com
```
You can share this link with anyone — it works on any device, anywhere! 📱💻

---

## STEP 7 — (Optional) Connect a Custom Domain
If you buy a domain like `gordonapp.com`:
1. In Render → go to your service → **Settings** → **Custom Domains**
2. Click **Add Custom Domain**
3. Enter your domain (e.g. `gordonapp.com`)
4. Render will give you DNS settings to add in your domain registrar

---

## ⚠️ Important Notes

### Free Tier Limitations (Render)
- App **sleeps after 15 minutes** of inactivity
- First load after sleep takes ~30 seconds to wake up
- To avoid this → upgrade to Render's Starter plan ($7/month)

### Data Persistence
- The free tier uses the filesystem for `db.json`
- Data **may reset** when the server restarts on free tier
- For permanent data → upgrade or switch to a free database like **Supabase** or **PlanetScale**

### Admin Login
- Email: admin@gordonheights.gov.ph
- Password: admin123
- **Change the password after deploying!**

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Build fails | Check that `requirements.txt` is in root folder |
| App crashes | Check Render logs for error messages |
| Can't login | Make sure `data/db.json` was uploaded to GitHub |
| Site loads but blank | Check browser console for errors |

---

## 📞 Need Help?
- Render Docs: https://render.com/docs
- Flask Docs: https://flask.palletsprojects.com
