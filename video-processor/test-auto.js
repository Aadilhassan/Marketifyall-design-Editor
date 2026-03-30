const axios = require('axios');
const fs = require('fs');

async function testGenerate() {
    try {
        console.log('Testing Auto-Generation...');
        const url = 'https://www.zillow.com/homedetails/123-Example-St/123456_zpid/'; // Mock URL, scraper might fail if not real, but we want to test flow

        // Zillow limits might block this, so we might fail at scraping. 
        // But for testing the endpoint connection:

        console.log('Sending generate request...');
        const response = await axios.post('http://localhost:3001/api/generate', {
            url: 'https://www.zillow.com/homedetails/test'
        });

        const jobId = response.data.id;
        console.log(`Job started: ${jobId}`);

        // Poll status
        const interval = setInterval(async () => {
            try {
                const statusRes = await axios.get(`http://localhost:3001/api/generate/${jobId}/status`);
                const status = statusRes.data;
                console.log(`Status: ${status.status} (${status.progress}%)`);

                if (status.status === 'done') {
                    clearInterval(interval);
                    console.log('Generation complete!');
                } else if (status.status === 'error') {
                    clearInterval(interval);
                    console.error('Generation failed:', status.error);
                }
            } catch (err) {
                // ignore polling errors
            }
        }, 1000);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testGenerate();
