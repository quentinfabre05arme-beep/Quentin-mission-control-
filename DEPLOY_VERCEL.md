# 🚀 DEPLOY TO VERCEL NOW

## Step 1: Install Vercel CLI
```powershell
npm install -g vercel
```

## Step 2: Login to Vercel
```powershell
vercel login
# Opens browser - login with GitHub
```

## Step 3: Deploy
```powershell
cd C:\Users\quent\.openclaw\workspace\mission_control
vercel --prod
```

**It will ask:**
- Set up "mission_control"? [Y/n] → **Y**
- Which scope? [quentinvest] → **Enter**
- Link to existing project? [y/N] → **N**
- What's your project name? [mission-control] → **quentin-dashboard**

## Step 4: Done! 🎉

Your dashboard will be live at:
```
https://quentin-dashboard.vercel.app
```

**Access from:**
- ✅ Your phone (anywhere in the world)
- ✅ Any PC (no need for your PC to be on)
- ✅ Share with friends
- ✅ HTTPS secured

---

## 🔄 Auto-Deploy (Future Updates)

When you make changes:
```powershell
cd C:\Users\quent\.openclaw\workspace
git add -A
git commit -m "Update dashboard"
git push origin master
```

Vercel will **auto-deploy** from GitHub!

---

## ⚡ ONE-CLICK DEPLOY

```powershell
# Run all commands at once:
npm install -g vercel
vercel login
vercel --prod
```

**Or use the deploy script:**
```powershell
.\DEPLOY_DASHBOARD.bat
```

---

## 📱 Your Dashboard URL

After deploy, your URL will be:
```
https://quentin-dashboard.vercel.app
```

Bookmark it on your phone!
