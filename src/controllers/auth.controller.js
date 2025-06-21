const jwt = require("jsonwebtoken");
const axios = require("axios");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { userStorage, subscriptionStorage } = require("../utils/storage");
const {
  verifySubscription: verifyStripeSubscription,
  getStripeSubscriptionsByEmail,
} = require("../utils/stripe");

/**
 * Register a new user (simplified for GPT)
 */
const register = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user already exists
    const existingUser = await userStorage.getUser(email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate a simple subscription ID (free tier)
    const subscriptionId = `free_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 15)}`;

    // Store user with free subscription
    const user = {
      email,
      name: name || email.split("@")[0],
      subscriptionId,
      createdAt: new Date().toISOString(),
      subscriptionType: "free",
    };

    // Store user in storage
    await userStorage.setUser(email, user);

    // Also store subscription
    await subscriptionStorage.setSubscription(subscriptionId, {
      active: true,
      type: "free",
      email,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      message: "User registered successfully",
      subscriptionId,
      subscriptionType: "free",
      user: {
        email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Failed to register user" });
  }
};

/**
 * Login a user and return subscription ID
 */
const login = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user exists
    const user = await userStorage.getUser(email);
    if (!user) {
      // Auto-register if not existing
      return register(req, res);
    }

    // Return subscription information
    res.json({
      message: "Login successful",
      subscriptionId: user.subscriptionId,
      subscriptionType: user.subscriptionType || "free",
      user: {
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Failed to login" });
  }
};

/**
 * Verify subscription status by ID
 */
const verifySubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.query;

    if (!subscriptionId) {
      return res.status(400).json({
        message: "Subscription ID is required",
        subscriptionUrl: "https://top-rated.pro/l/gpt?wanted=true",
      });
    }

    // Get subscription from storage
    const subscription = await subscriptionStorage.getSubscription(
      subscriptionId
    );

    if (!subscription) {
      return res.status(404).json({
        message: "Subscription not found",
        subscriptionUrl: "https://top-rated.pro/l/gpt?wanted=true",
      });
    }

    // Get user data to check subscription status
    const user = await userStorage.getUser(subscription.email);
    let hasValidSubscription = user?.subscription?.verified === true;

    // --- BEGIN MODIFICATION: Check for local manual subscriptions first ---
    if (!hasValidSubscription && subscription.email) {
      const localSubscriptions =
        await subscriptionStorage.getSubscriptionsForEmail(subscription.email);
      if (localSubscriptions && Object.keys(localSubscriptions).length > 0) {
        for (const subId in localSubscriptions) {
          const localSub = localSubscriptions[subId];
          // Assuming manually added subscriptions might have a specific type like 'manual_premium'
          // or are just marked active. Adjust this condition as needed.
          if (
            localSub.active === true &&
            (localSub.type === "premium" ||
              localSub.type === "manual_premium" ||
              localSub.type === "admin_added")
          ) {
            hasValidSubscription = true;
            // Update the main subscription object and user details if a valid local one is found
            Object.assign(subscription, localSub); // Prioritize local data
            subscription.id = subscriptionId; // Keep the original queried ID for consistency if needed

            if (user) {
              user.subscription = {
                verified: true,
                verifiedAt: new Date().toISOString(),
                localData: localSub, // Store local sub data
              };
              user.subscriptionType = localSub.type;
              await userStorage.setUser(subscription.email, user);
            }
            console.log(
              `Using locally verified subscription for ${subscription.email} (ID: ${subId})`
            );
            break; // Found an active local subscription
          }
        }
      }
    }
    // --- END MODIFICATION ---

    // If still not verified, check for Stripe subscriptions in local storage
    if (!hasValidSubscription && subscription.email) {
      // Check for Stripe subscriptions in our system
      const stripeSubscriptions =
        await subscriptionStorage.getSubscriptionsForEmail(subscription.email);

      if (stripeSubscriptions && Object.keys(stripeSubscriptions).length > 0) {
        for (const subId in stripeSubscriptions) {
          const stripeSub = stripeSubscriptions[subId];

          if (
            stripeSub.source &&
            stripeSub.source.includes("stripe") &&
            stripeSub.stripeSubscriptionId
          ) {
            // Verify with Stripe API
            const stripeResult = await verifyStripeSubscription(
              stripeSub.stripeSubscriptionId
            );

            if (stripeResult.success && stripeResult.subscription.active) {
              // Update user data with subscription information
              if (user) {
                user.subscription = {
                  verified: true,
                  verifiedAt: new Date().toISOString(),
                  stripeData: stripeResult.subscription,
                };
                user.subscriptionType = "premium";
                await userStorage.setUser(subscription.email, user);
              }

              // Update subscription
              subscription.type = "premium";
              subscription.active = true;
              subscription.updatedAt = new Date().toISOString();
              subscription.stripeData = stripeResult.subscription;
              await subscriptionStorage.setSubscription(
                subscriptionId,
                subscription
              );

              hasValidSubscription = true;
              break;
            }
          }
        }
      }
    }

    // If still not verified, fetch directly from Stripe API
    if (!hasValidSubscription && subscription.email) {
      console.log(
        `No locally stored Stripe subscriptions for ${subscription.email}, fetching directly from Stripe.`
      );

      const stripeResult = await getStripeSubscriptionsByEmail(
        subscription.email
      );

      if (stripeResult.success && stripeResult.subscriptions.length > 0) {
        // Find the first active subscription
        const activeStripeSubscription = stripeResult.subscriptions.find(
          (sub) => sub.active === true
        );

        if (activeStripeSubscription) {
          console.log(
            `Found active Stripe subscription for ${subscription.email} directly from Stripe API`
          );

          // Create a new subscription ID for our system to store this Stripe subscription
          const emailHash = Buffer.from(subscription.email)
            .toString("base64")
            .substring(0, 8);
          const newSubscriptionId = `stripe_${emailHash}_${Date.now()}`;

          // Create subscription data to store locally
          const newSubscriptionData = {
            id: newSubscriptionId,
            active: true,
            type: "premium",
            email: subscription.email,
            stripeSubscriptionId: activeStripeSubscription.id,
            stripeCustomerId: activeStripeSubscription.customer_id,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            source: "stripe_direct_fetch",
            stripeData: {
              subscriptionId: activeStripeSubscription.id,
              customerId: activeStripeSubscription.customer_id,
              status: activeStripeSubscription.status,
              currentPeriodEnd: activeStripeSubscription.current_period_end,
              ...(activeStripeSubscription.trial_start && {
                trial_start: activeStripeSubscription.trial_start,
              }),
              ...(activeStripeSubscription.trial_end && {
                trial_end: activeStripeSubscription.trial_end,
              }),
            },
          };

          // Store the new subscription locally for future use
          await subscriptionStorage.setSubscription(
            newSubscriptionId,
            newSubscriptionData
          );

          // Update the original subscription with the Stripe data
          subscription.type = "premium";
          subscription.active = true;
          subscription.updatedAt = new Date().toISOString();
          subscription.stripeData = newSubscriptionData.stripeData;
          await subscriptionStorage.setSubscription(
            subscriptionId,
            subscription
          );

          // Update user data
          if (user) {
            user.subscription = {
              verified: true,
              verifiedAt: new Date().toISOString(),
              stripeData: newSubscriptionData.stripeData,
            };
            user.subscriptionType = "premium";
            await userStorage.setUser(subscription.email, user);
          }

          hasValidSubscription = true;
        }
      }
    }

    // If user has a valid subscription, ensure they have premium access
    if (
      hasValidSubscription &&
      subscription.type !== "premium" &&
      subscription.type !== "manual_premium" &&
      subscription.type !== "admin_added"
    ) {
      // If it was a 'free' subscription that got validated (e.g. by Gumroad later, or if logic changes),
      // upgrade its type. For locally verified, this might be redundant if type is already set.
      subscription.type = "premium";
      subscription.active = true;
      subscription.updatedAt = new Date().toISOString();
      await subscriptionStorage.setSubscription(subscriptionId, subscription);
    }

    res.json({
      active: subscription.active,
      type: subscription.type,
      features: getFeaturesByType(subscription.type),
      hasValidSubscription,
    });
  } catch (error) {
    console.error("Error verifying subscription:", error);
    res.status(500).json({ message: "Failed to verify subscription" });
  }
};

/**
 * Get subscription status by ID
 */
const getSubscriptionStatus = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return res.status(400).json({
        message: "Subscription ID is required",
        subscriptionUrl:
          "https://linkedingpt.gumroad.com/l/subscribe?wanted=true",
      });
    }

    // Get subscription from storage
    const subscription = await subscriptionStorage.getSubscription(
      subscriptionId
    );

    if (!subscription) {
      return res.status(404).json({
        message: "Subscription not found",
        subscriptionUrl:
          "https://linkedingpt.gumroad.com/l/subscribe?wanted=true",
      });
    }

    res.json({
      active: subscription.active,
      type: subscription.type,
      features: getFeaturesByType(subscription.type),
      email: subscription.email,
      createdAt: subscription.createdAt,
    });
  } catch (error) {
    console.error("Error getting subscription status:", error);
    res.status(500).json({ message: "Failed to get subscription status" });
  }
};

/**
 * Helper function to get features by subscription type
 */
const getFeaturesByType = (type) => {
  switch (type) {
    case "premium":
      return {
        canSearch: true,
        canAnalyzeProfiles: true,
        searchLimit: 100,
        profileLimit: 10,
      };
    case "free":
    default:
      return {
        canSearch: false,
        canAnalyzeProfiles: false,
        searchLimit: 0,
        profileLimit: 0,
      };
  }
};

const checkSubscriptionByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    let activeSubscriptionData = null;
    let responseDetails = {};
    let user = await userStorage.getUser(email);

    // 1. Check local storage (manual subscriptions)
    const localSubscriptions =
      await subscriptionStorage.getSubscriptionsForEmail(email);
    if (localSubscriptions && Object.keys(localSubscriptions).length > 0) {
      for (const subId in localSubscriptions) {
        const localSub = localSubscriptions[subId];
        if (
          localSub.active === true &&
          (localSub.type === "premium" ||
            localSub.type === "manual_premium" ||
            localSub.type === "admin_added")
        ) {
          activeSubscriptionData = localSub;
          console.log(
            `Found active local subscription for ${email}: ID ${subId}, Type ${localSub.type}`
          );
          break;
        }
      }
    }

    if (activeSubscriptionData) {
      responseDetails = {
        active: activeSubscriptionData.active,
        type: activeSubscriptionData.type,
        source: activeSubscriptionData.source || "local",
        email: activeSubscriptionData.email,
        subscriptionId: activeSubscriptionData.id || user.subscriptionId,
        features: getFeaturesByType(activeSubscriptionData.type),
      };

      if (!user) {
        user = {
          email,
          name: email.split("@")[0],
          subscriptionId:
            activeSubscriptionData.id ||
            `manual_${email.replace(/[^a-zA-Z0-9]/g, "")}`,
          createdAt: new Date().toISOString(),
          subscriptionType: activeSubscriptionData.type,
        };
      }
      user.subscriptionId = activeSubscriptionData.id || user.subscriptionId;
      user.subscriptionType = activeSubscriptionData.type;
      user.subscription = {
        verified: true,
        verifiedAt: new Date().toISOString(),
        localData: activeSubscriptionData,
      };
      await userStorage.setUser(email, user);

      if (activeSubscriptionData.id) {
        // Ensure the main subscription object reflects this if it has an ID
        // and update its 'updatedAt' timestamp
        activeSubscriptionData.updatedAt = new Date().toISOString();
        await subscriptionStorage.setSubscription(
          activeSubscriptionData.id,
          activeSubscriptionData
        );
      }

      return res.json({ success: true, ...responseDetails });
    }

    // 2. If not found locally, check for Stripe subscriptions in local storage
    console.log(
      `No active local subscription for ${email}, checking locally stored Stripe subscriptions.`
    );

    const stripeSubscriptions =
      await subscriptionStorage.getSubscriptionsForEmail(email);

    if (stripeSubscriptions && Object.keys(stripeSubscriptions).length > 0) {
      for (const subId in stripeSubscriptions) {
        const stripeSub = stripeSubscriptions[subId];

        if (
          stripeSub.source &&
          stripeSub.source.includes("stripe") &&
          stripeSub.stripeSubscriptionId
        ) {
          // Verify with Stripe API
          const stripeResult = await verifyStripeSubscription(
            stripeSub.stripeSubscriptionId
          );

          if (stripeResult.success && stripeResult.subscription.active) {
            console.log(`Found active Stripe subscription for ${email}`);

            // Update the subscription data
            stripeSub.active = true;
            stripeSub.updatedAt = new Date().toISOString();
            stripeSub.stripeData = {
              ...stripeSub.stripeData,
              ...stripeResult.subscription,
            };

            await subscriptionStorage.setSubscription(subId, stripeSub);

            if (!user) {
              user = {
                email,
                name: email.split("@")[0],
                subscriptionId: subId,
                createdAt: new Date().toISOString(),
              };
            }

            user.subscriptionId = subId;
            user.subscriptionType = "premium";
            user.subscription = {
              verified: true,
              verifiedAt: new Date().toISOString(),
              stripeData: stripeResult.subscription,
            };

            await userStorage.setUser(email, user);

            responseDetails = {
              active: true,
              type: "premium",
              source: "stripe",
              email: email,
              subscriptionId: subId,
              features: getFeaturesByType("premium"),
            };

            return res.json({ success: true, ...responseDetails });
          }
        }
      }
    }

    // 3. If still not found, fetch directly from Stripe API
    console.log(
      `No locally stored Stripe subscriptions for ${email}, fetching directly from Stripe.`
    );

    const stripeResult = await getStripeSubscriptionsByEmail(email);

    if (stripeResult.success && stripeResult.subscriptions.length > 0) {
      // Find the first active subscription
      const activeStripeSubscription = stripeResult.subscriptions.find(
        (sub) => sub.active === true
      );

      if (activeStripeSubscription) {
        console.log(
          `Found active Stripe subscription for ${email} directly from Stripe API`
        );

        // Create a subscription ID for our system
        const emailHash = Buffer.from(email).toString("base64").substring(0, 8);
        const subscriptionId = `stripe_${emailHash}_${Date.now()}`;

        // Create subscription data to store locally
        const subscriptionData = {
          id: subscriptionId,
          active: true,
          type: "premium",
          email,
          stripeSubscriptionId: activeStripeSubscription.id,
          stripeCustomerId: activeStripeSubscription.customer_id,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          source: "stripe_direct_fetch",
          stripeData: {
            subscriptionId: activeStripeSubscription.id,
            customerId: activeStripeSubscription.customer_id,
            status: activeStripeSubscription.status,
            currentPeriodEnd: activeStripeSubscription.current_period_end,
            ...(activeStripeSubscription.trial_start && {
              trial_start: activeStripeSubscription.trial_start,
            }),
            ...(activeStripeSubscription.trial_end && {
              trial_end: activeStripeSubscription.trial_end,
            }),
          },
        };

        // Store the subscription locally for future use
        await subscriptionStorage.setSubscription(
          subscriptionId,
          subscriptionData
        );

        // Update or create user
        if (!user) {
          user = {
            email,
            name: stripeResult.customer?.name || email.split("@")[0],
            subscriptionId: subscriptionId,
            createdAt: new Date().toISOString(),
            subscriptionType: "premium",
          };
        }

        user.subscriptionId = subscriptionId;
        user.subscriptionType = "premium";
        user.subscription = {
          verified: true,
          verifiedAt: new Date().toISOString(),
          stripeData: subscriptionData.stripeData,
        };

        await userStorage.setUser(email, user);

        responseDetails = {
          active: true,
          type: "premium",
          source: "stripe_direct_fetch",
          email: email,
          subscriptionId: subscriptionId,
          features: getFeaturesByType("premium"),
        };

        return res.json({ success: true, ...responseDetails });
      }
    }

    // 4. If not found in any source
    console.log(
      `No active subscription found for ${email} in local storage or Stripe.`
    );
    return res.status(404).json({
      success: false,
      message: "No valid subscription found for this user",
    });
  } catch (error) {
    console.error(
      `Error in checkSubscriptionByEmail for ${req.params.email}:`,
      error
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to check subscription" });
  }
};

module.exports = {
  register,
  login,
  verifySubscription,
  getSubscriptionStatus,
  getFeaturesByType,
  checkSubscriptionByEmail,
};
