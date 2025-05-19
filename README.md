# LinkedIn Top Voices API

API server for the LinkedIn Top Voices GPT - an intelligent tool that helps users research trending topics and generate authentic LinkedIn posts based on top influencers' content style.

## Overview

This API provides backend services for the LinkedIn Top Voices GPT, including:

- Access to curated LinkedIn Top Voices content
- Custom profile analysis
- Trending post search
- Subscription-based access management

## Features

- **Top LinkedIn Voices Data**: Access content and insights from LinkedIn's top influencers across various industries
- **Profile Analysis**: Analyze custom LinkedIn profiles to understand their posting patterns and engagement
- **Search**: Search recent LinkedIn posts by keywords
- **Subscription Management**: Simple subscription ID-based authentication for GPT compatibility

## Tech Stack

- Node.js
- Express.js
- Node Cache for in-memory storage
- Axios for external API calls

## Installation

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Setup

1. Clone the repository

```bash
git clone https://github.com/top-rated/top-voice-ai.git
cd top-voice-ai
```

2. Install dependencies

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```
# Server
PORT=3000
NODE_ENV=development
API_V1_PREFIX=/api/v1

# Webhook URLs
VOICES_WEBHOOK_INIT=
VOICES_WEBHOOK_DAILY=
PROFILE_WEBHOOK=
SEARCH_WEBHOOK=

# Subscription
GUMROAD_SECRET=your_gumroad_secret
SUBSCRIPTION_URL=https://linkedingpt.gumroad.com/l/subscribe?wanted=true
```

4. Start the server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register a new user (simplified for GPT)
- `POST /api/v1/auth/login` - Login a user and get subscription ID
- `GET /api/v1/auth/verify-subscription` - Verify subscription status by ID
- `GET /api/v1/auth/subscription/:subscriptionId` - Get subscription status by ID
- `POST /api/v1/auth/gumroad-webhook` - Handle Gumroad webhook events

### Top Voices

- `GET /api/v1/top-voices` - Get all top voices data
- `GET /api/v1/top-voices/topics` - Get all available topics
- `GET /api/v1/top-voices/topic/:topicId` - Get top voices by topic
- `GET /api/v1/top-voices/trending` - Get trending posts from top voices
- `GET /api/v1/top-voices/posts` - Get all posts across all topics and authors
- `GET /api/v1/top-voices/author/:authorId` - Get posts by a specific author
- `GET /api/v1/top-voices/refresh-all` - Force refresh all data

### Profiles (Premium Feature)

- `POST /api/v1/profiles/analyze` - Analyze LinkedIn profiles (requires subscriptionId)
- `GET /api/v1/profiles/posts/:profileId` - Get posts from a specific profile (requires subscriptionId)
- `GET /api/v1/profiles/status/:requestId` - Check analysis status
- `GET /api/v1/profiles/recent` - Get recently analyzed profiles (requires subscriptionId)
- `DELETE /api/v1/profiles/:profileId` - Delete a profile analysis (requires subscriptionId)

### Search (Premium Feature)

- `GET /api/v1/search` - Direct search with query parameters (GPT-friendly, requires subscriptionId)
- `POST /api/v1/search/keywords` - Search LinkedIn posts by keywords (requires subscriptionId)
- `GET /api/v1/search/results/:searchId` - Get search results
- `GET /api/v1/search/recent` - Get recent searches (requires subscriptionId)
- `DELETE /api/v1/search/:searchId` - Delete a search (requires subscriptionId)

## Authentication

The API uses a simple subscription ID-based authentication for GPT compatibility. To access premium endpoints, include the subscription ID either:

1. As a query parameter: `?subscriptionId=your_subscription_id`
2. In the request body as a JSON property: `{ "subscriptionId": "your_subscription_id" }`

This simplified approach makes it easier for GPT to interact with the API without having to manage tokens.

## User Tiers

The API supports two user tiers:

### Free Plan

- Access to LinkedIn Top Voices knowledge base
- View trending content from top influencers
- Limited topic research capabilities

### Paid Plan (Premium)

- All Free plan features
- Custom LinkedIn profile analysis
- Search for recent LinkedIn posts by keywords
- Generate AI prompts for authentic post creation

## Testing

The project includes a comprehensive test suite:

```bash
# Run all tests
npm test

# Run specific test category
npm run test:profile
npm run test:search
npm run test:user
npm run test:voices
npm run test:auth
```

## Docker Support

The project includes Docker configuration for easy deployment:

```bash
# Build the Docker image
docker build -t linkedin-gpt-api .

# Run the container
docker run -p 3000:3000 --env-file .env linkedin-gpt-api
```
