const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

// Base API URL from OpenAPI spec
const BASE_URL = process.env.BASE_URL;

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
        description:
          "Creates a new customer in Stripe using their email and optionally a name.",
        schema: z.object({
          email: z.string().email().describe("Customer's email address"),
          name: z.string().optional().describe("Customer's full name"),
        }),
      }
    ),

    tool(
      async (input) => {
        try {
          const response = await axios.post(
            `${BASE_URL}/stripe/invoices/create-and-pay`,
            {
              email: input.email,
              name: input.name,
              payment_method_id: input.payment_method_id,
            }
          );
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error creating and paying Stripe invoice: ${error.message}`;
        }
      },
      {
        name: "create_and_pay_stripe_invoice_for_product",
        description:
          "Creates a Stripe customer (if not existing), creates an invoice for the standard product, and attempts to pay it immediately with the provided payment method. No emails will be sent by Stripe.",
        schema: z.object({
          email: z.string().email().describe("Customer's email address"),
          name: z
            .string()
            .optional()
            .describe("Customer's full name (for new customer creation)"),
          payment_method_id: z
            .string()
            .describe("Stripe PaymentMethod ID (e.g., pm_xxxx)"),
        }),
      }
    ),

    tool(
      async (input) => {
        try {
          const response = await axios.post(
            `${BASE_URL}/stripe/subscriptions/create`,
            {
              email: input.email,
              name: input.name,
              payment_method_id: input.payment_method_id,
            }
          );
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error creating Stripe subscription: ${error.message}`;
        }
      },
      {
        name: "create_stripe_subscription_for_product",
        description:
          "Creates a Stripe customer (if not existing), and sets up a subscription for the standard product using the provided payment method. No emails will be sent by Stripe for initial setup.",
        schema: z.object({
          email: z.string().email().describe("Customer's email address"),
          name: z
            .string()
            .optional()
            .describe("Customer's full name (for new customer creation)"),
          payment_method_id: z
            .string()
            .describe("Stripe PaymentMethod ID (e.g., pm_xxxx)"),
        }),
      }
    ),

    tool(
      async (input) => {
        try {
          const headers = {};
          if (input.authToken) {
            headers["Authorization"] = `Bearer ${input.authToken}`;
          }
          const response = await axios.post(
            `${BASE_URL}/auth/check-subscription/${input.email}`,
            {},
            { headers }
          );
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error checking subscription: ${
            error.response?.data?.message || error.message
          }`;
        }
      },
      {
        name: "check_subscription_by_email",
        description:
          "Check subscription status for a user by their email address. This will check local storage first, then fetch directly from Stripe if needed.",
        schema: z.object({
          email: z.string().email().describe("User's email address"),
          authToken: z
            .string()
            .optional()
            .describe("The JWT token for authorizing the API call"),
        }),
      }
    ),

    tool(
      async (input) => {
        try {
          const headers = {};
          if (input.authToken) {
            headers["Authorization"] = `Bearer ${input.authToken}`;
          }
          const response = await axios.get(
            `${BASE_URL}/stripe/subscriptions/fetch-from-stripe/${input.email}`,
            { headers }
          );
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error fetching Stripe subscriptions: ${
            error.response?.data?.message || error.message
          }`;
        }
      },
      {
        name: "fetch_stripe_subscriptions_by_email",
        description:
          "Fetch subscription data directly from Stripe API by customer email. This bypasses local storage and queries Stripe directly. Requires authToken for authorization.",
        schema: z.object({
          email: z.string().email().describe("Customer's email address"),
          authToken: z
            .string()
            .describe("The JWT token for authorizing the API call"),
        }),
      }
    ),

    tool(
      async (input) => {
        try {
          // This is a client-side tool that helps determine if a user has reached their usage limit
          // and provides appropriate upgrade messaging
          const { userIdentifier, currentUsage } = input;

          const limit = 5; // Monthly message limit for free users
          const isLimitExceeded = currentUsage >= limit;

          const upgradeMessage = `🌟 **Ready to Unlock Unlimited Access?**

You're making great use of our LinkedIn AI assistant! 

**Premium Benefits:**
✅ Unlimited messages per month
✅ Advanced LinkedIn insights & analytics  
✅ Profile analysis & optimization tips
✅ Priority customer support
✅ Early access to new features

**Current Usage:** ${currentUsage}/${limit} messages this month

**How to upgrade:**
Simply say "I want to upgrade to premium" or "How can I subscribe?" and I'll walk you through the quick and secure payment process.

**Questions?** Ask me anything about premium features!`;

          const limitMessage = `🚫 **Monthly Limit Reached (${currentUsage}/${limit})**

You've used all your free messages this month! 

**Want to continue the conversation?** 
Upgrade to Premium for unlimited access:

🌟 **Premium Benefits:**
• Unlimited messages
• Advanced insights  
• Profile optimization
• Priority support

**Ready to upgrade?** Just ask me "How can I upgrade?" and I'll help you get started!

Your free messages reset next month, or upgrade now for immediate access.`;

          if (isLimitExceeded) {
            return limitMessage;
          } else if (currentUsage >= limit - 1) {
            // Show upgrade prompt when user is close to limit
            return upgradeMessage;
          } else {
            return `You have ${
              limit - currentUsage
            } messages remaining this month. ${
              currentUsage >= 3 ? upgradeMessage : ""
            }`;
          }
        } catch (error) {
          return `Error checking usage limit: ${error.message}`;
        }
      },
      {
        name: "check_usage_and_suggest_upgrade",
        description:
          "Check if a user has reached their monthly message limit and provide appropriate upgrade messaging. Use this when users are approaching or have exceeded their free tier limits.",
        schema: z.object({
          userIdentifier: z
            .string()
            .describe("User identifier (chat_id, email, etc.)"),
          currentUsage: z
            .number()
            .describe("Current number of messages used this month"),
        }),
      }
    ),

    tool(
      async (input) => {
        try {
          // Generate premium feature explanation and upgrade call-to-action
          const premiumFeatures = `🌟 **LinkedIn AI Assistant - Premium Features**

**Unlimited Messaging**
• No monthly limits - chat as much as you need
• Instant responses without restrictions

**Advanced Analytics**
• Deep LinkedIn profile insights
• Content performance analysis  
• Network growth tracking
• Engagement optimization tips

**Profile Optimization**
• AI-powered profile reviews
• Headline and summary suggestions
• Skill recommendations
• Photo optimization advice

**Content Strategy**
• Post idea generation
• Trending topic insights
• Optimal posting times
• Hashtag recommendations

**Priority Support**
• Faster response times
• Direct access to our team
• Feature request priority

**💰 Pricing:** Just $9.97/month - Cancel anytime

**🚀 Ready to upgrade?** 
Simply say "I want to upgrade" or "Start my subscription" and I'll guide you through the secure checkout process!

**Questions about any features?** I'm here to help explain what Premium can do for your LinkedIn success!`;

          return premiumFeatures;
        } catch (error) {
          return `Error generating premium features info: ${error.message}`;
        }
      },
      {
        name: "explain_premium_features",
        description:
          "Provide detailed information about premium features and benefits when users ask about upgrading, pricing, or premium capabilities.",
        schema: z.object({}),
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
    ...createContentAnalysisTools(),
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
            headers["Authorization"] = `Bearer ${input.authToken}`;
          }
          // The backend's createCheckoutSession now only needs 'email'
          // Success/cancel URLs and Price ID are handled by the backend using .env variables
          const response = await axios.post(
            `${BASE_URL}/stripe/create-checkout-session`,
            { email: input.email },
            { headers }
          );

          if (response.data && response.data.url) {
            return response.data.url;
          } else {
            console.error("Checkout URL not found in response:", response.data);
            return "Could not retrieve payment link. The response from the server did not contain a URL. Please try again later or contact support.";
          }
        } catch (error) {
          console.error(
            "Error in initiate_payment_checkout tool:",
            error.response?.data || error.message
          );
          return `Error initiating payment: ${
            error.response?.data?.message ||
            "An unexpected error occurred. Please ensure your email is correct and try again."
          }`;
        }
      },
      {
        name: "initiate_payment_checkout",
        description:
          "Initiates a payment or subscription process by generating a Stripe Checkout link for the user. This should be used when a user expresses intent to subscribe or purchase. Requires the user's email address. If the user is already known to be authenticated with the system, their authToken can be provided.",
        schema: z.object({
          email: z
            .string()
            .email()
            .describe(
              "The user's email address. This email will be associated with the Stripe customer and the checkout session."
            ),
          authToken: z
            .string()
            .optional()
            .describe(
              "The JWT token if the user is already authenticated with the system. This helps associate the payment with an existing authenticated user if applicable, but is not strictly required to initiate checkout."
            ),
        }),
      }
    ),

    tool(
      async (input) => {
        try {
          const headers = {};
          if (input.authToken) {
            headers["Authorization"] = `Bearer ${input.authToken}`;
          }
          const response = await axios.post(
            `${BASE_URL}/stripe/customers`,
            {
              email: input.email,
              name: input.name,
              paymentMethodId: input.paymentMethodId,
            },
            { headers }
          );
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error managing Stripe customer: ${
            error.response?.data?.message || error.message
          }`;
        }
      },
      {
        name: "manage_stripe_customer",
        description:
          "Creates a new Stripe customer or retrieves an existing one. Can optionally attach a payment method. Requires authToken for authorization.",
        schema: z.object({
          email: z.string().describe("The customer's email address."),
          name: z.string().optional().describe("The customer's full name."),
          paymentMethodId: z
            .string()
            .optional()
            .describe(
              "A Stripe PaymentMethod ID (e.g., pm_xxxx) to attach to the customer and set as default for invoices/subscriptions."
            ),
          authToken: z
            .string()
            .describe("The JWT token for authorizing the API call."),
        }),
      }
    ),
    tool(
      async (input) => {
        try {
          const headers = {};
          if (input.authToken) {
            headers["Authorization"] = `Bearer ${input.authToken}`;
          }
          const response = await axios.post(
            `${BASE_URL}/stripe/payment-methods/${input.paymentMethodId}/attach`,
            {
              customerId: input.customerId,
            },
            { headers }
          );
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error attaching payment method: ${
            error.response?.data?.message || error.message
          }`;
        }
      },
      {
        name: "attach_payment_method_to_customer",
        description:
          "Attaches a given Stripe PaymentMethod ID to a specified Stripe Customer ID and sets it as the default for future invoices/subscriptions. Requires authToken for authorization.",
        schema: z.object({
          customerId: z
            .string()
            .describe(
              "The Stripe Customer ID (cus_xxxx) to attach the payment method to."
            ),
          paymentMethodId: z
            .string()
            .describe("The Stripe PaymentMethod ID (pm_xxxx) to attach."),
          authToken: z
            .string()
            .describe("The JWT token for authorizing the API call."),
        }),
      }
    ),
    tool(
      async (input) => {
        try {
          const headers = {};
          if (input.authToken) {
            headers["Authorization"] = `Bearer ${input.authToken}`;
          }
          const response = await axios.post(
            `${BASE_URL}/stripe/payment-intents`,
            {
              customerId: input.customerId,
              amount: input.amount,
              currency: input.currency,
              paymentMethodId: input.paymentMethodId,
              description: input.description,
            },
            { headers }
          );
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error creating payment intent: ${
            error.response?.data?.message || error.message
          }`;
        }
      },
      {
        name: "create_stripe_payment_intent",
        description:
          "Creates and optionally confirms a Stripe PaymentIntent for a one-off charge. Requires customerId, amount (in smallest currency unit, e.g., cents), currency, paymentMethodId, and authToken for authorization.",
        schema: z.object({
          customerId: z.string().describe("The Stripe Customer ID (cus_xxxx)."),
          amount: z
            .number()
            .int()
            .positive()
            .describe(
              "Amount to charge, in the smallest currency unit (e.g., cents for USD)."
            ),
          currency: z
            .string()
            .length(3)
            .describe("Three-letter ISO currency code (e.g., usd)."),
          paymentMethodId: z
            .string()
            .describe("A Stripe PaymentMethod ID (pm_xxxx) to charge."),
          description: z
            .string()
            .optional()
            .describe(
              "An arbitrary string to be displayed on the customer's credit card statement."
            ),
          authToken: z
            .string()
            .describe("The JWT token for authorizing the API call."),
        }),
      }
    ),
    tool(
      async (input) => {
        try {
          const headers = {};
          if (input.authToken) {
            headers["Authorization"] = `Bearer ${input.authToken}`;
          }
          const response = await axios.post(
            `${BASE_URL}/stripe/invoices`,
            {
              customerId: input.customerId,
              lineItems: input.lineItems,
              daysUntilDue: input.daysUntilDue,
              description: input.description,
            },
            { headers }
          );
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error creating draft invoice: ${
            error.response?.data?.message || error.message
          }`;
        }
      },
      {
        name: "create_stripe_draft_invoice",
        description:
          "Creates a new draft invoice in Stripe. Requires customerId, lineItems, and authToken for authorization. lineItems should be an array of objects, each with description, quantity, and amount (in smallest currency unit).",
        schema: z.object({
          customerId: z
            .string()
            .describe(
              "The Stripe Customer ID (cus_xxxx) for whom the invoice is created."
            ),
          lineItems: z
            .array(
              z.object({
                description: z
                  .string()
                  .describe("Description of the line item."),
                quantity: z
                  .number()
                  .int()
                  .positive()
                  .describe("Quantity of the item."),
                amount: z
                  .number()
                  .int()
                  .positive()
                  .describe(
                    "Unit amount in smallest currency unit (e.g., cents)."
                  ),
              })
            )
            .min(1)
            .describe("An array of line items for the invoice."),
          daysUntilDue: z
            .number()
            .int()
            .optional()
            .describe(
              "Number of days until the invoice is due. Defaults to Stripe's setting if not provided."
            ),
          description: z
            .string()
            .optional()
            .describe(
              "An optional description for the invoice, often displayed on the invoice PDF."
            ),
          authToken: z
            .string()
            .describe("The JWT token for authorizing the API call."),
        }),
      }
    ),
    tool(
      async (input) => {
        try {
          const headers = {};
          if (input.authToken) {
            headers["Authorization"] = `Bearer ${input.authToken}`;
          }
          const response = await axios.post(
            `${BASE_URL}/stripe/invoices/${input.invoiceId}/finalize`,
            null,
            { headers }
          );
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error finalizing invoice: ${
            error.response?.data?.message || error.message
          }`;
        }
      },
      {
        name: "finalize_stripe_draft_invoice",
        description:
          "Finalizes a draft invoice in Stripe, making it ready for payment. Requires the Invoice ID and authToken for authorization.",
        schema: z.object({
          invoiceId: z
            .string()
            .describe(
              "The Stripe Invoice ID (in_xxxx) of the draft invoice to finalize."
            ),
          authToken: z
            .string()
            .describe("The JWT token for authorizing the API call."),
        }),
      }
    ),
    tool(
      async (input) => {
        try {
          const headers = {};
          if (input.authToken) {
            headers["Authorization"] = `Bearer ${input.authToken}`;
          }
          const response = await axios.post(
            `${BASE_URL}/stripe/invoices/${input.invoiceId}/pay`,
            {
              paymentMethodId: input.paymentMethodId,
            },
            { headers }
          );
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error paying invoice: ${
            error.response?.data?.message || error.message
          }`;
        }
      },
      {
        name: "pay_stripe_invoice",
        description:
          "Pays a finalized Stripe invoice. Requires the Invoice ID and authToken for authorization. Optionally, a specific PaymentMethod ID can be provided to pay the invoice, otherwise the customer's default will be used.",
        schema: z.object({
          invoiceId: z
            .string()
            .describe("The Stripe Invoice ID (in_xxxx) to pay."),
          paymentMethodId: z
            .string()
            .optional()
            .describe(
              "An optional Stripe PaymentMethod ID (pm_xxxx) to use for this payment. If not provided, the customer's default payment method will be attempted."
            ),
          authToken: z
            .string()
            .describe("The JWT token for authorizing the API call."),
        }),
      }
    ),
    tool(
      async (input) => {
        try {
          const headers = {};
          if (input.authToken) {
            headers["Authorization"] = `Bearer ${input.authToken}`;
          }
          const response = await axios.post(
            `${BASE_URL}/stripe/subscriptions/create`,
            {
              email: input.email,
              name: input.name,
              payment_method_id: input.paymentMethodId, // Ensure snake_case for this specific API endpoint parameter
            },
            { headers }
          );
          return JSON.stringify(response.data);
        } catch (error) {
          return `Error creating subscription: ${
            error.response?.data?.message || error.message
          }`;
        }
      },
      {
        name: "create_stripe_subscription",
        description:
          "Creates a new Stripe subscription for a user. Requires email, a PaymentMethod ID, and authToken for authorization. A customer will be created/retrieved based on the email.",
        schema: z.object({
          email: z
            .string()
            .email()
            .describe(
              "The user's email address. A Stripe customer will be created or retrieved based on this email."
            ),
          name: z
            .string()
            .optional()
            .describe(
              "The user's full name. Used if a new customer needs to be created."
            ),
          paymentMethodId: z
            .string()
            .describe(
              "A Stripe PaymentMethod ID (pm_xxxx) to be attached to the customer and used for the subscription."
            ),
          authToken: z
            .string()
            .describe("The JWT token for authorizing the API call."),
        }),
      }
    ),
  ];
}

/**
 * Create tools for Content Analysis API endpoints (conceptual)
 * @returns {Array} Array of tool objects
 */
function createContentAnalysisTools() {
  return [
    tool(
      async (input) => {
        try {
          const { post_text, reference_author_style_id } = input;
          const apiKey = process.env.OPENAI_API_KEY;

          if (!apiKey) {
            return JSON.stringify({
              error:
                "OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.",
            });
          }

          const system_prompt = `You are an expert linguistic analyst specializing in differentiating human-written content from AI-generated content, particularly for LinkedIn posts. Your task is to analyze the provided LinkedIn post text and return a structured JSON analysis.
          If a 'Reference Author Style ID' is provided, use your general knowledge about common traits of LinkedIn Top Voices or influential writing styles to inform your mimicry suggestions, as if tailoring to that reference style.`;

          const user_prompt = `LinkedIn Post Text to Analyze:
"""
${post_text}
"""

${
  reference_author_style_id
    ? `Reference Author Style ID: "${reference_author_style_id}". Please factor this into your mimicry and humanization advice.`
    : ""
}

Please provide your analysis in a single, valid JSON object. The JSON object MUST include the following keys and structure:
{
  "original_post_summary": "A brief 1-2 sentence summary of the post.",
  "detected_human_touch_elements": {
    "personal_anecdotes_or_stories": "(boolean or brief description of observed elements)",
    "emotional_language_used": "(boolean or examples of emotional words/phrases)",
    "conversational_tone": "(boolean, e.g., use of questions, direct address)",
    "unique_voice_or_perspective": "(boolean or brief description of unique aspects)",
    "community_engagement_cues": "(e.g., explicit questions to audience, calls for interaction, use of hashtags to join conversations)"
  },
  "ai_generated_likelihood_score": "(A float between 0.0 (definitely human) and 1.0 (definitely AI). Provide a brief justification string for your score.)",
  "humanizer_suggestions": {
    "amplify_storytelling": "(Actionable suggestion string, e.g., 'Consider weaving in a brief personal experience related to the topic.')",
    "increase_personal_connection": "(Actionable suggestion string, e.g., 'Use more 'I' or 'we' statements to build rapport.')",
    "enhance_emotional_resonance": "(Actionable suggestion string, e.g., 'Incorporate words that convey more conviction or enthusiasm.')",
    "inject_relevant_emojis": "(Boolean or suggestion, e.g., 'A few well-placed emojis could enhance the tone.')"
  },
  "mimicry_parameters": {
    "target_tone_and_style": "(Descriptive string, e.g., 'Aim for an inspiring yet approachable tone, with a mix of declarative and reflective statements.')",
    "key_themes_or_angles_to_emphasize": "(Array of strings, e.g., ['innovation', 'personal_growth', 'lessons_learned'])",
    "suggested_vocabulary_or_phrasing": "(Array of strings, e.g., ['key takeaway', 'from my perspective', 'what are your thoughts?'])",
    "structural_notes": "(e.g., 'Balance paragraphs with bullet points for readability. Consider a strong opening hook and a closing call to engagement.')"
  }
}`;

          const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
              model: "gpt-4o", // Or your preferred model like gpt-4-turbo
              messages: [
                { role: "system", content: system_prompt },
                { role: "user", content: user_prompt },
              ],
              response_format: { type: "json_object" }, // Request JSON output
              temperature: 0.5, // Adjust for creativity vs. determinism
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
            }
          );

          if (
            response.data &&
            response.data.choices &&
            response.data.choices.length > 0
          ) {
            const llm_output = response.data.choices[0].message.content;
            // Attempt to parse, as OpenAI should return valid JSON string in 'content' when json_object mode is used
            try {
              return JSON.parse(llm_output);
            } catch (parseError) {
              console.error(
                "Error parsing LLM JSON response:",
                parseError,
                "Raw LLM output:",
                llm_output
              );
              return JSON.stringify({
                error: "Failed to parse LLM JSON response.",
                details: parseError.message,
                raw_output: llm_output,
              });
            }
          } else {
            console.error(
              "Invalid response structure from OpenAI API:",
              response.data
            );
            return JSON.stringify({
              error: "Invalid or empty response from OpenAI API.",
              details: response.data,
            });
          }
        } catch (error) {
          console.error(
            "Error in analyze_linkedin_post_human_touch (OpenAI call):",
            error.response ? error.response.data : error.message
          );
          return JSON.stringify({
            error: `Error calling OpenAI for post analysis: ${error.message}`,
            details: error.response ? error.response.data : error.stack,
          });
        }
      },
      {
        name: "analyze_linkedin_post_human_touch",
        description:
          "Analyzes a given LinkedIn post text to identify characteristics of human-like writing and distinguish it from AI-generated content. It can also research signs of human touch in writings and suggest parameters for humanization or mimicry.",
        schema: z.object({
          post_text: z
            .string()
            .describe("The text content of the LinkedIn post to analyze."),
          reference_author_style_id: z
            .string()
            .optional()
            .describe(
              "Optional: The ID or name of a LinkedIn Top Voice author whose writing style should be researched and used as a reference for mimicking human touch."
            ),
        }),
      }
    ),
  ];
}

module.exports = {
  getAllApiTools,
  createTopVoicesTools,
  createSearchTools,
  createStripeTools,
  createProfileTools,
  createAuthAndLicenseTools,
  createContentAnalysisTools,
};
