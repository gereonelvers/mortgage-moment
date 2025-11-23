import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const INPUT_FILE = path.join(__dirname, '../src/data/properties.json');
const OUTPUT_FILE = path.join(__dirname, '../public/properties.min.json');


const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));



const processData = async () => {
    try {
        // Check if we should skip processing
        const force = process.argv.includes('--force');
        if (!force && fs.existsSync(OUTPUT_FILE)) {
            const inputStats = fs.statSync(INPUT_FILE);
            const outputStats = fs.statSync(OUTPUT_FILE);

            if (outputStats.mtime > inputStats.mtime) {
                console.log(`Data is up to date. Skipping preprocessing. (Use --force to override)`);
                return;
            }
        }

        console.log(`Reading from ${INPUT_FILE}...`);
        const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
        const rawProperties = JSON.parse(rawData);
        console.log(`Total items found: ${rawProperties.length}`);

        const processedProperties = [];
        let geocodedCount = 0;
        let skippedCount = 0;

        for (const item of rawProperties) {
            // Basic validation
            const hasPrice = item.price && item.price.amount > 0;
            if (!hasPrice) continue;

            let lat = item.address?.latitude;
            let lng = item.address?.longitude;

            // Skip if missing coords
            if (!lat || !lng) {
                skippedCount++;
                continue;
            }

            processedProperties.push({
                id: item.id,
                t: item.title,
                lat: lat,
                lng: lng,
                l: item.address.line,
                pc: item.address.postcode,
                c: item.address.city || 'München',
                p: item.price.amount,
                s: item.size?.area || 0,
                r: item.rooms?.count || 0,
                imgs: item.pictures?.pictures?.map(p => p.url) || []
            });
        }

        console.log(`\nProcessing complete.`);
        console.log(`Skipped (missing coords): ${skippedCount}`);
        console.log(`Total valid items: ${processedProperties.length}`);

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(processedProperties));
        console.log(`Successfully wrote processed data to ${OUTPUT_FILE}`);

        const originalSize = fs.statSync(INPUT_FILE).size;
        const newSize = fs.statSync(OUTPUT_FILE).size;
        console.log(`Size reduced from ${(originalSize / 1024 / 1024).toFixed(2)}MB to ${(newSize / 1024 / 1024).toFixed(2)}MB`);

    } catch (error) {
        console.error("Error processing data:", error);
        process.exit(1);
    }
};
