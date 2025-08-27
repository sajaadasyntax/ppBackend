const axios = require('axios');
const jwt = require('jsonwebtoken');

// Create a test token
const createTestToken = () => {
  const payload = {
    id: '1', // Use a valid user ID from your database
    role: 'ADMIN'
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret-key', { expiresIn: '1h' });
};

async function testReportsEndpoint() {
  try {
    const token = createTestToken();
    console.log('Test token created:', token);
    
    const response = await axios.get('http://localhost:5000/api/content/reports', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error testing reports endpoint:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testReportsEndpoint();
