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
        console.log('Logged in successfully. Cookies:', cookie);

        // Fetch students
        console.log('Fetching students...');
        const studentsRes = await client.get('/students', {
            headers: {
                Cookie: cookie ? cookie.join('; ') : ''
            }
        });

        console.log('First student JSON structure:');
        console.log(JSON.stringify(studentsRes.data[0], null, 2));

    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Response data:', err.response.data);
        }
    }
}

test();
