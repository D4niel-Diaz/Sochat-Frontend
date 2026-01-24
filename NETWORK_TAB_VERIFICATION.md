# Network Tab Verification Guide

## 🎯 The Issue

API requests are working (visible in Console) but not appearing in the Network tab.

## ✅ The Solution

**This is NORMAL behavior when using Vite proxy.** Read below to understand why and how to verify.

---

## 🔍 How Vite Proxy Works

```
Browser (localhost:5176)
    ↓ Makes request to: localhost:5176/api/v1/guest/create
    ↓
Vite Dev Server (localhost:5176)
    ↓ Proxy forwards to: 127.0.0.1:8000/api/v1/guest/create
    ↓
Laravel Backend (127.0.0.1:8000)
    ↓ Returns response
    ↓
Vite Dev Server forwards response back to browser
```

**Key Point:** The browser ONLY sees requests to `localhost:5176`. The backend at `127.0.0.1:8000` is NOT visible in the browser's Network tab.

---

## 📋 How to Verify Requests in Network Tab

### Step 1: Open DevTools
- Press `F12` or right-click → Inspect
- Go to **Network** tab

### Step 2: Clear Network Log
- Click the 🚫 (prohibit) button to clear previous requests
- This ensures you only see new requests

### Step 3: Check Filter
- Make sure filter is set to **"All"** or **"Fetch/XHR"**
- NOT "Doc", "CSS", "JS", etc.

### Step 4: Look for Correct URLs
✅ **CORRECT:** `localhost:5176/api/v1/guest/create`
❌ **WRONG:** `127.0.0.1:8000/api/v1/guest/create` (won't appear)

### Step 5: Trigger API Requests
- Navigate to `http://localhost:5176/`
- Click "Start Chatting" button
- Watch Network tab for requests

### Step 6: Verify Request Details
Click on any request to see:
- **Headers tab:** Request and response headers
- **Response tab:** Response body
- **Timing tab:** Request timing
- **Status code:** 200, 201, 400, 401, etc.

---

## 🎯 Expected Requests When Starting Chat

1. `GET localhost:5176/api/v1/health` → 200 OK
2. `POST localhost:5176/api/v1/guest/create` → 201 Created
3. `POST localhost:5176/api/v1/presence/opt-in` → 200 OK
4. `POST localhost:5176/api/v1/chat/start` → 200 OK

---

## 🔧 Troubleshooting

### Problem: Still don't see requests

**Solution 1: Check Network Tab Filter**
- Click "All" filter (not "Fetch/XHR")
- Sometimes requests appear under different categories

**Solution 2: Clear and Refresh**
- Click 🚫 to clear network log
- Refresh the page (F5)
- Try again

**Solution 3: Disable Browser Extensions**
- Some ad blockers or privacy extensions can hide requests
- Try in Incognito/Private mode

**Solution 4: Check Console for Errors**
- Look for CORS errors
- Look for proxy errors
- Check if backend is running

**Solution 5: Verify Backend is Running**
```bash
# In backend directory
php artisan serve
```
Should show: `Server running on [http://127.0.0.1:8000]`

---

## 📊 What You SHOULD See

### Console Output:
```
🚀 API Request: POST /guest/create
✅ API Response: /guest/create 201
```

### Network Tab Output:
```
Name: guest/create
Status: 201 Created
Type: xhr
Size: 123 B
Time: 45ms
```

### Request URL:
```
http://localhost:5176/api/v1/guest/create
```

### Response Body:
```json
{
  "success": true,
  "data": {
    "guest_id": "...",
    "session_token": "...",
    "expires_at": "..."
  },
  "message": "Guest session created successfully"
}
```

---

## 🚨 Common Mistakes

### Mistake 1: Looking for Wrong URL
❌ Looking for: `127.0.0.1:8000/api/v1/guest/create`
✅ Should look for: `localhost:5176/api/v1/guest/create`

### Mistake 2: Wrong Network Tab Filter
❌ Filter set to: "Doc", "CSS", "JS", "Img"
✅ Filter set to: "All" or "Fetch/XHR"

### Mistake 3: Not Clearing Network Log
❌ Old requests cluttering the view
✅ Click 🚫 to clear before testing

### Mistake 4: Backend Not Running
❌ Backend server not started
✅ Run `php artisan serve` in backend directory

---

## ✅ Verification Checklist

- [ ] Backend server running on `http://127.0.0.1:8000`
- [ ] Frontend dev server running on `http://localhost:5176`
- [ ] DevTools Network tab open
- [ ] Network log cleared (🚫 button)
- [ ] Filter set to "All" or "Fetch/XHR"
- [ ] Looking for `localhost:5176` URLs (NOT `127.0.0.1:8000`)
- [ ] Triggered "Start Chatting" button
- [ ] Requests visible in Network tab
- [ ] Status codes visible (200, 201, etc.)
- [ ] Response body accessible

---

## 🎓 Why This is Normal

### Without Vite Proxy:
```
Browser → 127.0.0.1:8000 (CORS issues, not visible in Network tab)
```

### With Vite Proxy:
```
Browser → localhost:5176 (visible in Network tab) → 127.0.0.1:8000
```

The proxy:
- ✅ Eliminates CORS issues
- ✅ Makes requests visible in Network tab
- ✅ Provides better debugging experience
- ✅ Handles authentication headers properly

---

## 📞 Still Having Issues?

1. **Check Console for Proxy Logs:**
   ```
   🔄 Proxying request: POST /api/v1/guest/create to http://127.0.0.1:8000
   ✅ Proxy response: 201 /api/v1/guest/create
   ```

2. **Check Vite Config:**
   - File: `vite.config.js`
   - Verify proxy configuration is correct

3. **Check Environment Variables:**
   - File: `.env`
   - Should have: `VITE_API_BASE_URL=/api/v1`

4. **Test Direct API Call:**
   ```javascript
   // Run in browser console
   fetch('/api/v1/health')
     .then(r => r.json())
     .then(d => console.log('Health check:', d))
   ```

---

## 🎉 Success Indicators

✅ Requests appear in Network tab
✅ URLs show `localhost:5176` (not `127.0.0.1:8000`)
✅ Status codes visible (200, 201, 400, 401, etc.)
✅ Response body accessible
✅ Headers visible
✅ Timing information available
✅ Console logs show successful requests
✅ Application works without errors

---

## 📝 Summary

**The requests ARE appearing in the Network tab.** You just need to:

1. Look for `localhost:5176` URLs (NOT `127.0.0.1:8000`)
2. Set Network tab filter to "All" or "Fetch/XHR"
3. Clear network log before testing
4. Trigger requests by using the application

This is the correct and expected behavior when using Vite proxy for development.
