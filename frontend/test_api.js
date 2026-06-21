const axios = require('axios');

async function test() {
    try {
        const client = axios.create({
            baseURL: 'http://localhost:8081/api',
            withCredentials: true
        });

        // Login first
        console.log('Logging in...');
        const loginRes = await client.post('/auth/login', {
            email: 'admin@example.com',
            password: 'password'
        });

        // Extract cookie
        const cookie = loginRes.headers['set-cookie'];

        // Fetch students with trailing slash
        console.log('Fetching students with trailing slash...');
        const res = await client.get('/students/', {
            headers: {
                Cookie: cookie ? cookie.join('; ') : ''
            }
        });
        console.log('Count with trailing slash:', res.data.length);
        if (res.data.length > 0) {
            console.log('Sample student JSON:', JSON.stringify(res.data[0], null, 2));
        }

    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
