const loginhubUrl = 'https://api-auth.astralwavelabel.com/api';
async function testLogin() {
  try {
    const response = await fetch(`${loginhubUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'guilhermebonato@proton.me', password: 'test', app_id: 4 })
    });
    
    console.log('Status:', response.status);
    const data = await response.text();
    console.log('Response:', data);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}
testLogin();
