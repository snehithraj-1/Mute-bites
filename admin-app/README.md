# Vit: Mute Bites Admin Management Portal

Central administrative console for managing live food orders, restaurant status, dishes/menus, student accounts, and system controls for VIT-AP University campus dining.

---

## 🚀 Deploying Standalone to Vercel

If you want a dedicated URL for the Admin Portal (e.g., `clg-bites-admin.vercel.app`), deploy this directory directly to Vercel:

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** > **Project**.
3. Import the `snehithraj-1/clg-bites-srm` repository.
4. In the configuration screen:
   - **Root Directory**: Click *Edit* and choose **`admin-app`**.
   - **Framework Preset**: `Vite` (auto-detected).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Deploy**.

> **Note**: No environment variables are required! The portal is pre-configured with reverse-proxy rules in `vercel.json` and client fallbacks in `src/main.jsx` that automatically connect to the live backend at `https://clg-bites-srm.vercel.app`.

---

## 🔑 Administrator Credentials

- **Super Admin Email**: `collagebites1@gmail.com`
- **Password**: `Clgbites123`

---

## ⚡ Unified Access (Default Deployment)

The admin portal is also integrated into the main deployment at:
- **Live Student Portal**: [https://clg-bites-srm.vercel.app/](https://clg-bites-srm.vercel.app/)
- **Live Integrated Admin**: [https://clg-bites-srm.vercel.app/admin](https://clg-bites-srm.vercel.app/admin)
