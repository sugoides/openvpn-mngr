# GEMINI.md

## Project: OpenVPN Temporary Access Manager

This project is a **lightweight web application for managing temporary OpenVPN user access**.

Administrators can grant VPN access to users for a **limited duration**, after which the system automatically **revokes access using the OpenVPN Access Server REST API**.

The system **only uses the block and unblock API endpoints** from OpenVPN.

---

# Core Objective

Create a **simple admin panel** that allows administrators to:

* Grant VPN access
* Set expiration dates
* Extend access
* Block users manually
* Automatically block expired users

The application should be **minimal, reliable, and easy to deploy on a small VPS**.

---

# Technology Stack

Backend

* Node.js
* Express.js

Frontend

* HTML
* TailwindCSS
* Vanilla JavaScript

Database

* SQLite

Libraries

* axios (OpenVPN API)
* node-cron (expiration scheduler)
* dotenv (environment variables)
* better-sqlite3 (database)

---

# Critical Constraint

The system must **ONLY interact with the following OpenVPN API operations**.

## Unblock User

```
POST /api/user/unblock
```

Enables VPN access.

## Block User

```
POST /api/user/block
```

Disables VPN access.

No other OpenVPN endpoints may be used.

---

# Environment Variables

Use `.env`.

Example configuration:

```
OPENVPN_API_URL=https://vpn.example.com/api
OPENVPN_USERNAME=admin
OPENVPN_PASSWORD=password
PORT=3000
```

Credentials must **never be exposed to the frontend**.

Providing `OPENVPN_USERNAME` and `OPENVPN_PASSWORD` is optional. If provided, they are used by the backend to automatically authenticate at startup for processes like the expiration scheduler and user synchronization. If not provided, the application will rely on the administrator logging in manually to get an API token.

---

# System Architecture

The application consists of:

## Backend

Express server responsible for:

* managing user access records
* communicating with OpenVPN API
* running expiration scheduler
* exposing REST endpoints

## Database

SQLite database storing:

* username
* expiration time
* status
* timestamps

## Frontend

A simple TailwindCSS dashboard that:

* displays users
* allows granting access
* allows extending access
* allows blocking users

---

# Database Schema

Table: `vpn_users`

Columns:

| Field           | Type     |
| --------------- | -------- |
| id              | integer  |
| username        | text     |
| status          | text     |
| expiration_date | datetime |
| created_at      | datetime |
| updated_at      | datetime |

Statuses allowed:

```
active
blocked
expired
```

---

# Backend API

## Get Users

```
GET /api/users
```

Returns all managed VPN users.

---

## Grant Access

```
POST /api/users/grant
```

Body:

```
{
  "username": "user1",
  "expiration_date": "2026-03-20T10:00:00Z"
}
```

Behavior:

1. store user in database
2. call OpenVPN **unblock**
3. set status to `active`

---

## Extend Access

```
POST /api/users/extend
```

Body:

```
{
  "username": "user1",
  "expiration_date": "2026-03-25T10:00:00Z"
}
```

Behavior:

* update expiration
* unblock user if currently blocked

---

## Block User

```
POST /api/users/block
```

Body:

```
{
  "username": "user1"
}
```

Behavior:

1. call OpenVPN block API
2. update database status to `blocked`

---

# Expiration Scheduler

A background job runs every minute using **node-cron**.

Logic:

```
for each user
    if expiration_date <= now
        call OpenVPN block API
        update status = expired
```

This ensures expired users automatically lose VPN access.

---

# Frontend UI

The UI must use **TailwindCSS only**.

Main components:

## Dashboard Table

Columns:

* Username
* Status
* Expiration
* Time Remaining
* Actions

---

## Status Badges

| Status  | Color  |
| ------- | ------ |
| Active  | Green  |
| Blocked | Red    |
| Expired | Yellow |

---

## Modals

### Grant Access Modal

Inputs:

* username
* expiration datetime

### Extend Access Modal

Inputs:

* new expiration datetime

---

# Project Structure

```
openvpn-access-manager/

server/
  index.js
  db.js
  scheduler.js

  routes/
    users.js

  services/
    openvpn.js

public/
  index.html
  app.js

.env.example
package.json
README.md
```

---

# Security Rules

* OpenVPN credentials must remain **server-side**
* Frontend must never call OpenVPN directly
* Backend proxies all OpenVPN requests
* Validate all inputs
* Prevent SQL injection
* Handle API errors gracefully

---

# Code Quality Guidelines

When modifying or extending this project:

* Keep functions small and readable
* Use modular files
* Handle errors properly
* Avoid unnecessary frameworks
* Prefer simple solutions

The system should remain **lightweight and maintainable**.

---

# Deployment Goal

The project should be deployable with:

```
npm install
node server/index.js
```

The system should run comfortably on:

* small VPS
* home server
* docker container

---

# Expected Outcome

A minimal but production-capable **OpenVPN temporary access management panel** that:

* grants VPN access
* sets expiration dates
* automatically blocks expired users
* allows manual blocking
* provides a clean Tailwind admin interface