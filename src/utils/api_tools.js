const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const axios = require("axios");

// Base API URL from OpenAPI spec
const BASE_URL = "http://localhost:3000/api/v1";

/**
 * Create tools for Top Voices API endpoints
 * @returns {Array} Array of tool objects
 */
function createTopVoicesTools() {
  return [
    tool(
      async () => {
        try {
          const response = await axios.get(`${BASE_URL}/top-voices`);
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error fetching top voices: ${error.message}`;
        }
      },
      {
        name: "get_all_top_voices",
        description: "Get all top voices data from LinkedIn.",
        schema: z.object({}),
      }
    ),

    tool(
      async () => {
        try {
          const response = await axios.get(`${BASE_URL}/top-voices/topics`);
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error fetching topics: ${error.message}`;
        }
      },
      {
        name: "get_topics",
        description: "Get all available topics for LinkedIn top voices.",
        schema: z.object({}),
      }
    ),

    tool(
      async (input) => {
        try {
          const response = await axios.get(
            `${BASE_URL}/top-voices/topic/${input.topicId}`
          );
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error fetching top voices for topic: ${error.message}`;
        }
      },
      {
        name: "get_top_voices_by_topic",
        description: "Get top voices by specific topic ID.",
        schema: z.object({
          topicId: z.string().describe("Topic ID to get top voices for"),
        }),
      }
    ),

    tool(
      async () => {
        try {
          const response = await axios.get(`${BASE_URL}/top-voices/trending`);
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error fetching trending posts: ${error.message}`;
        }
      },
      {
        name: "get_trending_posts",
        description: "Get trending posts from LinkedIn top voices.",
        schema: z.object({}),
      }
    ),

    tool(
      async () => {
        try {
          const response = await axios.get(`${BASE_URL}/top-voices/posts`);
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error fetching all posts: ${error.message}`;
        }
      },
      {
        name: "get_all_posts",
        description:
          "Get all posts across all topics and authors from LinkedIn top voices.",
        schema: z.object({}),
      }
    ),

    tool(
      async (input) => {
        try {
          const response = await axios.get(
            `${BASE_URL}/top-voices/author/${input.authorId}`
          );
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error fetching author posts: ${error.message}`;
        }
      },
      {
        name: "get_author_posts",
        description: "Get posts by a specific top voice author.",
        schema: z.object({
          authorId: z.string().describe("Author ID to get posts for"),
        }),
      }
    ),
  ];
}

/**
 * Create tools for Search API endpoints
 * @returns {Array} Array of tool objects
 */
function createSearchTools() {
  return [
    tool(
      async (input) => {
        try {
          const response = await axios.get(`${BASE_URL}/search`, {
            params: {
              query: input.query,
              timeframe: input.timeframe || "past-24h",
              limit: input.limit || 20,
              page: input.page || 1,
              subscriptionId: input.subscriptionId,
            },
          });
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error performing search: ${error.message}`;
        }
      },
      {
        name: "search_linkedin",
        description:
          "Search LinkedIn posts by keywords. Requires a subscription ID for premium features.",
        schema: z.object({
          query: z.string().describe("Search query"),
          timeframe: z
            .string()
            .optional()
            .describe(
              "Time period for search (past-24h, past-week, past-month)"
            ),
          limit: z.number().optional().describe("Number of results to return"),
          page: z.number().optional().describe("Page number for pagination"),
          subscriptionId: z
            .string()
            .describe("Subscription ID for premium features"),
        }),
      }
    ),

    tool(
      async (input) => {
        try {
          const response = await axios.get(
            `${BASE_URL}/search/results/${input.searchId}`
          );
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error fetching search results: ${error.message}`;
        }
      },
      {
        name: "get_search_results",
        description: "Get results of a previous LinkedIn search.",
        schema: z.object({
          searchId: z
            .string()
            .describe("Search ID from a previous search request"),
        }),
      }
    ),

    tool(
      async (input) => {
        try {
          const response = await axios.get(`${BASE_URL}/search/recent`, {
            params: {
              subscriptionId: input.subscriptionId,
            },
          });
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error fetching recent searches: ${error.message}`;
        }
      },
      {
        name: "get_recent_searches",
        description:
          "Get recent LinkedIn searches. Requires a subscription ID.",
        schema: z.object({
          subscriptionId: z.string().describe("Subscription ID"),
        }),
      }
    ),
  ];
}

/**
 * Create tools for Profile API endpoints
 * @returns {Array} Array of tool objects
 */
function createProfileTools() {
  return [
    tool(
      async (input) => {
        try {
          const response = await axios.post(`${BASE_URL}/profiles/analyze`, {
            profileUrl: input.profileUrl,
            subscriptionId: input.subscriptionId,
          });
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error analyzing profile: ${error.message}`;
        }
      },
      {
        name: "analyze_linkedin_profile",
        description:
          "Analyze a LinkedIn profile. Requires a subscription ID for premium features.",
        schema: z.object({
          profileUrl: z.string().describe("LinkedIn profile URL to analyze"),
          subscriptionId: z
            .string()
            .describe("Subscription ID for premium features"),
        }),
      }
    ),

    tool(
      async (input) => {
        try {
          const response = await axios.get(
            `${BASE_URL}/profiles/posts/${input.profileId}`,
            {
              params: {
                subscriptionId: input.subscriptionId,
              },
            }
          );
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error fetching profile posts: ${error.message}`;
        }
      },
      {
        name: "get_profile_posts",
        description:
          "Get posts from a specific LinkedIn profile. Requires a subscription ID.",
        schema: z.object({
          profileId: z.string().describe("LinkedIn profile ID"),
          subscriptionId: z.string().describe("Subscription ID"),
        }),
      }
    ),

    tool(
      async (input) => {
        try {
          const response = await axios.get(`${BASE_URL}/profiles/recent`, {
            params: {
              subscriptionId: input.subscriptionId,
            },
          });
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error fetching recent profiles: ${error.message}`;
        }
      },
      {
        name: "get_recent_profiles",
        description:
          "Get recently analyzed LinkedIn profiles. Requires a subscription ID.",
        schema: z.object({
          subscriptionId: z.string().describe("Subscription ID"),
        }),
      }
    ),
  ];
}

/**
 * Create tools for Authentication and License API endpoints
 * @returns {Array} Array of tool objects
 */
function createAuthAndLicenseTools() {
  return [
    tool(
      async (input) => {
        try {
          const response = await axios.post(`${BASE_URL}/auth/login`, {
            email: input.email,
          });
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error logging in: ${error.message}`;
        }
      },
      {
        name: "login_user",
        description: "Login a user and get subscription ID.",
        schema: z.object({
          email: z.string().describe("User's email address"),
        }),
      }
    ),



    tool(
      async (input) => {
        try {
          const response = await axios.get(
            `${BASE_URL}/license/check/${input.email}`
          );
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error checking subscription: ${error.message}`;
        }
      },
      {
        name: "check_subscription",
        description: "Check if a user has a valid subscription (checks local DB, potentially updated by Stripe webhooks).",
        schema: z.object({
          email: z.string().describe("User's email to check subscription for"),
        }),
      }
    ),

    tool(
      async (input) => {
        try {
          const response = await axios.post(`${BASE_URL}/stripe/customers`, {
            email: input.email,
            name: input.name,
          });
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error creating Stripe customer: ${error.message}`;
        }
      },
      {
        name: "create_stripe_customer",
        description: "Creates a new customer in Stripe using their email and optionally a name.",
        schema: z.object({
          email: z.string().email().describe("Customer's email address"),
          name: z.string().optional().describe("Customer's full name"),
        }),
      }
    ),

    tool(
      async (input) => {
        try {
          const response = await axios.post(`${BASE_URL}/stripe/invoices/create-and-pay`, {
            email: input.email,
            name: input.name,
            payment_method_id: input.payment_method_id,
          });
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error creating and paying Stripe invoice: ${error.message}`;
        }
      },
      {
        name: "create_and_pay_stripe_invoice_for_product",
        description: "Creates a Stripe customer (if not existing), creates an invoice for the standard product, and attempts to pay it immediately with the provided payment method. No emails will be sent by Stripe.",
        schema: z.object({
          email: z.string().email().describe("Customer's email address"),
          name: z.string().optional().describe("Customer's full name (for new customer creation)"),
          payment_method_id: z.string().describe("Stripe PaymentMethod ID (e.g., pm_xxxx)"),
        }),
      }
    ),

    tool(
      async (input) => {
        try {
          const response = await axios.post(`${BASE_URL}/stripe/subscriptions/create`, {
            email: input.email,
            name: input.name,
            payment_method_id: input.payment_method_id,
          });
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error creating Stripe subscription: ${error.message}`;
        }
      },
      {
        name: "create_stripe_subscription_for_product",
        description: "Creates a Stripe customer (if not existing), and sets up a subscription for the standard product using the provided payment method. No emails will be sent by Stripe for initial setup.",
        schema: z.object({
          email: z.string().email().describe("Customer's email address"),
          name: z.string().optional().describe("Customer's full name (for new customer creation)"),
          payment_method_id: z.string().describe("Stripe PaymentMethod ID (e.g., pm_xxxx)"),
        }),
      }
    ),
  ];
}

/**
 * Get all API tools
 * @returns {Array} Array of all tool objects
 */
function getAllApiTools() {
  return [
    ...createTopVoicesTools(),
    ...createSearchTools(),
    ...createProfileTools(),
    ...createAuthAndLicenseTools(),
  ];
}

module.exports = {
  getAllApiTools,
  createTopVoicesTools,
  createSearchTools,
  createProfileTools,
  createAuthAndLicenseTools,
};
