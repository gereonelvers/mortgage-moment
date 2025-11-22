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

// API Endpoints
app.get('/api/properties', (req, res) => {
    try {
        let { minPrice, maxPrice, rooms, size, limit, offset } = req.query;

        let results = properties;

        // Filtering
        if (maxPrice) {
            results = results.filter(p => p.p <= parseInt(maxPrice));
        }
        if (minPrice) {
            results = results.filter(p => p.p >= parseInt(minPrice));
        }
        if (rooms) {
            results = results.filter(p => p.r >= parseFloat(rooms));
        }
        if (size) {
            results = results.filter(p => p.s >= parseFloat(size));
        }

        // Pagination
        const total = results.length;
        const limitVal = parseInt(limit) || 50;
        const offsetVal = parseInt(offset) || 0;

        const paginatedResults = results.slice(offsetVal, offsetVal + limitVal);

        const mappedResults = paginatedResults.map(item => ({
            id: item.id,
            title: item.t,
            address: {
                lat: item.lat,
                lon: item.lng,
                street: item.l,
                postcode: item.pc,
                city: item.c
            },
            buyingPrice: item.p,
            pricePerSqm: item.s ? Math.round(item.p / item.s) : 0,
            rooms: item.r,
            squareMeter: item.s,
            images: item.imgs.map(url => ({ originalUrl: url })),
            floor: 0
        }));

        res.json({
            total,
            count: mappedResults.length,
            offset: offsetVal,
            limit: limitVal,
            data: mappedResults
        });

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const generateEmailTemplate = ({ userEmail, propertyTitle, propertyAddress, propertyPrice, propertyImage }) => {
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
            <p>Hello,</p>
            <p>Thank you for your interest! We have received your inquiry regarding the following property:</p>
            
            <div class="property-card">
                ${propertyImage ? `<img src="${propertyImage}" alt="${propertyTitle}" class="property-image" />` : ''}
                <h2 style="margin-top: 0;">${propertyTitle}</h2>
                <p style="margin-bottom: 5px;">${propertyAddress}</p>
                <div class="price">€${propertyPrice}</div>
            </div>

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
    const { userEmail, propertyTitle, propertyAddress, propertyPrice, propertyImage } = req.body;

    if (!userEmail) {
        return res.status(400).json({ error: "User email is required" });
    }

    const apiKey = process.env.BREVO_API_KEY || process.env.VITE_BREVO_API_KEY;
    if (!apiKey) {
        console.error("BREVO_API_KEY is missing");
        return res.status(500).json({ error: "Server configuration error" });
    }

    try {
        const htmlContent = generateEmailTemplate({
            userEmail,
            propertyTitle,
            propertyAddress,
            propertyPrice,
            propertyImage
        });

        const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: {
                name: process.env.SENDER_NAME || "Mortgage Moment",
                email: process.env.SENDER_EMAIL || "info@mortgagemoment.com"
            },
            to: [
                {
                    email: userEmail,
                    name: "User"
                }
            ],
            subject: `Inquiry Confirmation: ${propertyTitle}`,
            htmlContent: htmlContent
        }, {
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            }
        });

        console.log('Email sent successfully via backend');
        res.json({ success: true, message: "Email sent" });

    } catch (error) {
        console.error("Error sending email:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to send email", details: error.response?.data });
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
