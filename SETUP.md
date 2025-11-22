# Mortgage Moment - Setup Guide

A modern mortgage affordability calculator with interactive property search powered by real-time data from ThinkImmo and Interhyp APIs.

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** or **yarn**
- **Google Maps API Key** (for map functionality)
- **Brevo API Key** (for email notifications)

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd mortgage-moment
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the environment template and configure your API keys:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
# Required
VITE_MAPS_API_KEY=your_google_maps_api_key
VITE_BREVO_API_KEY=your_brevo_api_key
VITE_SENDER_EMAIL="noreply@mortgage-moment.com"
VITE_SENDER_NAME="Mortgage Moment"

# Optional
OPENAI_API_KEY=your_openai_api_key
PORT=3001
```

#### Getting API Keys

**Google Maps API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Geocoding API
4. Create credentials (API Key)
5. Restrict the API key to your domain for production

**Brevo API Key:**
1. Sign up at [Brevo](https://www.brevo.com/)
2. Go to SMTP & API → API Keys
3. Create a new API key
4. Copy the key to your `.env` file

### 4. Run the Application

#### Development Mode (Frontend + Backend)

```bash
# Start the full application (frontend and backend)
npm run dev
```

This will start:
- Frontend dev server on `http://localhost:5173`
- Backend API server on `http://localhost:3001`

#### Backend Only

```bash
npm run server
```

Backend API will be available at `http://localhost:3001`

#### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

## Project Structure

```
mortgage-moment/
├── src/                    # Frontend source code
│   ├── pages/             # React page components
│   │   ├── LandingPage.jsx
│   │   ├── MapPage.jsx
│   │   └── PropertyPage.jsx
│   ├── App.jsx            # Main app component
│   └── main.jsx           # Entry point
├── server/                # Backend source code
│   └── index.js           # Express server
├── public/                # Static assets
│   └── properties.min.json # Fallback property data
├── scripts/               # Utility scripts
├── .env                   # Environment variables (create from .env.example)
└── package.json           # Dependencies and scripts
```

## API Integrations

The application integrates with several external APIs:

1. **ThinkImmo API** - Property listings data
2. **Interhyp API** - Mortgage affordability calculations
3. **Google Maps API** - Interactive property maps
4. **Brevo API** - Email notifications

## Deployment

### Railway Deployment

This application is designed to be deployed on [Railway](https://railway.app/).

#### Deployment Steps

1. **Install Railway CLI** (optional):
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Initialize Railway Project**:
   ```bash
   railway init
   ```

4. **Set Environment Variables**:
   
   Via Railway Dashboard:
   - Go to your project → Variables
   - Add all required environment variables from `.env.example`

   Or via CLI:
   ```bash
   railway variables set VITE_MAPS_API_KEY=your_key
   railway variables set VITE_BREVO_API_KEY=your_key
   railway variables set VITE_SENDER_EMAIL="noreply@mortgage-moment.com"
   railway variables set VITE_SENDER_NAME="Mortgage Moment"
   ```

5. **Deploy**:
   ```bash
   railway up
   ```

#### Railway Configuration

Railway will automatically:
- Detect the Node.js application
- Run `npm install` to install dependencies
- Run `npm run build` to build the application
- Start the server with `npm start`

Make sure your `package.json` has the correct start script:

```json
{
  "scripts": {
    "start": "node server/index.js",
    "dev": "vite",
    "build": "vite build",
    "server": "node server/index.js"
  }
}
```

#### Custom Domain (Optional)

1. Go to your Railway project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

## Troubleshooting

### Common Issues

**Maps not loading:**
- Verify `VITE_MAPS_API_KEY` is set correctly
- Check that Maps JavaScript API and Geocoding API are enabled in Google Cloud Console
- Check browser console for API key errors

**Email not sending:**
- Verify `BREVO_API_KEY` is set correctly
- Check Brevo dashboard for API usage limits
- Verify sender email is verified in Brevo

**Properties not loading:**
- Check backend server is running on port 3001
- Verify ThinkImmo API is accessible
- Check `public/properties.min.json` exists as fallback

**Port already in use:**
```bash
# Find process using port 3001
lsof -i :3001
# Kill the process
kill -9 <PID>
```
