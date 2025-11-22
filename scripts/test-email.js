
const API_URL = 'http://localhost:3001/api/send-email';

const testEmail = async () => {
    try {
        console.log("Testing Email API...");

        // Test 1: Missing email
        console.log("\nTest 1: Missing email");
        const res1 = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                propertyTitle: "Test Property",
                propertyAddress: "Test Address",
                propertyPrice: "100,000"
            })
        });
        const data1 = await res1.json();
        console.log(`Status: ${res1.status}`);
        if (res1.status === 400 && data1.error === "User email is required") {
            console.log("PASS: Correctly rejected missing email");
        } else {
            console.error("FAIL: Did not reject missing email correctly");
        }

        // Test 2: Valid Request with Image
        console.log("\nTest 2: Valid Request with Image");
        const res2 = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userEmail: "test@example.com",
                propertyTitle: "Luxury Villa",
                propertyAddress: "123 Ocean Drive, Miami",
                propertyPrice: "2,500,000",
                propertyImage: "https://placehold.co/600x400"
            })
        });
        const data2 = await res2.json();
        console.log(`Status: ${res2.status}`);
        if (res2.status !== 404) {
            console.log("PASS: Endpoint is reachable");
        } else {
            console.error("FAIL: Endpoint not found");
        }

    } catch (error) {
        console.error("Test Failed:", error);
    }
};

testEmail();