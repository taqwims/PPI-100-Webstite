import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 10 },  // Ramp up to 10 VUs
    { duration: '15s', target: 50 }, // Ramp up to 50 VUs
    { duration: '10s', target: 0 },  // Ramp down to 0 VUs
  ],
};

const BASE_URL = 'http://localhost:8082';

export default function () {
  // 1. Authenticate to get JWT token
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'stresstest@example.com',
    password: 'password123'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'has token': (r) => r.json('token') !== undefined,
  });

  const token = loginRes.json('token');
  const authHeaders = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  // 2. Test Public Configurations
  const configRes = http.get(`${BASE_URL}/api/config/features`);
  check(configRes, { 'config fetched': (r) => r.status === 200 });

  // 3. Test API features concurrently
  if (token) {
    // Admin features
    const profileRes = http.get(`${BASE_URL}/api/profile`, authHeaders);
    check(profileRes, { 'profile fetched': (r) => r.status === 200 });

    const usersRes = http.get(`${BASE_URL}/api/users`, authHeaders);
    check(usersRes, { 'users fetched': (r) => r.status === 200 || r.status === 403 });

    const notifRes = http.get(`${BASE_URL}/api/notifications`, authHeaders);
    check(notifRes, { 'notifications fetched': (r) => r.status === 200 });
    
    // Academic features
    const teachersRes = http.get(`${BASE_URL}/api/academic/dashboard/stats`, authHeaders);
    check(teachersRes, { 'dashboard stats fetched': (r) => r.status === 200 || r.status === 404 });

    // Finance features
    const settingsRes = http.get(`${BASE_URL}/api/admin/settings`, authHeaders);
    check(settingsRes, { 'settings fetched': (r) => r.status === 200 });
  }

  // Sleep between iterations to simulate real user behavior
  sleep(1);
}
