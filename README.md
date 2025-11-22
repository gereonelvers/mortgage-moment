# Mortgage Moment 🏠

In Munich, even high earners have given up on buying a home because they assume it is impossible. However, market data shows a different reality where rents are exploding while purchase prices in commuter towns like Garching are cooling. We realized there is a specific mathematical point where buying becomes cheaper than renting. We call this the Mortgage Moment. We built this tool to show tenants this data and break their resignation.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)

[Check out the live demo 🚀](https://mortgage-moment.com/?location=Garching)

## ✨ User Journey

Mortgage Moment is a physical-to-digital intervention.
*The Trigger*: It starts with a physical demo poster (displayed on our whiteboard) featuring a QR code and the hook "72 neighbors bought here recently."
*The Reality Check*: Users scan the code and enter just three numbers: Net Income, Rent, and Equity. No login required.
*The Calculation*: Using the Interhyp Budget Calculation API, we determine exactly how much property the user can afford based on their income and equity. We compare this potential mortgage payment against their current rent to show the financial impact.
*The Solution*: We display map-based listings fetched via the ThinkInno API that fit the user's calculated budget. If they can't afford Munich, we map out alternative opportunities in high-yield areas like Chemnitz.
*Momo & Summary*: An AI voice assistant (Momo) answers questions about listings. Users can receive a detailed email summary of a property either by clicking the mail button or simply by asking Momo to "send me the info" during the call.


## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your API keys to .env

# Run the application
npm run dev
```

Visit `http://localhost:5173` to see the app in action!

## 📚 Documentation

- **[Setup Guide](./SETUP.md)** - Detailed installation and configuration instructions
- **[Environment Variables](./.env.example)** - Required API keys and configuration

## 🛠️ Tech Stack

### Frontend
- **React** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Google Maps API** - Interactive property maps

### Backend
- **Node.js + Express** - REST API server
- **Axios** - HTTP client for external APIs

### External APIs
- **ThinkImmo API** - Real estate property data
- **Interhyp API** - Mortgage affordability calculations
- **Google Maps API** - Geocoding and map visualization
- **Brevo API** - Transactional email service

## 🌐 Deployment

This application is optimized for deployment on **[Railway](https://railway.app/)**. See the [Setup Guide](./SETUP.md) for detailed deployment instructions.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

## 📦 Scripts

```bash
npm run dev        # Start development server (frontend + backend)
npm run build      # Build for production
npm run server     # Run backend server only
npm start          # Start production server
```

## 🔑 Environment Variables

Required environment variables:

- `VITE_MAPS_API_KEY` - Google Maps API key
- `VITE_BREVO_API_KEY` - Brevo email service API key
- `VITE_SENDER_EMAIL` - Email sender address
- `VITE_SENDER_NAME` - Email sender name

See [`.env.example`](./.env.example) for complete list.

## 🙏 Acknowledgments

- Property data powered by [ThinkImmo](https://thinkimmo.de/)
- Mortgage calculations by [Interhyp](https://www.interhyp.de/)
- Built during HackaTUM 2025

## Devpost

For further information and explanation of the project, please visit the [Devpost entry](https://devpost.com/software/mortgage-moment).

---

Made with ❤️ for potential homebuyers everywhere
