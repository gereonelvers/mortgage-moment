

const API_URL = 'http://localhost:3001/api/properties';

const testApi = async () => {
    try {
        console.log("Testing API...");

        // Test 1: Fetch all properties (default limit)
        console.log("\nTest 1: Fetch default properties");
        const res1 = await fetch(API_URL);
        const data1 = await res1.json();
        console.log(`Status: ${res1.status}`);
        console.log(`Total: ${data1.total}`);
        console.log(`Count: ${data1.count}`);
        if (data1.count > 0 && data1.data[0].id) {
            console.log("PASS: Data structure looks correct");
        } else {
            console.error("FAIL: Data structure incorrect");
        }

        // Test 2: Filter by maxPrice
        console.log("\nTest 2: Filter by maxPrice=500000");
        const res2 = await fetch(`${API_URL}?maxPrice=500000`);
        const data2 = await res2.json();
        console.log(`Count: ${data2.count}`);
        const allUnderMax = data2.data.every(p => p.buyingPrice <= 500000);
        if (allUnderMax) {
            console.log("PASS: All properties are under maxPrice");
        } else {
            console.error("FAIL: Found properties over maxPrice");
        }

    } catch (error) {
        console.error("Test Failed:", error);
    }
};

// We need to run the server first, but this script assumes server is running.
// For this automated test, I'll just print instructions to run it manually or I can try to spawn the server.
// Actually, I will run the server in background and then run this test.
testApi();
