# SORSU TALK - Frontend

An anonymous real-time chat platform frontend built with React 18 and connected to a Laravel 11 backend API.

## Features

- **Anonymous Chat Sessions**: Create anonymous sessions with UUID-based identification
- **Auto-Matching**: Automatic pairing of waiting users via polling
- **Real-Time Messaging**: Chat functionality with message polling
- **Content Moderation**: Displays flagged messages from backend content filter
- **User Reporting**: Report system with auto-ban notifications
- **Admin Panel**: Full moderation dashboard for admins
- **Session Management**: Automatic session expiration and refresh (24 hours)
- **No Browser Storage**: All state managed in React Context (no localStorage/sessionStorage)

## Tech Stack

- **Frontend**: React 18+ with hooks
- **HTTP Client**: Axios
- **State Management**: React Context API
- **Styling**: TailwindCSS + DaisyUI
- **Routing**: React Router v6
- **Notifications**: React Hot Toast
- **Date Formatting**: date-fns
- **Build Tool**: Vite

## Prerequisites

- Node.js 18+ and npm
- Laravel 11 backend running on `http://127.0.0.1:8000`
- MySQL database configured

## Installation

1. **Clone the repository**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   
   The `.env` file should contain:
   ```env
   VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
   VITE_POLLING_INTERVAL_MESSAGES=2000
   VITE_POLLING_INTERVAL_MATCHING=3000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:5173`

## Project Structure

```
src/
├── api/
│   ├── config/
│   │   └── axios.config.js          # Axios instance with interceptors
│   └── services/
│       ├── guestService.js          # Guest API calls
│       ├── chatService.js           # Chat API calls
│       ├── reportService.js         # Report API calls
│       └── adminService.js          # Admin API calls
│
├── contexts/
│   ├── GuestContext.jsx             # Guest session management
│   ├── ChatContext.jsx              # Chat state management with polling
│   └── AdminContext.jsx             # Admin authentication
│
├── components/
│   ├── chat/
│   │   ├── ChatRoom.jsx             # Main chat interface
│   │   ├── MessageList.jsx          # Display messages
│   │   ├── MessageInput.jsx         # Send message form
│   │   ├── WaitingRoom.jsx          # Waiting for match
│   │   └── ChatControls.jsx         # End chat, report buttons
│   │
│   └── admin/
│       ├── AdminDashboard.jsx       # Metrics display
│       ├── ActiveChats.jsx          # Chat monitoring
│       ├── ReportsList.jsx          # Reports management
│       ├── BannedUsers.jsx          # Banned guests list
│       └── FlaggedMessages.jsx      # Flagged content review
│
├── pages/
│   ├── GuestLandingPage.jsx         # Landing page with auto session
│   ├── AdminLoginPage.jsx           # Admin login form
│   └── AdminPages.jsx               # Admin page layouts
│
├── App.jsx                          # Root component with context providers
└── main.jsx                         # Application entry point
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## API Integration

### Base Configuration

All API calls use the configured base URL: `http://127.0.0.1:8000/api/v1`

### Guest Endpoints

- **POST /guest/create** - Create anonymous session (auto-called on app load)
- **POST /guest/refresh** - Refresh session before expiry (auto-called 4 hours before expiry)

### Chat Endpoints

- **POST /chat/start** - Find/match with random user (polled every 3 seconds when waiting)
- **POST /chat/end** - End current chat
- **GET /chat/{chat_id}/messages** - Fetch chat messages (polled every 2 seconds during active chat)
- **POST /chat/message** - Send message

### Report Endpoint

- **POST /report** - Report current chat partner

### Admin Endpoints

- **POST /admin/login** - Admin authentication (uses session cookies)
- **GET /admin/metrics** - Dashboard statistics
- **GET /admin/chats** - List active chats
- **GET /admin/reports** - List reports (with status filter)
- **POST /admin/ban** - Ban a guest
- **POST /admin/unban** - Unban a guest
- **POST /admin/report/resolve** - Mark report as resolved
- **GET /admin/banned-guests** - List all banned users
- **GET /admin/flagged-messages** - List flagged messages

## State Management

### GuestContext

Manages guest session state:
- `guestId` - UUID of the guest
- `sessionToken` - Bearer token for API requests
- `expiresAt` - Session expiry timestamp
- `isLoading` - Session creation status
- `isBanned` - Ban status
- Methods: `createSession()`, `refreshSession()`, `clearSession()`

**Important**: Session token is stored in React Context only, never in localStorage.

### ChatContext

Manages chat state with polling:
- `chatId` - Current chat ID
- `partnerId` - Partner's guest ID
- `status` - 'idle' | 'waiting' | 'matched' | 'active' | 'ended'
- `messages` - Array of messages
- `isPolling` - Polling status
- Methods: `startChat()`, `endChat()`, `sendMessage()`, `fetchMessages()`

**Polling Strategy**:
- Waiting for match: Poll `/chat/start` every 3 seconds
- Active chat: Poll `/chat/{chat_id}/messages` every 2 seconds
- Polling stops automatically when chat ends or component unmounts

### AdminContext

Manages admin authentication:
- `adminId`, `name`, `email`, `role` - Admin information
- `isAuthenticated` - Auth status
- Methods: `login()`, `logout()`, `checkAuth()`

**Important**: Uses Laravel session cookies (automatic), no manual token management.

## Authentication Flow

### Guest Flow

1. User opens app → GuestContext auto-calls `POST /guest/create`
2. Session token stored in React Context
3. All guest requests include `Authorization: Bearer {session_token}` header
4. Session auto-refreshes 4 hours before 24-hour expiry
5. On ban/expiry → Context cleared and session recreated

### Admin Flow

1. Admin logs in → `POST /admin/login`
2. Laravel sets session cookie automatically
3. Admin info stored in React Context
4. All admin requests use session cookie (sent automatically by Axios)
5. On logout → Context cleared

## Error Handling

All API errors are handled globally via Axios interceptors:

- **401 Unauthorized**: Session expired or banned
- **403 Forbidden**: Access denied
- **404 Not Found**: Resource not found
- **422 Validation Error**: Field-specific errors
- **429 Too Many Requests**: Rate limit exceeded
- **500 Server Error**: Generic server error

User-friendly error messages are displayed via toast notifications.

## Polling Implementation

The application uses polling for real-time updates:

### When Polling Occurs:
1. **Waiting for match** - Every 3 seconds
2. **Active chat** - Every 2 seconds

### Polling Best Practices:
- Intervals cleared on component unmount
- No new poll if previous hasn't completed
- Exponential backoff on repeated failures
- Connection status indicator shown to users

## CORS Configuration

The Laravel backend must have CORS configured to allow requests from the frontend origin.

Ensure Laravel's `config/cors.php` includes:
```php
'paths' => ['api/*'],
'allowed_methods' => ['*'],
'allowed_origins' => ['http://localhost:5173'],
'allowed_headers' => ['*'],
'supports_credentials' => true,
```

## Development Notes

### No Browser Storage
- **NEVER** use `localStorage`, `sessionStorage`, or similar
- All state is in React Context
- Session tokens are passed via Authorization headers

### Admin Cookie Handling
- Axios configured with `withCredentials: true`
- Laravel session cookies sent/received automatically
- No manual cookie management needed

### Component Cleanup
- All polling intervals use `useEffect` cleanup
- Prevents memory leaks when navigating away

## Testing

### Guest Flow Testing
1. Open app → verify session created automatically
2. Click "Start Chatting" → verify "waiting" status
3. Open browser DevTools Network tab → verify polling every 3 seconds
4. When matched → verify navigation to chat room
5. Send message → verify appears immediately
6. Verify messages poll every 2 seconds
7. End chat → verify return to landing page
8. Report user → verify success message

### Admin Flow Testing
1. Navigate to `/admin/login`
2. Login with admin credentials
3. Verify session cookie set (Application tab)
4. Check dashboard metrics display
5. Navigate through admin pages
6. Test ban/unban functionality
7. Test report resolution
8. Logout → verify context cleared

### Error Testing
1. Stop Laravel backend → verify connection error
2. Banned guest → verify ban message shown
3. Rate limit → verify 429 error message
4. Invalid chat ID → verify 404 handling

## Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

Configure your production environment variables before building:
```env
VITE_API_BASE_URL=https://your-api-domain.com/api/v1
```

## Troubleshooting

### CORS Errors
- Verify Laravel CORS configuration includes your frontend origin
- Ensure `supports_credentials` is set to `true`

### Session Not Persisting
- Guest sessions are intentionally not persisted (anonymous)
- Admin sessions use cookies - verify browser allows cookies

### Polling Not Working
- Check browser console for errors
- Verify API endpoints are responding
- Check network tab in DevTools

### Admin Login Failing
- Verify admin credentials in Laravel database
- Check Laravel logs for authentication errors
- Ensure session cookie is being set

## License

Daniel Diaz
