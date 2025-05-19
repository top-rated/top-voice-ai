# Source Code Directory

This directory contains the core source code for the LinkedIn Top Voices API.

## Directory Structure

```
src/
│
├── controllers/        # Request handlers for each API endpoint
│   ├── auth.controller.js        # Authentication and user management
│   ├── profile.controller.js     # LinkedIn profile analysis
│   ├── search.controller.js      # LinkedIn posts search functionality
│   └── topVoices.controller.js   # LinkedIn Top Voices data management
│
├── middleware/         # Express middleware
│   └── auth.middleware.js        # Authentication and subscription verification
│
├── routes/             # API route definitions
│   ├── auth.routes.js            # User authentication routes
│   ├── profile.routes.js         # Profile analysis routes
│   ├── search.routes.js          # Search functionality routes
│   └── topVoices.routes.js       # Top Voices data routes
│
├── utils/              # Utility functions and helpers
│
├── data/               # Data storage and cache
│
└── index.js            # Application entry point
```

## Key Components

### Controllers

Controllers handle business logic and API responses:

- **auth.controller.js**: Manages user registration, login, and subscription verification
- **profile.controller.js**: Handles custom LinkedIn profile analysis
- **search.controller.js**: Provides search functionality for recent LinkedIn posts
- **topVoices.controller.js**: Manages access to LinkedIn Top Voices data

### Middleware

Middleware functions that process requests before they reach route handlers:

- **auth.middleware.js**: Contains `verifyToken` and `verifySubscription` middleware for authenticating users and protecting premium routes

### Routes

API route definitions that map HTTP requests to controller methods:

- **auth.routes.js**: Authentication endpoints for user management
- **profile.routes.js**: Routes for LinkedIn profile analysis
- **search.routes.js**: Routes for searching LinkedIn posts
- **topVoices.routes.js**: Routes for accessing top voices data

### Application Flow

1. The application starts at `index.js` which sets up Express with middleware
2. Routes are defined in the `routes/` directory
3. When a request hits a route, the appropriate controller method is called
4. Controllers implement business logic and interact with data sources
5. Data is returned to the client as JSON responses

## Data Management

The application uses Node Cache for lightweight in-memory data storage:

- No persistent database is used; data is cached in memory
- External webhooks are used to refresh data periodically
- For LinkedIn Top Voices data, the initial data is loaded at startup and refreshed daily
- For profile and search data, results are cached with TTL (Time To Live)

## Authentication & Authorization

- JWT tokens are used for authentication
- Tokens are issued upon login and included in request headers
- The `verifyToken` middleware validates tokens before allowing access
- The `verifySubscription` middleware checks for premium access
- Gumroad integration handles subscription management

## External Services

The application communicates with external webhooks:

- **Top Voices Data**: Initial load and daily refresh of top voices content
- **Profile Analysis**: Real-time LinkedIn profile data fetching
- **Search**: Real-time LinkedIn posts search functionality

## Error Handling

- Controllers use try-catch blocks for error handling
- Error responses include appropriate HTTP status codes and messages
- Asynchronous operations use async/await pattern with error handling
