const axios = require('axios');
const fs = require('fs');

async function testRender() {
    try {
        console.log('Sending render request...');
        const response = await axios.post('http://localhost:3001/api/render', {
            timeline: {
                width: 1280,
                height: 720,
                fps: 30,
                duration: 5, // 5 seconds video
                backgroundColor: 'black'
            },
            clips: [
                {
                    type: 'image',
                    src: 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
                    start: 0,
                    duration: 2.5,
                    position: { x: 0, y: 0 },
                    size: { width: 100, height: 100 }
                },
                {
                    type: 'image',
                    src: 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
                    start: 2.5,
                    duration: 2.5,
                    position: { x: 0, y: 0 },
                    size: { width: 100, height: 100 }
                }
            ]
        });

        const jobId = response.data.id;
        console.log(`Job started: ${jobId}`);

        // Poll status
        const interval = setInterval(async () => {
            const statusRes = await axios.get(`http://localhost:3001/api/render/${jobId}/status`);
            const status = statusRes.data;
            console.log(`Status: ${status.status} (${status.progress}%)`);

            if (status.status === 'done') {
                clearInterval(interval);
                console.log('Render complete!');
                // Download
                const writer = fs.createWriteStream('test_output.mp4');
                const download = await axios.get(`http://localhost:3001/api/render/${jobId}/download`, { responseType: 'stream' });
                download.data.pipe(writer);
                console.log('Video saved to test_output.mp4');
            } else if (status.status === 'error') {
                clearInterval(interval);
                console.error('Render failed:', status.error);
            }
        }, 1000);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testRender();
