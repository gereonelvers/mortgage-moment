import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from root .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Load data
const DATA_FILE = path.join(__dirname, '../public/properties.min.json');
let properties = [];

try {
    if (fs.existsSync(DATA_FILE)) {
        console.log(`Loading properties from ${DATA_FILE}...`);
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        properties = JSON.parse(rawData);
        console.log(`Loaded ${properties.length} properties.`);
    } else {
        // Fallback to dist folder (production)
        const DIST_DATA_FILE = path.join(__dirname, '../dist/properties.min.json');
        if (fs.existsSync(DIST_DATA_FILE)) {
            console.log(`Loading properties from ${DIST_DATA_FILE}...`);
            const rawData = fs.readFileSync(DIST_DATA_FILE, 'utf8');
            properties = JSON.parse(rawData);
            console.log(`Loaded ${properties.length} properties.`);
        } else {
            console.warn(`Data file not found at ${DATA_FILE} or ${DIST_DATA_FILE}. Please run 'npm run preprocess' first.`);
        }
    }
} catch (error) {
    console.error("Error loading properties:", error);
}

// Helper to fetch max buying power from Interhyp
const fetchMaxBuyingPower = async (income, equity, debts) => {
    try {
        const monthlyIncome = parseFloat(income) || 0;
        const monthlyDebts = parseFloat(debts) || 0;
        const equityCash = parseFloat(equity) || 0;

        // Estimate monthly rate available for mortgage (e.g., 35% of net income minus debts)
        const monthlyRate = Math.max(0, (monthlyIncome - monthlyDebts) * 0.35);

        if (monthlyRate <= 0) return null;

        const response = await axios.post('https://www.interhyp.de/customer-generation/budget/calculateMaxBuyingPower', {
            "monthlyRate": monthlyRate,
            "equityCash": equityCash,
            "federalState": "DE-BY", // Default to Bayern
            "amortisation": 2.0,
            "fixedPeriod": 10,
            "salary": monthlyIncome,
            "additionalLoan": 0, // Assuming no additional loans for now
            "calculationMode": "AMORTIZATION"
        }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
            }
        });

        return response.data;
    } catch (error) {
        console.error("Interhyp API Error:", error.message);
        if (error.response) {
            console.error("Interhyp API Status:", error.response.status);
            console.error("Interhyp API Data:", JSON.stringify(error.response.data));
        }
        return null;
    }
};

// API Endpoints
app.get('/api/properties', async (req, res) => {
    try {
        console.log("Request Query:", req.query);
        let { minPrice, maxPrice, rooms, size, limit, offset, location, income, equity, debts } = req.query;
        const limitVal = parseInt(limit) || 50;
        const offsetVal = parseInt(offset) || 0;

        let apiResults = [];
        let total = 0;

        // Helper to fetch from ThinkImmo API
        const fetchFromApi = async (searchLocation) => {
            try {
                const response = await axios.post('https://thinkimmo-api.mgraetz.de/thinkimmo', {
                    "active": true,
                    "type": "APARTMENTBUY",
                    "sortBy": "desc",
                    "sortKey": "pricePerSqm",
                    "from": offsetVal,
                    "size": limitVal,
                    "geoSearches": {
                        "geoSearchQuery": searchLocation,
                        "geoSearchType": "town"
                    }
                }, { headers: { 'Content-Type': 'application/json' } });
                return response.data;
            } catch (e) {
                console.warn(`API fetch failed for ${searchLocation}:`, e.message);
                return null;
            }
        };

        // 1. Try requested location
        if (location) {
            const data = await fetchFromApi(location);
            if (data && data.results && data.results.length > 0) {
                apiResults = data.results;
                total = data.total;
            }
        }

        // 2. Fallback to München if no location or no results
        if (apiResults.length === 0 && location !== "München") {
            console.log("No results for requested location. Trying fallback to München via API...");
            const data = await fetchFromApi("München");
            if (data && data.results && data.results.length > 0) {
                apiResults = data.results;
                total = data.total;
            } else {
                console.log("München API fallback returned no results. Will use local data.");
            }
        }

        // Map results
        let mappedResults = [];
        if (apiResults.length > 0) {
            mappedResults = apiResults.map(item => ({
                id: item.id,
                title: item.title,
                address: {
                    lat: item.address ? item.address.lat : null,
                    lon: item.address ? item.address.lon : null,
                    street: item.address ? (item.address.road + (item.address.house_number ? ' ' + item.address.house_number : '')) : '',
                    postcode: item.address ? item.address.postcode : '',
                    city: item.address ? item.address.city : ''
                },
                buyingPrice: item.buyingPrice,
                pricePerSqm: item.pricePerSqm,
                rooms: item.rooms,
                squareMeter: item.squareMeter,
                images: item.images ? item.images.map(img => ({ originalUrl: img.originalUrl })) : [],
                floor: item.floor || 0
            }));
        } else {
            // Fallback to local properties
            console.log("Using local properties.json fallback.");
            let results = properties;
            // Filtering
            if (maxPrice) results = results.filter(p => p.p <= parseInt(maxPrice));
            if (minPrice) results = results.filter(p => p.p >= parseInt(minPrice));
            if (rooms) results = results.filter(p => p.r >= parseFloat(rooms));
            if (size) results = results.filter(p => p.s >= parseFloat(size));

            total = results.length;
            const paginatedResults = results.slice(offsetVal, offsetVal + limitVal);
            mappedResults = paginatedResults.map(item => ({
                id: item.id,
                title: item.t,
                address: { lat: item.lat, lon: item.lng, street: item.l, postcode: item.pc, city: item.c },
                buyingPrice: item.p,
                pricePerSqm: item.s ? Math.round(item.p / item.s) : 0,
                rooms: item.r,
                squareMeter: item.s,
                images: item.imgs.map(url => ({ originalUrl: url })),
                floor: 0
            }));
        }

        // Apply filters
        if (maxPrice) mappedResults = mappedResults.filter(p => p.buyingPrice <= parseInt(maxPrice));
        if (minPrice) mappedResults = mappedResults.filter(p => p.buyingPrice >= parseInt(minPrice));
        if (rooms) mappedResults = mappedResults.filter(p => p.rooms >= parseFloat(rooms));
        if (size) mappedResults = mappedResults.filter(p => p.squareMeter >= parseFloat(size));

        // Affordability Logic
        let affordabilityOptions = null;
        let maxAffordablePrice = 0;
        let budgetDetails = null;

        if (income || equity) {
            const buyingPowerData = await fetchMaxBuyingPower(income, equity, debts);

            if (buyingPowerData && buyingPowerData.scoringResult) {
                maxAffordablePrice = buyingPowerData.scoringResult.priceBuilding;
                budgetDetails = buyingPowerData;
            } else {
                // Fallback to simple calculation if API fails
                const monthlyIncome = parseFloat(income) || 0;
                const monthlyDebts = parseFloat(debts) || 0;
                const totalEquity = parseFloat(equity) || 0;
                const maxMonthlyPayment = (monthlyIncome - monthlyDebts) * 0.35;
                const maxLoan = (maxMonthlyPayment * 12) / 0.055;
                maxAffordablePrice = maxLoan + totalEquity;
            }

            mappedResults = mappedResults.map(item => {
                const isAffordable = maxAffordablePrice >= item.buyingPrice;
                const gap = isAffordable ? 0 : item.buyingPrice - maxAffordablePrice;
                return {
                    ...item,
                    affordability: {
                        isAffordable,
                        maxAffordablePrice,
                        gap
                    }
                };
            });

            // Sort
            mappedResults.sort((a, b) => {
                if (a.affordability.isAffordable && !b.affordability.isAffordable) return -1;
                if (!a.affordability.isAffordable && b.affordability.isAffordable) return 1;
                return a.buyingPrice - b.buyingPrice;
            });

            // Fallback Options
            // Fallback Options & Affordability Coach
            const affordableCount = mappedResults.filter(r => r.affordability.isAffordable).length;

            // Calculate Required Income for the cheapest property (or a default if none found)
            let requiredIncome = 0;
            let cheapestPrice = 0;

            if (mappedResults.length > 0) {
                // Find cheapest property
                const sortedByPrice = [...mappedResults].sort((a, b) => a.buyingPrice - b.buyingPrice);
                const cheapest = sortedByPrice[0];
                cheapestPrice = cheapest.buyingPrice;
            } else {
                // Default fallback price if no results (e.g. for Munich average)
                cheapestPrice = 400000;
            }

            // Reverse calculation: 
            // Price = (Loan + Equity) / 1.1
            // Loan = (Price * 1.1) - Equity
            // MonthlyPayment = (Loan * 0.055) / 12
            // NetIncome = MonthlyPayment / 0.35 + Debts
            const purchasingCostFactor = 0.10;
            const targetLoan = (cheapestPrice * (1 + purchasingCostFactor)) - (parseFloat(equity) || 0);
            const targetMonthlyPayment = (targetLoan * 0.055) / 12; // Assuming 3.5% interest + 2% repayment
            requiredIncome = Math.ceil((targetMonthlyPayment / 0.35) + (parseFloat(debts) || 0));

            // Alternative Locations
            const alternativeLocations = [
                { name: "Chemnitz", lat: 50.8278, lng: 12.9214, avgPrice: 150000, description: "High yield potential" },
                { name: "Magdeburg", lat: 52.1205, lng: 11.6276, avgPrice: 180000, description: "Growing tech hub" },
                { name: "Duisburg", lat: 51.4344, lng: 6.7623, avgPrice: 160000, description: "Affordable entry" },
                { name: "Bremerhaven", lat: 53.5396, lng: 8.5809, avgPrice: 140000, description: "Coastal living" }
            ];

            if (affordableCount === 0) {
                let cheapest = mappedResults.length > 0 ? mappedResults.sort((a, b) => a.buyingPrice - b.buyingPrice)[0] : null;
                const gap = cheapest ? cheapest.affordability.gap : (cheapestPrice - maxAffordablePrice);

                // Future cost calculation (Child Plan)
                // Target: €150,000 down payment in 18 years
                const targetDownPayment = 150000;
                const yearsToSave = 18;
                const annualReturn = 0.07;
                const monthlyRate = annualReturn / 12;
                const months = yearsToSave * 12;

                // Formula: P = FV * r / ((1 + r)^n - 1)
                const requiredMonthlySavings = targetDownPayment * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1);

                // Feasibility Check (Cap at €500/month)
                const maxFeasibleSavings = 500;
                let recommendedSavings = 0;
                let projectedValue = 0;

                if (requiredMonthlySavings > maxFeasibleSavings) {
                    recommendedSavings = maxFeasibleSavings;
                    // Formula: FV = P * ((1 + r)^n - 1) / r
                    projectedValue = recommendedSavings * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
                } else {
                    recommendedSavings = requiredMonthlySavings;
                    projectedValue = targetDownPayment;
                }

                affordabilityOptions = {
                    cheapestPropertyId: cheapest ? cheapest.id : null,
                    budgetDetails,
                    requiredIncome,
                    alternativeLocations,
                    option1: {
                        description: "What you are missing today",
                        gap: gap,
                        cheapestPrice: cheapestPrice,
                        futurePrice5Years: Math.round(cheapestPrice * Math.pow(1.03, 5)),
                        message: `You are currently €${gap.toLocaleString(undefined, { maximumFractionDigits: 0 })} short for the cheapest property.`
                    },
                    option2: {
                        description: "Savings plan for the next generation",
                        years: yearsToSave,
                        futurePrice: Math.round(projectedValue),
                        monthlySavingsRequired: Math.round(recommendedSavings),
                        message: `To help your children, investing €${Math.round(recommendedSavings).toLocaleString()} per month could grow to €${Math.round(projectedValue).toLocaleString()} in ${yearsToSave} years.`
                    },
                    coach: {
                        requiredIncome: requiredIncome,
                        incomeGap: Math.max(0, requiredIncome - (parseFloat(income) || 0)),
                        monthlySavingsForChildren: Math.round(recommendedSavings),
                        projectedChildSavings: Math.round(projectedValue),
                        targetDownPayment: targetDownPayment
                    }
                };
            } else if (budgetDetails) {
                affordabilityOptions = {
                    budgetDetails,
                    requiredIncome,
                    alternativeLocations
                };
            }
        }

        res.json({
            total,
            count: mappedResults.length,
            offset: offsetVal,
            limit: limitVal,
            data: mappedResults,
            affordabilityOptions
        });

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const generateEmailTemplate = ({ userName, userEmail, propertyTitle, propertyAddress, propertyPrice, propertyImage, coachData, isVoiceCall, userProfile, affordabilityData }) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inquiry Confirmation</title>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background-color: #2c3e50; color: #ffffff; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 300; }
        .content { padding: 30px; }
        .property-card { background-color: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 6px; padding: 20px; margin-top: 20px; }
        .property-image { width: 100%; height: 200px; object-fit: cover; border-radius: 4px; margin-bottom: 15px; background-color: #eee; }
        .price { color: #27ae60; font-size: 20px; font-weight: bold; margin: 10px 0; }
        .coach-section { margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        .coach-card { padding: 15px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #ccc; background: #f9f9f9; }
        .footer { background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; }
        .btn { display: inline-block; background-color: #3498db; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 4px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Mortgage Moment</h1>
        </div>
        <div class="content">
            <p>Hello ${userName || 'there'},</p>
            
            ${isVoiceCall ?
            `<p>It was great talking to you! Here is the summary of the property we discussed and the affordability plan we worked out.</p>` :
            `<p>Thank you for your interest! We have received your inquiry regarding the following property:</p>`
        }
            
            <div class="property-card">
                ${propertyImage ? `<img src="${propertyImage}" alt="${propertyTitle}" class="property-image" />` : ''}
                <h2 style="margin-top: 0;">${propertyTitle}</h2>
                <p style="margin-bottom: 5px;">${propertyAddress}</p>
                <div class="price">€${propertyPrice}</div>
            </div>

            ${userProfile || affordabilityData ? `
                <div class="coach-section">
                    <h2 style="color: #2c3e50;">📊 Your Calculation Details</h2>
                    
                    ${userProfile ? `
                    <div class="coach-card" style="border-left-color: #3498db; background: #f0f9ff;">
                        <h3 style="margin-top: 0; color: #2980b9;">Your Financial Profile</h3>
                        <p style="margin: 5px 0;">Monthly Net Income: <strong>€${userProfile.income?.toLocaleString()}</strong></p>
                        <p style="margin: 5px 0;">Available Equity: <strong>€${userProfile.equity?.toLocaleString()}</strong></p>
                        ${userProfile.rent ? `<p style="margin: 5px 0;">Current Rent: <strong>€${userProfile.rent?.toLocaleString()}</strong></p>` : ''}
                        ${userProfile.monthlyDebts ? `<p style="margin: 5px 0;">Monthly Debts: <strong>€${userProfile.monthlyDebts?.toLocaleString()}</strong></p>` : ''}
                        ${userProfile.employmentStatus ? `<p style="margin: 5px 0;">Employment: <strong>${userProfile.employmentStatus}</strong></p>` : ''}
                        ${userProfile.age ? `<p style="margin: 5px 0;">Age: <strong>${userProfile.age}</strong></p>` : ''}
                    </div>
                    ` : ''}
                    
                    ${affordabilityData ? `
                    <div class="coach-card" style="border-left-color: ${affordabilityData.isAffordable ? '#27ae60' : '#e74c3c'}; background: ${affordabilityData.isAffordable ? '#f0fff4' : '#fff5f5'};">
                        <h3 style="margin-top: 0; color: ${affordabilityData.isAffordable ? '#27ae60' : '#c0392b'};">
                            ${affordabilityData.isAffordable ? '✅ This Property is Affordable!' : '⚠️ Affordability Assessment'}
                        </h3>
                        <p style="margin: 5px 0;">Your Max Budget: <strong>€${affordabilityData.maxAffordablePrice?.toLocaleString()}</strong></p>
                        <p style="margin: 5px 0;">Property Price: <strong>€${propertyPrice}</strong></p>
                        ${!affordabilityData.isAffordable && affordabilityData.gap ? `<p style="margin: 5px 0; color: #e74c3c;">Shortfall: <strong>€${affordabilityData.gap?.toLocaleString()}</strong></p>` : ''}
                        ${affordabilityData.budgetDetails?.scoringResult ? `
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;" />
                            <p style="margin: 5px 0;">Estimated Monthly Payment: <strong>€${affordabilityData.budgetDetails.scoringResult.monthlyPayment?.toLocaleString()}</strong></p>
                            <p style="margin: 5px 0;">Max Loan Amount: <strong>€${affordabilityData.budgetDetails.scoringResult.loanAmount?.toLocaleString()}</strong></p>
                            <p style="margin: 5px 0; font-size: 0.9em; color: #666;">Interest Rate: ${affordabilityData.budgetDetails.scoringResult.effectiveInterest}%</p>
                        ` : ''}
                    </div>
                    ` : ''}
                </div>
            ` : ''}

            ${coachData ? `
                <div class="coach-section">
                    <h2 style="color: #2c3e50;">Your Affordability Plan 🏠</h2>
                    
                    <div class="coach-card" style="border-left-color: #e74c3c; background: #fff5f5;">
                        <h3 style="margin-top: 0; color: #c0392b;">The Reality Check</h3>
                        <p>Shortfall: <strong>€${coachData.gap?.toLocaleString()}</strong></p>
                        <p style="font-size: 0.9em; color: #666;">Future Price (5y): €${coachData.futurePrice5Years?.toLocaleString()}</p>
                    </div>

                    <div class="coach-card" style="border-left-color: #3498db; background: #f0f9ff;">
                        <h3 style="margin-top: 0; color: #2980b9;">Plan A: Boost Income</h3>
                        <p>Required Net Income: <strong>€${coachData.requiredIncome?.toLocaleString()}</strong> / month</p>
                        <p style="font-size: 0.9em; color: #666;">Increase needed: €${coachData.incomeGap?.toLocaleString()}</p>
                    </div>

                    <div class="coach-card" style="border-left-color: #27ae60; background: #f0fff4;">
                        <h3 style="margin-top: 0; color: #27ae60;">Plan B: For Your Children</h3>
                        <p>Recommended Investment: <strong>€${coachData.monthlySavingsForChildren?.toLocaleString()}</strong> / month</p>
                        <p style="font-size: 0.9em; color: #666;">Projected (18y): €${coachData.projectedChildSavings?.toLocaleString()}</p>
                        ${coachData.projectedChildSavings < coachData.targetDownPayment ?
                `<p style="font-size: 0.8em; color: #e67e22;">(Covers ${Math.round((coachData.projectedChildSavings / coachData.targetDownPayment) * 100)}% of €${coachData.targetDownPayment?.toLocaleString()} goal)</p>` : ''}
                    </div>
                </div>
            ` : ''}

            <p>One of our mortgage experts will review your request and get back to you shortly at <strong>${userEmail}</strong>.</p>
            
            <p>Best regards,<br>The Mortgage Moment Team</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Mortgage Moment. All rights reserved.</p>
            <p>This is an automated message. Please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>
    `;
};

app.post('/api/send-email', async (req, res) => {
    const { userName, userEmail, propertyTitle, propertyAddress, propertyPrice, propertyImage, coachData, isVoiceCall, userProfile, affordabilityData } = req.body;

    if (!userEmail) {
        return res.status(400).json({ message: 'User email is required' });
    }

    const htmlContent = generateEmailTemplate({
        userName,
        userEmail,
        propertyTitle,
        propertyAddress,
        propertyPrice,
        propertyImage,
        coachData,
        isVoiceCall,
        userProfile,
        affordabilityData
    });

    try {
        const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: {
                name: process.env.SENDER_NAME || "Mortgage Moment",
                email: process.env.SENDER_EMAIL || "no-reply@mortgagemoment.com"
            },
            to: [
                {
                    email: userEmail,
                    name: userName || "User"
                }
            ],
            subject: `Property Summary: ${propertyTitle}`,
            htmlContent: htmlContent
        }, {
            headers: {
                'api-key': process.env.BREVO_API_KEY || process.env.VITE_BREVO_API_KEY,
                'Content-Type': 'application/json',
                'accept': 'application/json'
            }
        });

        console.log('Email sent successfully:', response.data);
        res.json({ message: 'Email sent successfully', data: response.data });
    } catch (error) {
        console.error('Error sending email:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Failed to send email', error: error.response ? error.response.data : error.message });
    }
});

// Affordability Calculation Endpoint
app.post('/api/calculate-affordability', async (req, res) => {
    try {
        const { income, equity, monthlyDebts, propertyPrice } = req.body;
        const price = parseFloat(propertyPrice ? propertyPrice.replace(/[^0-9.-]+/g, "") : 0);

        const buyingPowerData = await fetchMaxBuyingPower(income, equity, monthlyDebts);
        let maxAffordablePrice = 0;
        let budgetDetails = null;

        if (buyingPowerData && buyingPowerData.scoringResult) {
            maxAffordablePrice = buyingPowerData.scoringResult.priceBuilding;
            budgetDetails = buyingPowerData;
        } else {
            // Fallback
            const monthlyIncome = parseFloat(income) || 0;
            const debts = parseFloat(monthlyDebts) || 0;
            const totalEquity = parseFloat(equity) || 0;
            const maxMonthlyPayment = (monthlyIncome - debts) * 0.35;
            const maxLoan = (maxMonthlyPayment * 12) / 0.055;
            maxAffordablePrice = maxLoan + totalEquity;
        }

        const isAffordable = maxAffordablePrice >= price;
        const gap = isAffordable ? 0 : price - maxAffordablePrice;

        let message = "";
        if (isAffordable) {
            message = "Great news! Based on your income and equity, this property is within your budget.";
        } else {
            message = `This property is a bit above your calculated budget. You would need approximately €${gap.toLocaleString(undefined, { maximumFractionDigits: 0 })} more in equity or a higher income to afford it comfortably.`;
        }

        res.json({
            isAffordable,
            maxAffordablePrice,
            gap,
            budgetDetails,
            message
        });

    } catch (error) {
        console.error("Error calculating affordability:", error);
        res.status(500).json({ error: "Failed to calculate affordability" });
    }
});

app.post('/api/realtime-token', async (req, res) => {
    try {
        const response = await axios.post('https://api.openai.com/v1/realtime/sessions', {
            model: "gpt-4o-realtime-preview",
            voice: "alloy"
        }, {
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            }
        });

        res.json({ secret: response.data.client_secret.value });
    } catch (error) {
        console.error("Error fetching realtime token:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to get realtime token" });
    }
});

// Serve static files from the React app
const DIST_DIR = path.join(__dirname, '../dist');
if (fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));

    // The "catchall" handler: for any request that doesn't
    // match one above, send back React's index.html file.
    app.get(/.*/, (req, res) => {
        res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
} else {
    console.warn("Warning: ../dist directory not found. Frontend will not be served.");
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
