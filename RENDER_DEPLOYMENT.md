# Render Deployment Guide for TaxiLibre

## Prerequisites

1. Render account: https://render.com (free tier available)
2. GitHub repository with TaxiLibre code
3. External services accounts (optional but recommended):
   - Google Maps API Key
   - Stripe account
   - Twilio account
   - SendGrid account

## Deployment Steps

### 1. Connect GitHub to Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Select "Build and deploy from a Git repository"
4. Connect your GitHub account
5. Select your TaxiLibre repository

### 2. Deploy Using render.yaml (Recommended)

Render supports blueprint deployment using `render.yaml`:

1. Push your `render.yaml` to your repository
2. In Render dashboard, click "New +" → "Blueprint"
3. Select your repository
4. Render will automatically create all services defined in render.yaml
5. Review and deploy

### 3. Manual Service Configuration

If you prefer manual configuration:

#### PostgreSQL Database
1. Click "New +" → "PostgreSQL"
2. Plan: Free
3. Database Name: taxilibre
4. User: taxilibre
5. Copy the Internal Database URL

#### Redis
1. Click "New +" → "Redis"
2. Plan: Free
3. Copy the Internal Redis URL

#### Backend API
1. Click "New +" → "Web Service"
2. Name: backend
3. Environment: Node
4. Plan: Free
5. Build Command: `cd backend && npm install`
6. Start Command: `cd backend && npm start`
7. Environment Variables:
   ```env
   NODE_ENV=production
   PORT=3003
   DATABASE_URL=your-postgres-url
   REDIS_URL=your-redis-url
   JWT_SECRET=your-jwt-secret
   JWT_REFRESH_SECRET=your-refresh-secret
   GOOGLE_MAPS_API_KEY=your-google-maps-key
   STRIPE_SECRET_KEY=your-stripe-secret
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   TWILIO_PHONE_NUMBER=your-twilio-phone
   SENDGRID_API_KEY=your-sendgrid-key
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email
   SMTP_PASS=your-password
   FRONTEND_URL=https://your-passenger-web.onrender.com
   ```

#### Passenger Web
1. Click "New +" → "Web Service"
2. Name: passenger-web
3. Environment: Static
4. Plan: Free
5. Build Command: `cd apps/passenger-web && npm install && npm run build`
6. Publish Directory: `apps/passenger-web/dist`
7. Environment Variables:
   ```env
   VITE_API_BASE_URL=https://your-backend.onrender.com
   VITE_SOCKET_URL=https://your-backend.onrender.com
   VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key
   VITE_STRIPE_PUBLIC_KEY=your-stripe-public-key
   VITE_ENV=production
   ```

#### Driver Web
1. Click "New +" → "Web Service"
2. Name: driver-web
3. Environment: Static
4. Plan: Free
5. Build Command: `cd apps/driver-web && npm install && npm run build`
6. Publish Directory: `apps/driver-web/dist`
7. Environment Variables (same as Passenger Web)

#### Admin Dashboard
1. Click "New +" → "Web Service"
2. Name: admin-dashboard
3. Environment: Static
4. Plan: Free
5. Build Command: `cd apps/admin-dashboard && npm install && npm run build`
6. Publish Directory: `apps/admin-dashboard/dist`
7. Environment Variables (same as Passenger Web)

### 4. Update Frontend URLs

After deployment, Render will provide URLs like:
- Backend: `https://backend-xxx.onrender.com`
- Passenger Web: `https://passenger-web-xxx.onrender.com`
- Driver Web: `https://driver-web-xxx.onrender.com`
- Admin Dashboard: `https://admin-dashboard-xxx.onrender.com`

Update the environment variables in each frontend service with the backend URL.

### 5. Run Database Migrations

1. Go to your backend service in Render
2. Click "Shell" tab
3. Run: `cd backend && npx sequelize-cli db:migrate`
4. Run: `cd backend && npx sequelize-cli db:seed:all`

### 6. Verify Deployment

1. Check each service's logs in Render dashboard
2. Test the backend health endpoint: `https://your-backend.onrender.com/api/v1/health`
3. Access each frontend URL
4. Test API endpoints
5. Verify WebSocket connections

## Free Tier Limits (Render)

- **Web Services**: Free tier spins down after 15 minutes of inactivity (takes ~30s to wake up)
- **PostgreSQL**: 90 days free, then $7/month
- **Redis**: Free tier available
- **Bandwidth**: 100GB/month free
- **Build Minutes**: 750 minutes/month free

## Troubleshooting

### Service Not Starting
- Check logs in Render dashboard
- Verify environment variables are set correctly
- Ensure build command completes successfully

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check PostgreSQL service is running
- Ensure database migrations ran

### Frontend Not Connecting to API
- Verify VITE_API_BASE_URL is correct
- Check CORS configuration in backend
- Ensure backend service is accessible

### WebSocket Issues
- Render supports WebSockets
- Ensure Socket.io is configured for production
- Check backend service is not in sleep mode

### Service Sleep Mode
- Free tier services sleep after 15 minutes inactivity
- First request takes ~30s to wake up
- Consider upgrading to paid tier for always-on services

## Custom Domains (Optional)

1. Go to service settings in Render
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as instructed
5. SSL certificate is automatic

## Monitoring

Render provides built-in monitoring:
- Metrics (CPU, memory, response time)
- Logs
- Error tracking
- Deployments history

## Cost Estimation

Free tier (monthly):
- 3 Web Services: Free
- PostgreSQL: Free (90 days)
- Redis: Free
- Total: $0/month (first 90 days), then ~$7/month for PostgreSQL

## Post-Deployment

1. Set up error tracking (Sentry integration available)
2. Configure custom domains
3. Set up backups (automatic for PostgreSQL)
4. Monitor service health
5. Review logs regularly

## Render CLI Commands

```bash
# Install CLI
npm install -g @render/cli

# Login
render login

# Deploy
render deploy

# View logs
render logs

# Open dashboard
render open
```

## Alternative: Use Render's Docker Support

For Docker-based deployment:
1. Change service type to "Docker"
2. Point to Dockerfile
3. Render will build and deploy using Docker

## Important Notes

- Free tier services sleep after inactivity
- First request after sleep takes ~30s
- Consider using a keep-alive service or upgrade for production
- Database connections persist even when web services sleep
