
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawData = fs.readFileSync(path.join(__dirname, 'src/data/properties.json'), 'utf8');
const rawProperties = JSON.parse(rawData);

console.log("Total raw properties:", rawProperties.length);

const validProperties = rawProperties
    .filter(item => {
        const isValid = item.address && item.address.latitude && item.address.longitude;
        return isValid;
    })
    .map(item => {
        try {
            return {
                id: item.id,
                title: item.title,
                address: {
                    lat: item.address.latitude,
                    lon: item.address.longitude,
                    street: item.address.line,
                    postcode: item.address.postcode,
                    city: 'München'
                },
                buyingPrice: item.price?.amount || 0,
                pricePerSqm: item.size?.area ? Math.round((item.price?.amount || 0) / item.size.area) : 0,
                rooms: item.rooms?.count || 0,
                squareMeter: item.size?.area || 0,
                images: item.pictures?.pictures?.map(pic => ({ originalUrl: pic.url })) || [],
                floor: 0
            };
        } catch (e) {
            console.error("Error mapping item:", item.id, e.message);
            return null;
        }
    })
    .filter(item => item !== null);

console.log("Valid properties mapped:", validProperties.length);

if (validProperties.length > 0) {
    console.log("First mapped property:", JSON.stringify(validProperties[0], null, 2));
}
