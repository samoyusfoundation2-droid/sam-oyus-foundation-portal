# SOF Vercel Preview Deployment

1. Upload these project files to the GitHub repository:
   `samoyusfoundation2-droid/sam-oyus-foundation-portal`
2. In Vercel choose **Add New → Project** and import the repository.
3. Framework Preset: **Other**
4. Root Directory: `.`
5. Install Command: `npm install`
6. Build Command: leave blank unless Vercel requests one.
7. Start Command: not required for the Vercel serverless entrypoint.
8. Add environment variables in Vercel:
   - `SESSION_SECRET`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
9. Deploy and test the generated `.vercel.app` preview.
10. Do not connect `www.samoyusfoundation.org` until the preview passes testing.

Production warning: persistent KYC, donor, financial, and uploaded-document data should be moved to managed production database/object storage before public launch.
