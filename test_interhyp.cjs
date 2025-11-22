const axios = require('axios');

const fetchMaxBuyingPower = async (income, equity, debts) => {
    try {
        const monthlyIncome = parseFloat(income) || 0;
        const monthlyDebts = parseFloat(debts) || 0;
        const equityCash = parseFloat(equity) || 0;

        // Estimate monthly rate available for mortgage (e.g., 35% of net income minus debts)
        const monthlyRate = Math.max(0, (monthlyIncome - monthlyDebts) * 0.35);

        console.log("Calculating with:", { monthlyIncome, monthlyDebts, equityCash, monthlyRate });

        if (monthlyRate <= 0) {
            console.log("Monthly rate is 0 or less");
            return null;
        }

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

        console.log("API Response:", JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error("Interhyp API Error:", error.message);
        if (error.response) {
            console.error("Error Data:", error.response.data);
            console.error("Error Status:", error.response.status);
        }
        return null;
    }
};

fetchMaxBuyingPower(5000, 100000, 500);
