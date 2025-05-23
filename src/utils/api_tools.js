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
    ...createStripeTools(), // Added Stripe tools here
  ];
}

/**
 * Create tools for Stripe API endpoints
 * @returns {Array} Array of tool objects
 */
function createStripeTools() {
  return [
    tool(
      async (input) => {
        try {
          const headers = {};
          if (input.authToken) {
            headers['Authorization'] = `Bearer ${input.authToken}`;
          }
          // The backend's createCheckoutSession now only needs 'email'
          // Success/cancel URLs and Price ID are handled by the backend using .env variables
          const response = await axios.post(`${BASE_URL}/stripe/create-checkout-session`, 
            { email: input.email }, 
            { headers }
          );

          if (response.data && response.data.url) {
            return `Please use this link to complete your payment/subscription: ${response.data.url}`;
          } else {
            console.error("Checkout URL not found in response:", response.data);
            return "Could not retrieve payment link. The response from the server did not contain a URL. Please try again later or contact support.";
          }
        } catch (error) {
          console.error("Error in initiate_payment_checkout tool:", error.response?.data || error.message);
          return `Error initiating payment: ${error.response?.data?.message || 'An unexpected error occurred. Please ensure your email is correct and try again.'}`;
        }
      },
      {
        name: "initiate_payment_checkout",
        description: "Initiates a payment or subscription process by generating a Stripe Checkout link for the user. This should be used when a user expresses intent to subscribe or purchase. Requires the user's email address. If the user is already known to be authenticated with the system, their authToken can be provided.",
        schema: z.object({
          email: z.string().email().describe("The user's email address. This email will be associated with the Stripe customer and the checkout session."),
          authToken: z.string().optional().describe("The JWT token if the user is already authenticated with the system. This helps associate the payment with an existing authenticated user if applicable, but is not strictly required to initiate checkout."),
          // We don't need to pass productId or priceId here if the backend's 
          // createCheckoutSession is configured to use a default one from STRIPE_PRICE_ID
        }),
      }
    ),
    // Existing Stripe tools follow...
    tool(
      async (input) => {
        try {
          const headers = {};
          if (input.authToken) {
            headers['Authorization'] = `Bearer ${input.authToken}`;
          }
          const response = await axios.post(`${BASE_URL}/stripe/customers`, {
            email: input.email,
            name: input.name,
            paymentMethodId: input.paymentMethodId,
          }, { headers });
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error managing Stripe customer: ${error.response?.data?.message || error.message}`;
        }
      },
      {
        name: "manage_stripe_customer",
        description: "Creates a new Stripe customer or retrieves an existing one. Can optionally attach a payment method. Requires authToken for authorization.",
        schema: z.object({
          email: z.string().describe("The customer's email address."),
          name: z.string().optional().describe("The customer's full name."),
          paymentMethodId: z.string().optional().describe("A Stripe PaymentMethod ID (e.g., pm_xxxx) to attach to the customer and set as default for invoices/subscriptions."),
          authToken: z.string().describe("The JWT token for authorizing the API call."),
        }),
      }
    ),
    tool(
      async (input) => {
        try {
          const headers = {};
          if (input.authToken) {
            headers['Authorization'] = `Bearer ${input.authToken}`;
          }
          const response = await axios.post(`${BASE_URL}/stripe/payment-methods/${input.paymentMethodId}/attach`, {
            customerId: input.customerId,
          }, { headers });
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error attaching payment method: ${error.response?.data?.message || error.message}`;
        }
      },
      {
        name: "attach_payment_method_to_customer",
        description: "Attaches a given Stripe PaymentMethod ID to a specified Stripe Customer ID and sets it as the default for future invoices/subscriptions. Requires authToken for authorization.",
        schema: z.object({
          customerId: z.string().describe("The Stripe Customer ID (cus_xxxx) to attach the payment method to."),
          paymentMethodId: z.string().describe("The Stripe PaymentMethod ID (pm_xxxx) to attach."),
          authToken: z.string().describe("The JWT token for authorizing the API call."),
        }),
      }
    ),
    tool(
      async (input) => {
        try {
          const headers = {};
          if (input.authToken) {
            headers['Authorization'] = `Bearer ${input.authToken}`;
          }
          const response = await axios.post(`${BASE_URL}/stripe/payment-intents`, {
            customerId: input.customerId,
            amount: input.amount,
            currency: input.currency,
            paymentMethodId: input.paymentMethodId,
            description: input.description
          }, { headers });
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error creating payment intent: ${error.response?.data?.message || error.message}`;
        }
      },
      {
        name: "create_stripe_payment_intent",
        description: "Creates and optionally confirms a Stripe PaymentIntent for a one-off charge. Requires customerId, amount (in smallest currency unit, e.g., cents), currency, paymentMethodId, and authToken for authorization.",
        schema: z.object({
          customerId: z.string().describe("The Stripe Customer ID (cus_xxxx)."),
          amount: z.number().int().positive().describe("Amount to charge, in the smallest currency unit (e.g., cents for USD)."),
          currency: z.string().length(3).describe("Three-letter ISO currency code (e.g., usd)."),
          paymentMethodId: z.string().describe("A Stripe PaymentMethod ID (pm_xxxx) to charge."),
          description: z.string().optional().describe("An arbitrary string to be displayed on the customer's credit card statement."),
          authToken: z.string().describe("The JWT token for authorizing the API call."),
        }),
      }
    ),
    tool(
      async (input) => {
        try {
          const headers = {};
          if (input.authToken) {
            headers['Authorization'] = `Bearer ${input.authToken}`;
          }
          const response = await axios.post(`${BASE_URL}/stripe/invoices`, {
            customerId: input.customerId,
            lineItems: input.lineItems,
            daysUntilDue: input.daysUntilDue,
            description: input.description
          }, { headers });
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error creating draft invoice: ${error.response?.data?.message || error.message}`;
        }
      },
      {
        name: "create_stripe_draft_invoice",
        description: "Creates a new draft invoice in Stripe. Requires customerId, lineItems, and authToken for authorization. lineItems should be an array of objects, each with description, quantity, and amount (in smallest currency unit).",
        schema: z.object({
          customerId: z.string().describe("The Stripe Customer ID (cus_xxxx) for whom the invoice is created."),
          lineItems: z.array(z.object({
            description: z.string().describe("Description of the line item."),
            quantity: z.number().int().positive().describe("Quantity of the item."),
            amount: z.number().int().positive().describe("Unit amount in smallest currency unit (e.g., cents).")
          })).min(1).describe("An array of line items for the invoice."),
          daysUntilDue: z.number().int().optional().describe("Number of days until the invoice is due. Defaults to Stripe's setting if not provided."),
          description: z.string().optional().describe("An optional description for the invoice, often displayed on the invoice PDF."),
          authToken: z.string().describe("The JWT token for authorizing the API call."),
        }),
      }
    ),
    tool(
      async (input) => {
        try {
          const headers = {};
          if (input.authToken) {
            headers['Authorization'] = `Bearer ${input.authToken}`;
          }
          const response = await axios.post(`${BASE_URL}/stripe/invoices/${input.invoiceId}/finalize`, null, { headers });
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error finalizing invoice: ${error.response?.data?.message || error.message}`;
        }
      },
      {
        name: "finalize_stripe_draft_invoice",
        description: "Finalizes a draft invoice in Stripe, making it ready for payment. Requires the Invoice ID and authToken for authorization.",
        schema: z.object({
          invoiceId: z.string().describe("The Stripe Invoice ID (in_xxxx) of the draft invoice to finalize."),
          authToken: z.string().describe("The JWT token for authorizing the API call."),
        }),
      }
    ),
    tool(
      async (input) => {
        try {
          const headers = {};
          if (input.authToken) {
            headers['Authorization'] = `Bearer ${input.authToken}`;
          }
          const response = await axios.post(`${BASE_URL}/stripe/invoices/${input.invoiceId}/pay`, {
            paymentMethodId: input.paymentMethodId,
          }, { headers });
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error paying invoice: ${error.response?.data?.message || error.message}`;
        }
      },
      {
        name: "pay_stripe_invoice",
        description: "Pays a finalized Stripe invoice. Requires the Invoice ID and authToken for authorization. Optionally, a specific PaymentMethod ID can be provided to pay the invoice, otherwise the customer's default will be used.",
        schema: z.object({
          invoiceId: z.string().describe("The Stripe Invoice ID (in_xxxx) to pay."),
          paymentMethodId: z.string().optional().describe("An optional Stripe PaymentMethod ID (pm_xxxx) to use for this payment. If not provided, the customer's default payment method will be attempted."),
          authToken: z.string().describe("The JWT token for authorizing the API call."),
        }),
      }
    ),
    tool(
      async (input) => {
        try {
          const headers = {};
          if (input.authToken) {
            headers['Authorization'] = `Bearer ${input.authToken}`;
          }
          const response = await axios.post(`${BASE_URL}/stripe/subscriptions/create`, {
            email: input.email,
            name: input.name,
            payment_method_id: input.paymentMethodId, // Ensure snake_case for this specific API endpoint parameter
          }, { headers });
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error creating subscription: ${error.response?.data?.message || error.message}`;
        }
      },
      {
        name: "create_stripe_subscription",
        description: "Creates a new Stripe subscription for a user. Requires email, a PaymentMethod ID, and authToken for authorization. A customer will be created/retrieved based on the email.",
        schema: z.object({
          email: z.string().email().describe("The user's email address. A Stripe customer will be created or retrieved based on this email."),
          name: z.string().optional().describe("The user's full name. Used if a new customer needs to be created."),
          paymentMethodId: z.string().describe("A Stripe PaymentMethod ID (pm_xxxx) to be attached to the customer and used for the subscription."),
          authToken: z.string().describe("The JWT token for authorizing the API call."),
        }),
      }
    )
  ];
}

module.exports = {
  getAllApiTools,
  createTopVoicesTools,
  createSearchTools,
  createStripeTools,
  createProfileTools,
  createAuthAndLicenseTools,
};
