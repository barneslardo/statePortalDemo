# Okta Configuration Guide

Complete guide for setting up Okta authentication with Google social login for the State Services Portal demo.

## Table of Contents

1. [Create Okta Developer Account](#1-create-okta-developer-account)
2. [Create OIDC Application](#2-create-oidc-application)
3. [Configure Google Social Login](#3-configure-google-social-login)
4. [Configure Application Settings](#4-configure-application-settings)
5. [Get Credentials](#5-get-credentials)
6. [Test Configuration](#6-test-configuration)
7. [Troubleshooting](#troubleshooting)

---

## 1. Create Okta Developer Account

### Sign Up

1. Visit https://developer.okta.com/signup/
2. Fill in the form:
   - **Email**: Your work/personal email
   - **First Name**: Your first name
   - **Last Name**: Your last name
   - **Country**: Select your country
3. Click **Get started free**
4. Check your email for verification link
5. Click the verification link
6. Set up your Okta subdomain (e.g., `dev-12345.okta.com`)
7. Create a password

### Access Admin Console

1. After verification, you'll be logged into the Okta Admin Console
2. Your Okta domain will be displayed at the top (e.g., `dev-12345.okta.com`)
3. **Important**: Note this domain - you'll need it for configuration

---

## 2. Create OIDC Application

### Create New Application

1. In the Okta Admin Console, navigate to:
   - **Applications** → **Applications** (from left sidebar)

2. Click **Create App Integration**

3. Select application type:
   - Choose **OIDC - OpenID Connect**
   - Choose **Single-Page Application** (SPA)
   - Click **Next**

### Configure Application Settings

**General Settings:**

```
Application name: State Services Demo
```

**Grant types:**
- ✅ Authorization Code
- ✅ Refresh Token
- ⬜ Implicit (keep unchecked - not secure for SPAs)

**Sign-in redirect URIs:**

Add these URIs (one per line):
```
http://localhost:5173/callback
http://192.168.1.111:3050/callback
```

*Note: Add your production domain later when available*

**Sign-out redirect URIs:**

Add these URIs:
```
http://localhost:5173
http://192.168.1.111:3050
```

**Controlled access:**
- Select: **Allow everyone in your organization to access**

**Refresh Token:**
- Select: **Rotate token after every use** (recommended)

4. Click **Save**

### Save Important Information

After saving, note these values:

- **Client ID**: Starts with `0oa...` (e.g., `0oa8xk2bL...`)
- **Client Secret**: Not needed for SPA (public client)

---

## 3. Configure Google Social Login

### Part A: Set Up Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create or Select Project**
   - Click project dropdown at top
   - Click **New Project** or select existing
   - Name: "State Services Portal" (or your choice)

3. **Enable Google+ API** (if not already enabled)
   - Navigate to **APIs & Services** → **Library**
   - Search for "Google+ API"
   - Click **Enable**

4. **Create OAuth 2.0 Credentials**
   - Navigate to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**
   - If prompted, configure consent screen first:
     - User Type: **External**
     - App name: "State Services Portal"
     - User support email: Your email
     - Developer contact: Your email
     - Click **Save and Continue** through remaining steps

5. **Configure OAuth Client**
   - Application type: **Web application**
   - Name: "State Services Portal - Okta"

6. **Authorized JavaScript origins:**

Add your Okta domain:
```
https://dev-12345.okta.com
```
*(Replace `dev-12345` with your actual Okta domain)*

7. **Authorized redirect URIs:**

Add Okta's callback URL:
```
https://dev-12345.okta.com/oauth2/v1/authorize/callback
```
*(Replace `dev-12345` with your actual Okta domain)*

8. Click **Create**

9. **Save Credentials:**
   - Copy **Client ID** (looks like: `123456789-abc...apps.googleusercontent.com`)
   - Copy **Client Secret** (looks like: `GOCSPX-abc123...`)

### Part B: Add Google as Identity Provider in Okta

1. **In Okta Admin Console**, navigate to:
   - **Security** → **Identity Providers**

2. Click **Add Identity Provider**

3. Select **Google**

4. **Configure Google Identity Provider:**

```
Name: Google

IdP Username: idpuser.email

Filter: (leave empty - allow all domains)

Client ID: [Paste Google OAuth Client ID from Part A]

Client Secret: [Paste Google OAuth Client Secret from Part A]

Scopes: profile email openid
```

5. Click **Add Identity Provider**

### Part C: Create Routing Rule

1. Still in **Identity Providers**, you'll see your Google provider

2. Click on the **Google** provider

3. Go to **Routing Rules** tab

4. Click **Add Routing Rule**

5. **Configure rule:**

```
Rule Name: Route to Google

IF: User is accessing: [Select your State Services Demo app]

THEN: Use this identity provider: Google
```

6. Alternatively, you can configure at the app level:
   - Go to **Applications** → Your app
   - Click **Sign On** tab
   - Under **User authentication**, add routing rule

---

## 4. Configure Application Settings

### Configure Trusted Origins (Optional but Recommended)

For local development:

1. Navigate to **Security** → **API** → **Trusted Origins**

2. Click **Add Origin**

3. Add local development origin:
```
Name: Localhost Development
Origin URL: http://localhost:5173
Type: ✅ CORS ✅ Redirect
```

4. Add Blue server origin:
```
Name: Blue Server
Origin URL: http://192.168.1.111:3050
Type: ✅ CORS ✅ Redirect
```

### Configure Authorization Server

1. Navigate to **Security** → **API** → **Authorization Servers**

2. Click on **default** authorization server

3. Note the **Issuer URI**:
   ```
   https://dev-12345.okta.com/oauth2/default
   ```

4. Go to **Scopes** tab and verify these exist:
   - `openid`
   - `profile`
   - `email`

5. Go to **Access Policies** tab:
   - Ensure **Default Policy** exists
   - Click **Default Policy** → **Default Rule**
   - Verify scopes include: openid, profile, email

---

## 5. Get Credentials

### Collect Required Information

You need these three pieces of information:

**1. Client ID**
- Go to **Applications** → **Applications**
- Click on your "State Services Demo" app
- Copy the **Client ID** (starts with `0oa`)

**2. Issuer URL**
- Go to **Security** → **API** → **Authorization Servers**
- Copy the **Issuer URI** for **default**
- Format: `https://dev-12345.okta.com/oauth2/default`

**3. Okta Domain**
- Visible at top of Admin Console
- Format: `dev-12345.okta.com`

### Update .env.local

Create or update `.env.local` in your project:

```env
VITE_OKTA_CLIENT_ID=0oa8xk2bL1234567890
VITE_OKTA_ISSUER=https://dev-12345.okta.com/oauth2/default
VITE_OKTA_TESTING_DISABLEHTTPSCHECK=true
VITE_SOCURE_SDK_KEY=your_socure_key_here
```

---

## 6. Test Configuration

### Test in Okta Console

1. Go to your application in **Applications** → **Applications**

2. Go to **General** tab

3. Under **Client Credentials**, you'll see your **Client ID**

4. Click **Sign In** (if available) or use the Okta preview

### Test in Your Application

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Visit**: http://localhost:5173

3. **Click "Login with Google"**

4. **Expected flow:**
   - Redirects to Okta
   - Shows "Sign in with Google" button
   - Clicking redirects to Google
   - After Google auth, redirects back to your app
   - Shows identity verification page
   - After verification, shows services page

### Verify Token Contents

After successful login:

1. Visit any service page (Child Support, SNAP, Vehicle)

2. Scroll down to "Access Token Claims"

3. Verify you see:
   - `sub`: User ID
   - `email`: User's email
   - `name`: User's name
   - `email_verified`: true/false
   - Other standard OIDC claims

---

## 7. Troubleshooting

### Issue: "Invalid redirect URI"

**Cause**: Redirect URI in your app doesn't match Okta config

**Solution**:
1. Check the exact URL in browser when error occurs
2. Go to Okta → **Applications** → Your app → **General**
3. Under **Sign-in redirect URIs**, add the exact URL
4. Make sure to include `/callback` at the end
5. No trailing slashes

### Issue: "Google login button doesn't appear"

**Cause**: Google Identity Provider not configured or routing rule missing

**Solution**:
1. Verify Google IdP exists: **Security** → **Identity Providers**
2. Check if Google IdP is **Active** (toggle on if needed)
3. Add routing rule to direct app to Google
4. Clear browser cache and try again

### Issue: CORS errors in console

**Cause**: Trusted Origins not configured

**Solution**:
1. Go to **Security** → **API** → **Trusted Origins**
2. Add origin for your app URL
3. Enable both **CORS** and **Redirect**
4. Wait 1-2 minutes for changes to propagate

### Issue: "Client ID not found"

**Cause**: Wrong Client ID or wrong Okta domain

**Solution**:
1. Verify `VITE_OKTA_CLIENT_ID` in `.env.local`
2. Verify `VITE_OKTA_ISSUER` uses correct Okta domain
3. Check for typos or extra spaces
4. Restart dev server after changes

### Issue: "The 'state' parameter... doesn't match"

**Cause**: Browser cache or session issue

**Solution**:
1. Clear browser cache and cookies
2. Use incognito/private browsing
3. Ensure cookies are enabled
4. Try a different browser

### Issue: Login works on localhost but not on Blue server

**Cause**: Redirect URIs not configured for Blue

**Solution**:
1. Go to Okta → **Applications** → Your app
2. Add Blue redirect URIs:
   ```
   http://192.168.1.111:3050/callback
   ```
3. Add Blue to Trusted Origins
4. Rebuild and redeploy Docker container

---

## Additional Configuration

### Enable Self-Service Registration (Optional)

If you want users to sign up without Google:

1. **Security** → **General**
2. Enable **Self-service registration**
3. Configure registration flow

### Add More Identity Providers

You can add other social providers:
- **Security** → **Identity Providers** → **Add Identity Provider**
- Options: Facebook, LinkedIn, Microsoft, Apple, etc.

### Custom Authorization Server (Advanced)

For more control:
1. **Security** → **API** → **Authorization Servers**
2. Click **Add Authorization Server**
3. Configure custom scopes and claims

---

## Security Best Practices

### For Production Deployment:

1. **Use HTTPS everywhere**
   - Update all redirect URIs to use `https://`
   - Remove `VITE_OKTA_TESTING_DISABLEHTTPSCHECK` from env

2. **Implement Backend API**
   - Don't expose Socure API keys in frontend
   - Backend should generate transaction tokens

3. **Add Rate Limiting**
   - Protect login endpoints from brute force

4. **Enable MFA** (Optional)
   - **Security** → **Multifactor** → Configure factors

5. **Review Logs**
   - **Reports** → **System Log** to monitor auth events

---

## Quick Reference

### Okta Admin URLs

- **Admin Console**: https://dev-12345-admin.okta.com/admin/dashboard
- **Applications**: https://dev-12345-admin.okta.com/admin/apps/active
- **Identity Providers**: https://dev-12345-admin.okta.com/admin/access/identity-providers
- **API**: https://dev-12345-admin.okta.com/admin/api/endpoints

### Environment Variables Format

```env
VITE_OKTA_CLIENT_ID=0oa1234567890abcde
VITE_OKTA_ISSUER=https://dev-12345.okta.com/oauth2/default
VITE_OKTA_TESTING_DISABLEHTTPSCHECK=true
```

### Redirect URIs Template

```
http://localhost:5173/callback              # Local dev
http://192.168.1.111:3050/callback         # Blue server
https://yourdomain.com/callback            # Production
```

---

## Support Resources

- [Okta Developer Documentation](https://developer.okta.com/docs/)
- [Okta React SDK Guide](https://github.com/okta/okta-react)
- [OIDC/OAuth 2.0 Overview](https://developer.okta.com/docs/concepts/oauth-openid/)
- [Social Login Guide](https://developer.okta.com/docs/guides/social-login/)

---

## Next Steps

After completing this setup:

1. ✅ Okta account created
2. ✅ OIDC application configured
3. ✅ Google social login enabled
4. ✅ Credentials copied to `.env.local`
5. → Configure Socure (see README.md)
6. → Deploy to Blue (see README.md)

You're now ready to run the application!
