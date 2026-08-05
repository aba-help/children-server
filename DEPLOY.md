# Render.com Deployment Instructions

## Deployment Steps

### 1. Preparation

1. Make sure all changes are committed to git
2. Verify that `render.yaml` file exists

### 2. Deploy to Render.com

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository (or use public URL)
4. Settings:
   - **Name**: children-server
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (for testing)

### 3. Environment Variables

In the "Environment" section add:

- `NODE_ENV` = `production`
- `DATABASE_URL` = (External Database URL из Render Postgres, например) `postgresql://children_server_db_user:PASSWORD@dpg-d6fgan7gi27c73culhkg-a.frankfurt-postgres.render.com/children_server_db`
- `PORT` = `10000` (Render will assign port automatically)
- `WEBPAY_STORE_ID` = `411156299`
- `WEBPAY_SECRET_KEY` = `Alc913!@#XyZ529`
- `WEBPAY_API_URL` = `https://sandbox.webpay.by`
- `PRODUCTION_URL` = `https://children-server.onrender.com` (or your Render URL)
- `SUPER_ADMIN_EMAILS` = comma-separated emails (e.g. `ryurov@scnsoft.com`) — these users get full access and no payment UI in the app

### 4. After Deployment

1. Wait for successful deployment
2. Copy your service URL (e.g.: `https://children-server.onrender.com`)
3. Update `PRODUCTION_URL` in Render environment variables
4. Add to sandbox.webpay.by dashboard:
   ```
   https://children-server.onrender.com/api/payment/callback
   ```

### 5. Update Application

В приложении (children-app-rn) в `src/consts/consts.ts` и `src/services/authService.ts` указан production URL `https://children-server.onrender.com`. Сборка для Google Play использует его автоматически.

## Verification

After deployment check:
- Server responds: `curl https://your-server.onrender.com/login`
- Callback URL works: add to webpay.by and test payment
