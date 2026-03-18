# OpenVPN Access Manager

A production-ready web application for managing temporary OpenVPN user access using secure, token-based authentication.

This tool provides a simple admin panel for granting, extending, and revoking VPN access for a limited duration. It authenticates against the OpenVPN Access Server, obtains a temporary auth token, and uses it for all subsequent API calls. When the time expires, the system automatically revokes access.

## Key Features

- **Secure Token Authentication**: Logs into OpenVPN to get a temporary token. Does not store credentials.
- **Session Management**: Uses `express-session` for secure session handling.
- **Grant & Extend Access**: Grant or extend VPN access to any user for a specified duration.
- **Manual Block**: Immediately block a user's access.
- **Automatic Expiration**: A scheduler runs every minute to automatically block users whose access has expired.
- **Clean UI**: A responsive dashboard and login page built with TailwindCSS, with CSS in a separate file.

## Technology Stack

- **Backend**: Node.js, Express.js, `express-session`
- **Frontend**: HTML, TailwindCSS, Vanilla JavaScript
- **Database**: SQLite
- **Libraries**: `axios`, `node-cron`, `dotenv`, `better-sqlite3`, `cors`


## Installation & Setup

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd openvpn-access-manager
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Configure environment variables:**

    Create a `.env` file in the root directory with the following variables:

    ```ini
    # Required
    OPENVPN_API_URL=https://your-vpn-server.com
    SESSION_SECRET=replace-with-a-long-random-string
    PORT=3000

    #For backend auto-login and user syncing at startup
    OPENVPN_USERNAME=your-openvpn-admin-username
    OPENVPN_PASSWORD=your-openvpn-admin-password
    ```

    - If `OPENVPN_USERNAME` and `OPENVPN_PASSWORD` are provided, the backend will automatically log in at startup. This allows the expiration scheduler and user synchronization to run immediately.
    - If they are not provided, the backend will only be able to perform these actions after an administrator has logged in manually via the web interface.


    **Note on CORS**: The `server/index.js` file is configured with `cors({ credentials: true, origin: 'http://localhost:3000' })`. For production, you should update the `origin` to match your frontend's domain.

4.  **Start the application:**

    ```bash
    npm start
    ```

    Navigate to `http://localhost:3000` in your browser. You will be redirected to the login page.

## Authentication Flow

1.  The administrator enters their OpenVPN username and password on the login page.
2.  The backend calls the `/api/auth/login/userpassword` endpoint on the OpenVPN server.
3.  If successful, OpenVPN returns an `auth_token`.
4.  The backend stores this token in server memory and creates a session for the administrator.
5.  All subsequent API calls from the frontend are authenticated via the session cookie. The backend uses the in-memory token to make authenticated requests to the OpenVPN API.
6.  If the token expires, the API calls will fail, the session will be invalidated, and the user will be redirected to the login page.

## Security Notes

- OpenVPN admin credentials are never stored. They are used only once to obtain the auth token.
- The OpenVPN `auth_token` is stored securely in server memory and is never exposed to the frontend.
- `express-session` is used with an `httpOnly` cookie to protect against XSS attacks.
