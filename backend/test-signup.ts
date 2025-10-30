import fetch from 'node-fetch';

interface SignupResponse {
  message?: string;
  user?: {
    id: number;
    email: string;
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
}

async function testSignup(): Promise<void> {
  try {
    const response = await fetch('http://localhost:5000/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testPassword123'
      }),
    });

    const data = await response.json() as SignupResponse;
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error occurred');
  }
}

testSignup();