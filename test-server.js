const axios = require('axios');

async function testServer() {
  try {
    console.log('Testing server health endpoint...');
    const response = await axios.get('http://localhost:5000/health');
    console.log('Server is running! Response:', response.status, response.data);
    return true;
  } catch (error) {
    console.error('Server is not running or health endpoint is not available.');
    console.error('Error:', error.message);
    return false;
  }
}

testServer();
