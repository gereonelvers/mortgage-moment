
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, 'src/data/properties.json');

try {
    const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
    const rawProperties = JSON.parse(rawData);
    console.log(`Total items: ${rawProperties.length}`);

    let missingCoords = 0;
    let missingPrice = 0;
    let valid = 0;

    rawProperties.forEach(item => {
        const hasLocation = item.address && item.address.latitude && item.address.longitude;
        const hasPrice = item.price && item.price.amount > 0;

        if (!hasLocation) missingCoords++;
        if (hasLocation && !hasPrice) missingPrice++; // Only count price missing if location is there, to avoid double counting for "valid" logic

        if (hasLocation && hasPrice) valid++;
    });

    console.log(`Missing Coordinates: ${missingCoords}`);
    console.log(`Missing Price (but has coords): ${missingPrice}`);
    console.log(`Valid Items: ${valid}`);

    const invalidItems = rawProperties.filter(item => !item.address || !item.address.latitude).slice(0, 5);
    if (invalidItems.length > 0) {
        console.log("\nSample Items missing coords (Address Data):");
        invalidItems.forEach(item => {
            console.log(JSON.stringify(item.address || "No address object", null, 2));
        });
    }

} catch (error) {
    console.error(error);
}
