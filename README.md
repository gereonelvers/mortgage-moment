# Mortgage Moment 🏠

A modern, intelligent mortgage affordability calculator with interactive property search. Find your dream home and understand what you can afford with real-time calculations powered by industry-leading APIs.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)

## ✨ Features

- 🏠 **Smart Property Search** - Browse real estate listings with live data from ThinkImmo API
- 💰 **Accurate Affordability Calculator** - Professional mortgage calculations via Interhyp API
- 🗺️ **Interactive Maps** - Visualize properties on Google Maps with color-coded affordability indicators
- 📊 **Detailed Financial Reports** - Comprehensive breakdown of loan terms, interest rates, and additional costs
- 📧 **Email Integration** - Share property details via Brevo email service
- 🎯 **Smart Filtering** - Properties automatically sorted to show affordable options first
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices

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

---

Made with ❤️ for homebuyers everywhere
