// Test file to verify network requests are visible in DevTools
// Add this to a component or run in browser console

export const testNetworkVisibility = async () => {
  console.log('🧪 Testing Network Visibility...');
  console.log('📍 Open DevTools → Network tab → Filter by "Fetch/XHR"');
  console.log('📍 Look for requests to: localhost:5176/api/* (NOT 127.0.0.1:8000)');

  // Test 1: Direct fetch to API endpoint
  console.log('\n📡 Test 1: Direct fetch to /api/v1/health');
  try {
    const response = await fetch('/api/v1/health');
    const data = await response.json();
    console.log('✅ Fetch test passed:', response.status, data);
  } catch (error) {
    console.error('❌ Fetch test failed:', error);
  }

  // Test 2: Axios request
  console.log('\n📡 Test 2: Axios request to /api/v1/health');
  try {
    const axios = (await import('axios')).default;
    const response = await axios.get('/api/v1/health');
    console.log('✅ Axios test passed:', response.status, response.data);
  } catch (error) {
    console.error('❌ Axios test failed:', error);
  }

  // Test 3: XMLHttpRequest
  console.log('\n📡 Test 3: XMLHttpRequest to /api/v1/health');
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/v1/health');
    xhr.onload = () => {
      console.log('✅ XHR test passed:', xhr.status, xhr.responseText);
      resolve();
    };
    xhr.onerror = () => {
      console.error('❌ XHR test failed');
      resolve();
    };
    xhr.send();
  });
};

// Instructions for Network tab verification
export const networkTabInstructions = `
🔍 HOW TO VERIFY NETWORK REQUESTS:

1. Open DevTools (F12)
2. Go to Network tab
3. Filter by: "Fetch/XHR" (or "All")
4. Look for requests with URL: localhost:5176/api/*
   NOT: 127.0.0.1:8000 (that's the backend, not visible in browser)

5. Click on any request to see:
   - Headers tab: Request/Response headers
   - Response tab: Response body
   - Timing tab: Request timing

6. Expected requests when clicking "Start Chatting":
   - GET /api/v1/health
   - POST /api/v1/guest/create
   - POST /api/v1/presence/opt-in
   - POST /api/v1/chat/start

📌 IMPORTANT:
- Vite proxy forwards requests from localhost:5176 → 127.0.0.1:8000
- Browser only sees requests to localhost:5176
- Backend (127.0.0.1:8000) is NOT visible in Network tab
- This is NORMAL and CORRECT behavior

🚨 If you still don't see requests:
1. Check Network tab filter (try "All" instead of "Fetch/XHR")
2. Clear network log (🚫 button) and refresh
3. Disable browser extensions that might block requests
4. Check if you're in Incognito/Private mode
`;
