# SAIP Deployment Guide

Complete guide for deploying the SAIP (Smart AI Civic Intelligence Platform) to production.

## 📋 Pre-Deployment Checklist

### Environment Setup
- [ ] Node.js 18+ installed
- [ ] Package manager (pnpm/npm) configured
- [ ] Git repository access
- [ ] Deployment platform account (Vercel/Netlify/AWS)

### Code Review
- [ ] All features tested locally
- [ ] No console errors or warnings
- [ ] All routes working correctly
- [ ] Mobile responsiveness verified
- [ ] Cross-browser compatibility checked

## 🚀 Quick Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Login to Vercel**
```bash
vercel login
```

3. **Deploy**
```bash
vercel
```

4. **Production Deployment**
```bash
vercel --prod
```

### Option 2: Netlify

1. **Install Netlify CLI**
```bash
npm install -g netlify-cli
```

2. **Build the project**
```bash
pnpm build
```

3. **Deploy**
```bash
netlify deploy --prod
```

### Option 3: Manual Deployment

1. **Build for production**
```bash
pnpm build
```

2. **Output directory**: `dist/`

3. **Upload to any static hosting service**

## 🔧 Build Configuration

### Vite Configuration
The project uses Vite with the following configuration:

```javascript
// vite.config.ts
export default {
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
  }
}
```

### Environment Variables

Create a `.env` file for production:

```env
# API Configuration (when backend is integrated)
VITE_API_URL=https://api.saip.gov.in
VITE_API_KEY=your-api-key

# Feature Flags
VITE_ENABLE_AI=true
VITE_ENABLE_OCR=true
VITE_ENABLE_MAPS=true

# Analytics
VITE_GA_ID=UA-XXXXXXXXX-X
```

## 🌐 Domain Configuration

### Custom Domain Setup

1. **Add CNAME record**
```
Type: CNAME
Name: saip
Value: your-deployment-url.vercel.app
```

2. **SSL Certificate**
Most platforms (Vercel, Netlify) provide automatic SSL certificates.

3. **Verify DNS propagation**
```bash
nslookup saip.yourdomain.gov.in
```

## 📊 Performance Optimization

### Build Optimization

1. **Code Splitting**
React Router automatically splits code by route.

2. **Asset Optimization**
```bash
# Images are optimized during build
# CSS is minified
# JavaScript is minified and tree-shaken
```

3. **Caching Strategy**
Configure headers in your hosting platform:

```
# Vercel (vercel.json)
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## 🔒 Security Configuration

### Headers Configuration

Add security headers to your deployment:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### Content Security Policy

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:;
```

## 📈 Monitoring & Analytics

### Application Monitoring

1. **Error Tracking**: Integrate Sentry or similar
```javascript
// Add to src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: import.meta.env.MODE,
});
```

2. **Analytics**: Google Analytics or Plausible
```javascript
// Add to index.html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
```

3. **Performance Monitoring**: Web Vitals
```javascript
import { onCLS, onFID, onLCP } from 'web-vitals';

onCLS(console.log);
onFID(console.log);
onLCP(console.log);
```

## 🔄 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Build
        run: pnpm build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## 🗄️ Database & Backend (Future)

### When integrating backend:

1. **API Endpoints**
```
POST /api/auth/login
POST /api/auth/register
GET /api/complaints
POST /api/complaints
PUT /api/complaints/:id
```

2. **Database Schema** (PostgreSQL/MongoDB)
- Users table
- Complaints table
- Employees table
- Departments table
- Invoices table
- Audit logs table

3. **Authentication**
- JWT tokens
- Refresh tokens
- Role-based access control (RBAC)

## 📱 PWA Configuration

### Add PWA Support

1. **Install Vite PWA Plugin**
```bash
pnpm add -D vite-plugin-pwa
```

2. **Configure in vite.config.ts**
```javascript
import { VitePWA } from 'vite-plugin-pwa'

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SAIP - Smart AI Civic Intelligence Platform',
        short_name: 'SAIP',
        description: 'GovTech platform for civic complaints',
        theme_color: '#2563EB',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ]
}
```

## 🧪 Testing Before Deployment

### Run Tests
```bash
# Unit tests (when implemented)
pnpm test

# Build test
pnpm build

# Preview production build
pnpm preview
```

### Manual Testing Checklist
- [ ] All authentication flows work
- [ ] File upload functionality works
- [ ] Signature capture works
- [ ] Charts render correctly
- [ ] Mobile navigation works
- [ ] Forms submit correctly
- [ ] Export functionality works
- [ ] 404 page displays correctly

## 🚨 Rollback Procedure

### Vercel Rollback
```bash
vercel rollback
```

### Manual Rollback
1. Keep previous build artifacts
2. Redeploy from backup
3. Update DNS if needed

## 📞 Support & Maintenance

### Health Checks
Set up monitoring for:
- Application uptime
- Page load times
- Error rates
- API response times (when backend is added)

### Regular Maintenance
- [ ] Weekly: Review error logs
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Security audit
- [ ] Yearly: Major version updates

## 🎯 Post-Deployment

### Immediate Actions
1. Verify all pages load correctly
2. Test critical user flows
3. Check analytics integration
4. Monitor error rates
5. Collect user feedback

### Documentation
- Share deployment URL with stakeholders
- Document any environment-specific configurations
- Create user guides for each portal
- Train administrators on platform usage

## 📊 Success Metrics

Track these KPIs post-deployment:
- Page load time < 2 seconds
- Time to Interactive < 3 seconds
- Error rate < 0.1%
- User satisfaction > 90%
- Complaint resolution time reduction
- Platform uptime > 99.9%

## 🔗 Useful Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Router Documentation](https://reactrouter.com/)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com/)
- [Web Vitals](https://web.dev/vitals/)

---

**Deployment Status Checklist**

- [ ] Code built successfully
- [ ] Environment variables configured
- [ ] Custom domain setup
- [ ] SSL certificate active
- [ ] Security headers configured
- [ ] Analytics integrated
- [ ] Error monitoring setup
- [ ] CI/CD pipeline configured
- [ ] Documentation complete
- [ ] Team trained

**Ready for Production!** 🚀
