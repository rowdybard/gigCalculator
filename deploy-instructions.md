# 🚀 Deploy to Render - Step by Step

## Prerequisites
- GitHub account
- Render account (free tier available)

## Step 1: Push to GitHub

1. **Initialize Git** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Gig Worker Pay Calculator"
   ```

2. **Create GitHub Repository**:
   - Go to [GitHub.com](https://github.com)
   - Click "New repository"
   - Name it `gig-calculator` (or your preferred name)
   - Make it public or private
   - Don't initialize with README (we already have one)

3. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/gig-calculator.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Deploy on Render

1. **Sign up/Login to Render**:
   - Go to [render.com](https://render.com)
   - Sign up with GitHub (recommended)

2. **Create New Web Service**:
   - Click "New +"
   - Select "Web Service" (for authentication features)
   - Connect your GitHub repository
   - Select the `gig-calculator` repository

3. **Configure the Service**:
   - **Name**: `gig-calculator` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or choose paid if needed)

4. **Deploy**:
   - Click "Create Web Service"
   - Render will automatically deploy your site
   - Wait for the build to complete (usually 1-2 minutes)

## Step 3: Custom Domain (Optional)

1. **Add Custom Domain**:
   - In your Render dashboard, go to your service
   - Click "Settings" tab
   - Scroll to "Custom Domains"
   - Add your domain (e.g., `calculator.yourdomain.com`)

2. **Configure DNS**:
   - Add a CNAME record pointing to your Render URL
   - Wait for DNS propagation (up to 24 hours)

## Step 4: Verify Deployment

1. **Test Your Site**:
   - Visit your Render URL (e.g., `https://gig-calculator.onrender.com`)
   - Test all calculator functions
   - Check mobile responsiveness

2. **Share Your Calculator**:
   - Share the URL with other gig workers
   - Test the share link functionality

## Troubleshooting

### Common Issues:

1. **Build Fails**:
   - Check that all files are committed to GitHub
   - Ensure `index.html` is in the root directory
   - Verify `package.json` is present

2. **Site Not Loading**:
   - Check Render logs for errors
   - Ensure the service is running (not suspended)
   - Verify the URL is correct

3. **Calculator Not Working**:
   - Check browser console for JavaScript errors
   - Ensure all CDN links are accessible
   - Test in different browsers

### Performance Tips:

1. **Enable Caching**:
   - Render automatically caches static assets
   - No additional configuration needed

2. **Monitor Usage**:
   - Check Render dashboard for usage statistics
   - Free tier has limits (750 hours/month)

## Alternative Deployment Options

If Render doesn't work for you, consider:

- **Netlify**: Similar static site hosting
- **Vercel**: Great for static sites
- **GitHub Pages**: Free hosting for public repos
- **Firebase Hosting**: Google's hosting solution

## Support

If you need help:
1. Check Render's documentation
2. Review the README.md file
3. Check GitHub issues (if any)
4. Contact Render support

---

Your gig calculator should now be live and accessible to gig workers worldwide! 🎉
