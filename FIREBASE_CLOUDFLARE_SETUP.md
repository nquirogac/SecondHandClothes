# Firebase local setup

This guide is only for running the project locally. It covers:

- Firebase Auth for login.
- Firebase Admin credentials for the backend.
- Cloudflare Turnstile for local captcha verification.
- Running the React app and Express server on your machine.

## What you need

1. A Firebase project.
2. A Cloudflare Turnstile widget.
3. Node.js installed locally.
4. This repository opened in VS Code.

## Step 1: Create the Firebase project

1. Open the Firebase console and create a new project.
2. Give it a name, for example `SecondHandClothes`.
3. Keep Google Analytics disabled if you want the simplest setup.

## Step 2: Enable Authentication

1. Open `Build > Authentication`.
2. Click `Get started`.
3. Enable `Email/Password`.
4. Enable `Google` if you want the Google login button.
5. Add `localhost` and `127.0.0.1` to the authorized domains list.

## Step 3: Create the Firebase web app

1. In Firebase, add a new web app.
2. Copy the web config values.
3. Put them in your local `.env` file using the `VITE_FIREBASE_*` variables.

You can use the template in `.env.example` or copy `.env.local.example` to `.env`.

## Step 4: Create the Firebase Admin credentials for the backend

1. Go to Firebase Console > Project settings > Service accounts.
2. Click `Generate new private key`.
3. Download the JSON file.
4. For local development, load the JSON content into `FIREBASE_SERVICE_ACCOUNT_JSON`.

The backend uses this to verify Firebase ID tokens on each request.

## Step 5: Configure Cloudflare Turnstile

1. Open Cloudflare and go to Turnstile.
2. Create a new widget.
3. Add `localhost` and `127.0.0.1` as allowed domains.
4. Copy the site key into `VITE_TURNSTILE_SITE_KEY`.
5. Copy the secret key into `TURNSTILE_SECRET_KEY` so the backend can verify the captcha token.
6. Keep the secret key only on the server side, never in the browser.

## Step 6: Run the app locally

1. Install dependencies with `npm install`.
2. Create a `.env` file from `.env.local.example`.
3. Fill the Firebase values, `VITE_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and `FIREBASE_SERVICE_ACCOUNT_JSON`.
4. Run `npm run dev`.

If Firebase is configured, the login modal uses the real auth flow.
If it is not configured, the project still works in demo mode.

## Step 7: What the login flow does locally

1. The user signs in through Firebase Auth.
2. Firebase returns an ID token to the browser.
3. The frontend sends that token in the `Authorization: Bearer <token>` header.
4. The backend validates the token using Firebase Admin.
5. The backend uses the token identity as the active marketplace user.

## Local PowerShell example

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_JSON = Get-Content .\service-account.json -Raw
$env:TURNSTILE_SECRET_KEY = "tu_secret_aqui"
$env:VITE_TURNSTILE_SITE_KEY = "tu_sitekey_aqui"
npm run dev
```

## Practical notes

- Use Firebase for the identity layer, not for your custom marketplace data in this repo.
- The backend verifies the Turnstile token before allowing login or register requests.
- If the Firebase or Turnstile values are missing, the demo fallback still works for local testing.