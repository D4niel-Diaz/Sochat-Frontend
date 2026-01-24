// Test file to verify network requests are visible in DevTools
// Run this in browser console to test

console.log('🧪 Starting network request test...');

// Test 1: Simple fetch request
console.log('Test 1: Fetch request to health endpoint');
fetch('http://127.0.0.1:8000/api/v1/health')
  .then(response => {
    console.log('✅ Fetch response:', response.status, response.statusText);
    return response.json();
  })
  .then(data => console.log('✅ Fetch data:', data))
  .catch(error => console.error('❌ Fetch error:', error));

// Test 2: Axios request
console.log('Test 2: Axios request to health endpoint');
import axios from 'axios';
axios.get('http://127.0.0.1:8000/api/v1/health')
  .then(response => {
    console.log('✅ Axios response:', response.status, response.data);
  })
  .catch(error => {
    console.error('❌ Axios error:', error.message);
    console.error('Error details:', error);
  });

// Test 3: XMLHttpRequest
console.log('Test 3: XMLHttpRequest to health endpoint');
const xhr = new XMLHttpRequest();
xhr.open('GET', 'http://127.0.0.1:8000/api/v1/health');
xhr.onload = () => {
  console.log('✅ XHR response:', xhr.status, xhr.responseText);
};
xhr.onerror = () => {
  console.error('❌ XHR error');
};
xhr.send();

console.log('🧪 All tests initiated. Check Network tab for requests.');
