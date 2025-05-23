const jwt = require("jsonwebtoken");
const { userStorage, subscriptionStorage } = require("../utils/storage");
const stripeUtils = require("../utils/stripe"); // Added for Stripe utilities
const path = require("path");
const fs = require("fs").promises;
const topVoicesController = require("./topVoices.controller");
const { topVoicesCache } = require("./topVoices.controller");
const NodeCache = require("node-cache");
const {
  verifySubscription: verifyStripeSubscription,
  cancelSubscription: cancelStripeSubscription,
} = require("../utils/stripe");

// Import subscription storage module to access the cache directly
const subscriptionStorageModule = require("../storage/subscription.storage");

// File paths for top voices data
const DATA_DIR = path.join(__dirname, "..", "data");
const TOP_VOICES_FILE = path.join(DATA_DIR, "top_voices.json");

/**
 * Login admin user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Use admin credentials from environment variables
    if (email === process.env.ADMIN_USER_NAME && password === process.env.ADMIN_USER_PASSWORD) {
      // Generate JWT token
      const token = jwt.sign(
        {
          email: process.env.ADMIN_USER_NAME, // Use admin email from env
          name: "Admin User", // You might want to make this configurable too
          role: "admin",
        },
        process.env.JWT_SECRET, // Use JWT_SECRET from env directly
        { expiresIn: "24h" }
      );

      res.json({
        message: "Login successful",
        token,
        user: {
          email: process.env.ADMIN_USER_NAME,
          name: "Admin User",
          role: "admin",
        },
      });
    } else {
      return res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get all users with pagination and search
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getUsers = async (req, res) => {
  try {
    const { page = 1, search = "" } = req.query;
    const pageSize = 10;
    const pageNumber = parseInt(page);

    // Get all users from local storage
    const allLocalUsers = await userStorage.getAllUsers();
    let usersArray = Object.values(allLocalUsers);

    // Fetch all Stripe subscriptions to enrich user data
    // const stripeSubscriptionsResult = await require('../utils/stripe').getAllStripeSubscriptions('all', 1000); // Moved down for logging
    console.log('[AdminController] Fetching Stripe subscriptions for user list enrichment...');
    const stripeSubscriptionsResult = await require('../utils/stripe').getAllStripeSubscriptions('all', 1000); // Fetch a large number
    console.log('[AdminController] stripeSubscriptionsResult:', JSON.stringify(stripeSubscriptionsResult, null, 2)); // Log the full result

    const stripeSubscriptionsMap = new Map();
    if (stripeSubscriptionsResult.success && stripeSubscriptionsResult.data) {
      stripeSubscriptionsResult.data.forEach(sub => {
        if (sub.customer_id) { // Use customer_id for mapping
          // Store the most relevant (e.g., active or latest) subscription if multiple exist for a customer_id
          const existingSub = stripeSubscriptionsMap.get(sub.customer_id);
          if (!existingSub || 
              (sub.status === 'active' && existingSub.status !== 'active') || 
              (new Date(sub.created) > new Date(existingSub.created))) {
            stripeSubscriptionsMap.set(sub.customer_id, sub);
          }
        }
      });
    }

    console.log('[AdminController] stripeSubscriptionsMap (keyed by customer_id) size:', stripeSubscriptionsMap.size);
    // Enrich local users with Stripe subscription data
    // Log all user emails from userStorage and check for the specific user
    console.log('[AdminController] Emails in userStorage:', JSON.stringify(usersArray.map(u => u.email), null, 2));
    const targetUser = usersArray.find(user => user.email === 'raheesahmed256@gmail.com');
    if (targetUser) {
      console.log('[AdminController] Local user object for raheesahmed256@gmail.com BEFORE enrichment:', JSON.stringify(targetUser, null, 2));
    } else {
      console.log('[AdminController] User raheesahmed256@gmail.com NOT FOUND in local userStorage during getUsers.');
    }

    const enrichedUsers = usersArray.map(user => {
      // Try to find Stripe subscription using user.stripeCustomerId if available
      const stripeSub = user.stripeCustomerId ? stripeSubscriptionsMap.get(user.stripeCustomerId) : null;
      return {
        ...user,
        stripeSubscriptionId: stripeSub?.id,
        stripeSubscriptionStatus: stripeSub?.status,
        stripePlan: stripeSub?.plan_nickname || (stripeSub?.plan_id ? `${stripeSub.plan_amount / 100} ${stripeSub.plan_currency?.toUpperCase()} / ${stripeSub.plan_interval}` : null),
        isStripeCustomer: !!stripeSub || !!user.stripeCustomerId, // User is a stripe customer if they have a stripeCustomerId or an active sub mapped
        subscriptionSource: stripeSub ? 'stripe' : (user.subscriptionId ? (user.subscriptionId.toLowerCase().includes('gumroad') ? 'gumroad' : 'manual') : 'none'),
      };
    });

    // Filter users by search term if provided
    let filteredUsers = enrichedUsers;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = enrichedUsers.filter(
        (user) =>
          user.email.toLowerCase().includes(searchLower) ||
          (user.name && user.name.toLowerCase().includes(searchLower)) ||
          (user.stripeSubscriptionStatus && user.stripeSubscriptionStatus.toLowerCase().includes(searchLower)) ||
          (user.stripePlan && user.stripePlan.toLowerCase().includes(searchLower))
      );
    }

    // Get total count for pagination
    const total = filteredUsers.length;

    // Paginate results
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    res.json({
      users: paginatedUsers,
      pagination: {
        total,
        page: pageNumber,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      hasMore: endIndex < total,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch users", error: error.message });
  }
};

/**
 * Get a specific user by email
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    // Get user from local storage
    const localUser = await userStorage.getUser(email);

    if (!localUser) {
      return res.status(404).json({ message: "User not found locally" });
    }

    // Start with local user data
    let combinedUser = { ...localUser };

    // If Stripe customer ID exists, fetch and merge Stripe data
    if (localUser.stripeCustomerId) {
      try {
        const stripeCustomerData = await stripeUtils.getCustomer(localUser.stripeCustomerId);
        if (stripeCustomerData.success && stripeCustomerData.customer) {
          // Merge Stripe customer details (Stripe's data might be more current for name/email)
          combinedUser.name = stripeCustomerData.customer.name || localUser.name;
          // Note: Syncing email can be complex if it's a primary key. For now, let's assume local email is the key.
          // combinedUser.email = stripeCustomerData.customer.email || localUser.email; 
          combinedUser.stripeCustomerDetails = stripeCustomerData.customer; // Store all Stripe customer details
        }

        const stripeSubscriptionsData = await stripeUtils.getCustomerSubscriptions(localUser.stripeCustomerId);
        if (stripeSubscriptionsData.success && stripeSubscriptionsData.subscriptions) {
          combinedUser.stripeSubscriptions = stripeSubscriptionsData.subscriptions;
          // Determine an overall subscription status or type based on Stripe subscriptions
          if (stripeSubscriptionsData.subscriptions.length > 0) {
            const activeStripeSub = stripeSubscriptionsData.subscriptions.find(s => s.status === 'active' || s.status === 'trialing');
            if (activeStripeSub) {
              combinedUser.activeStripeSubscription = activeStripeSub; // Store the primary active Stripe sub
              combinedUser.subscriptionStatus = activeStripeSub.status;
              combinedUser.active = combinedUser.active !== undefined ? combinedUser.active : true; // If user has active Stripe sub, assume active unless explicitly set otherwise locally

              // Safely determine subscriptionType
              let subTypeDetail = 'Premium'; // Default
              if (activeStripeSub.items && activeStripeSub.items.data && activeStripeSub.items.data.length > 0) {
                const firstItem = activeStripeSub.items.data[0];
                if (firstItem && firstItem.price) {
                  subTypeDetail = firstItem.price.nickname || firstItem.price.product?.name || 'Premium';
                }
              }
              combinedUser.subscriptionType = `Stripe: ${subTypeDetail}`;
            } else {
                // No active Stripe sub, check for past due etc.
                const latestSub = stripeSubscriptionsData.subscriptions.sort((a,b) => b.created - a.created)[0];
                if(latestSub) combinedUser.subscriptionStatus = latestSub.status;
            }
          }
        }
      } catch (stripeError) {
        console.error(`Error fetching Stripe data for user ${email} (Stripe ID ${localUser.stripeCustomerId}):`, stripeError);
        // Optionally, add a note to combinedUser that Stripe data couldn't be fetched
        combinedUser.stripeDataError = true;
        combinedUser.stripeDataErrorMessage = stripeError.message;
      }
    }

    res.json(combinedUser);
  } catch (error) {
    console.error("Error fetching user:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch user", error: error.message });
  }
};

/**
 * Update a user's information
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateUser = async (req, res) => {
  try {
    const { email } = req.params;
    const updatedUserData = req.body;

    // Get existing user
    const user = await userStorage.getUser(email);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Merge existing user with updated data
    const updatedUser = {
      ...user,
      ...updatedUserData,
      // Ensure email doesn't change as it's the primary key
      email,
      // Update the timestamp
      updatedAt: new Date().toISOString(),
    };

    // Update user in storage
    await userStorage.setUser(email, updatedUser);

    // If subscription type is changed, update related subscription data
    if (
      updatedUserData.subscriptionType &&
      user.subscriptionType !== updatedUserData.subscriptionType
    ) {
      // If changed to premium, ensure they have a subscription ID
      if (updatedUserData.subscriptionType === "premium") {
        // Create a subscription ID if they don't have one
        if (!updatedUser.subscriptionId) {
          updatedUser.subscriptionId = `premium_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 15)}`;

          // Update user with new subscription ID
          await userStorage.setUser(email, updatedUser);
        }

        // Create or update subscription record
        await subscriptionStorage.setSubscription(updatedUser.subscriptionId, {
          id: updatedUser.subscriptionId,
          email: updatedUser.email,
          type: "premium",
          active: true,
          createdAt: updatedUser.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else if (
        updatedUserData.subscriptionType === "free" &&
        user.subscriptionId
      ) {
        // If changed from premium to free, deactivate subscription
        const subscription = await subscriptionStorage.getSubscription(
          user.subscriptionId
        );

        if (subscription) {
          subscription.active = false;
          subscription.updatedAt = new Date().toISOString();
          await subscriptionStorage.setSubscription(
            user.subscriptionId,
            subscription
          );
        }
      }
    }

    res.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res
      .status(500)
      .json({ message: "Failed to update user", error: error.message });
  }
};

/**
 * Activate a user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const activateUser = async (req, res) => {
  try {
    const { email } = req.params;

    // Get existing user
    const user = await userStorage.getUser(email);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Set user as active
    user.active = true;
    user.updatedAt = new Date().toISOString();

    // Update user in storage
    await userStorage.setUser(email, user);

    // If user has a subscription, activate it too
    if (user.subscriptionId) {
      const subscription = await subscriptionStorage.getSubscription(
        user.subscriptionId
      );

      if (subscription) {
        subscription.active = true;
        subscription.updatedAt = new Date().toISOString();
        await subscriptionStorage.setSubscription(
          user.subscriptionId,
          subscription
        );
      }
    }

    res.json({
      message: "User activated successfully",
      user,
    });
  } catch (error) {
    console.error("Error activating user:", error);
    res
      .status(500)
      .json({ message: "Failed to activate user", error: error.message });
  }
};

/**
 * Deactivate a user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deactivateUser = async (req, res) => {
  try {
    const { email } = req.params;

    // Get existing user
    const user = await userStorage.getUser(email);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Set user as inactive
    user.active = false;
    user.updatedAt = new Date().toISOString();

    // Update user in storage
    await userStorage.setUser(email, user);

    // If user has a subscription, deactivate it too
    if (user.subscriptionId) {
      const subscription = await subscriptionStorage.getSubscription(
        user.subscriptionId
      );

      if (subscription) {
        subscription.active = false;
        subscription.updatedAt = new Date().toISOString();
        await subscriptionStorage.setSubscription(
          user.subscriptionId,
          subscription
        );
      }
    }

    res.json({
      message: "User deactivated successfully",
      user,
    });
  } catch (error) {
    console.error("Error deactivating user:", error);
    res
      .status(500)
      .json({ message: "Failed to deactivate user", error: error.message });
  }
};

/**
 * Delete a user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deleteUser = async (req, res) => {
  try {
    const { email } = req.params;

    // Get existing user
    const user = await userStorage.getUser(email);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete user
    await userStorage.deleteUser(email);

    // If user has a subscription, delete it too
    if (user.subscriptionId) {
      await subscriptionStorage.deleteSubscription(user.subscriptionId);
    }

    res.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res
      .status(500)
      .json({ message: "Failed to delete user", error: error.message });
  }
};

/**
 * Get all subscriptions
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getSubscriptions = async (req, res) => {
  try {
    console.log("Fetching subscriptions, prioritizing Stripe...");

    // Fetch all subscriptions from Stripe
    const stripeSubscriptionsResult = await require('../utils/stripe').getAllStripeSubscriptions('all', 100); // Fetch all, up to 100

    let finalSubscriptions = [];
    const sourceCount = { stripe: 0, local: 0, gumroad: 0, manual: 0, unknown: 0 };

    if (stripeSubscriptionsResult.success && stripeSubscriptionsResult.data) {
      console.log(`Fetched ${stripeSubscriptionsResult.data.length} subscriptions from Stripe.`);
      sourceCount.stripe = stripeSubscriptionsResult.data.length;

      // Map Stripe subscriptions to the desired format
      finalSubscriptions = stripeSubscriptionsResult.data.map(sub => ({
        id: sub.id,
        email: sub.customer_email,
        userName: sub.customer_name, // Added userName from Stripe customer
        type: sub.plan_nickname || (sub.plan_amount ? `${sub.plan_amount / 100} ${sub.plan_currency.toUpperCase()} / ${sub.plan_interval}` : 'premium'), // More descriptive type
        active: sub.status === 'active' || sub.status === 'trialing',
        status: sub.status, // Raw Stripe status
        source: 'stripe',
        createdAt: sub.created,
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
        canceledAt: sub.canceled_at,
        endedAt: sub.ended_at,
        trialStart: sub.trial_start,
        trialEnd: sub.trial_end,
        planId: sub.plan_id,
        planAmount: sub.plan_amount, // Explicitly pass plan amount in cents
        planCurrency: sub.plan_currency, // Explicitly pass plan currency
        customerId: sub.customer_id,
        // You can add more fields from the 'sub' object if needed
      }));
    } else {
      console.error("Failed to fetch subscriptions from Stripe:", stripeSubscriptionsResult.message);
      // Optionally, fall back to local storage or return an error
      // For now, we'll continue to see if there are any non-Stripe local subs
    }

    // Optionally, augment with or list separately any purely local/manual/Gumroad subscriptions
    // if they are still relevant and not managed via Stripe.
    const localLegacySubscriptions = await subscriptionStorage.getAllSubscriptions();
    const localUsers = await userStorage.getAllUsers();

    Object.values(localLegacySubscriptions).forEach(localSub => {
      if (!finalSubscriptions.find(fs => fs.id === localSub.id)) { // Avoid duplicates if Stripe already returned it
        const user = Object.values(localUsers).find(u => u.email === localSub.email);
        const subSource = localSub.source || (localSub.id && localSub.id.toLowerCase().includes('gumroad') ? 'gumroad' : 'manual');
        
        sourceCount[subSource] = (sourceCount[subSource] || 0) + 1;
        if (subSource === 'stripe' && sourceCount.stripe > 0 && stripeSubscriptionsResult.success) {
          // This was likely an old local Stripe record, already counted.
        } else {
            finalSubscriptions.push({
                id: localSub.id,
                email: localSub.email,
                userName: user?.name,
                type: localSub.type || 'unknown',
                active: localSub.active === undefined ? true : localSub.active, // Default to true if undefined
                status: localSub.active ? 'active' : 'inactive', // Simplified status for local
                source: subSource,
                createdAt: localSub.createdAt || user?.createdAt,
                updatedAt: localSub.updatedAt, // Keep local updatedAt if available
            });
        }
      }
    });

    console.log(`Final count: ${finalSubscriptions.length} total subscriptions processed.`);
    console.log("Subscriptions by source:", sourceCount);

    // Log details for verification
    // finalSubscriptions.forEach((sub, index) => {
    //   console.log(
    //     `[${index + 1}] ID: ${sub.id}, Email: ${sub.email}, Name: ${sub.userName}, Source: ${sub.source}, Status: ${sub.status}, Active: ${sub.active}, Type: ${sub.type}`
    //   );
    // });

    res.json({
      subscriptions: finalSubscriptions,
      total: finalSubscriptions.length,
      sourceBreakdown: sourceCount,
    });

  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch subscriptions", error: error.message });
  }
};

/**
 * Activate a subscription
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const activateSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    // Get subscription
    const subscription = await subscriptionStorage.getSubscription(
      subscriptionId
    );

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    // Set subscription as active
    subscription.active = true;
    subscription.updatedAt = new Date().toISOString();

    // Update subscription in storage
    await subscriptionStorage.setSubscription(subscriptionId, subscription);

    // Update user if found
    if (subscription.email) {
      const user = await userStorage.getUser(subscription.email);

      if (user) {
        user.active = true;

        // If subscription type mismatch, update user
        if (user.subscriptionType !== subscription.type) {
          user.subscriptionType = subscription.type;
        }

        user.updatedAt = new Date().toISOString();
        await userStorage.setUser(subscription.email, user);
      }
    }

    res.json({
      message: "Subscription activated successfully",
      subscription,
    });
  } catch (error) {
    console.error("Error activating subscription:", error);
    res.status(500).json({
      message: "Failed to activate subscription",
      error: error.message,
    });
  }
};

/**
 * Deactivate a subscription
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deactivateSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return res.status(400).json({ message: "Subscription ID is required" });
    }

    const subscription = await subscriptionStorage.getSubscription(
      subscriptionId
    );

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    // If it's a Gumroad subscription, attempt to cancel it on Gumroad
    // Check for gumroadSubscriptionId, or the relevant field in your subscription object
    const gumroadSubIdToCancel =
      subscription.gumroadSubscriptionId ||
      (subscription.gumroadData && subscription.gumroadData.subscriptionId);
    if (
      gumroadSubIdToCancel &&
      (subscription.source === "gumroad" ||
        subscription.source === "gumroad_api" ||
        subscription.source === "gumroad_api_linked")
    ) {
      console.log(`Deactivating Gumroad subscription ${gumroadSubIdToCancel}`);
      const cancelResult = await cancelGumroadSubscription(
        gumroadSubIdToCancel
      );
      if (!cancelResult.success) {
        console.warn(
          `Failed to cancel Gumroad subscription ${gumroadSubIdToCancel}: ${cancelResult.message}. Proceeding with local deactivation.`
        );
        // Optionally, you might want to return an error or handle this differently
      } else {
        console.log(
          `Successfully cancelled Gumroad subscription ${gumroadSubIdToCancel}.`
        );
      }
    }

    // If it's a Stripe subscription, attempt to cancel it on Stripe
    const stripeSubIdToCancel =
      subscription.stripeSubscriptionId ||
      (subscription.stripeData && subscription.stripeData.subscriptionId);
    if (
      stripeSubIdToCancel &&
      (subscription.source === "stripe" ||
        subscription.source === "stripe_webhook" ||
        subscription.source === "stripe_api")
    ) {
      console.log(`Deactivating Stripe subscription ${stripeSubIdToCancel}`);
      const cancelResult = await cancelStripeSubscription(stripeSubIdToCancel);
      if (!cancelResult.success) {
        console.warn(
          `Failed to cancel Stripe subscription ${stripeSubIdToCancel}: ${cancelResult.message}. Proceeding with local deactivation.`
        );
        // Optionally, you might want to return an error or handle this differently
      } else {
        console.log(
          `Successfully cancelled Stripe subscription ${stripeSubIdToCancel}.`
        );
      }
    }

    // Deactivate locally
    subscription.active = false;
    subscription.updatedAt = new Date().toISOString();
    subscription.status = "deactivated"; // Add a status field

    await subscriptionStorage.setSubscription(subscriptionId, subscription);

    res.json({
      message: "Subscription deactivated successfully",
      subscription,
    });
  } catch (error) {
    console.error("Error deactivating subscription:", error);
    res.status(500).json({
      message: "Failed to deactivate subscription",
      error: error.message,
    });
  }
};

/**
 * Delete a subscription (locally and attempt cancellation on external provider if applicable)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deleteSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return res.status(400).json({ message: "Subscription ID is required" });
    }

    const subscription = await subscriptionStorage.getSubscription(
      subscriptionId
    );

    if (!subscription) {
      // If already deleted or never existed, consider it a success for idempotency
      return res
        .status(200)
        .json({ message: "Subscription not found or already deleted" });
    }

    const userEmail = subscription.email;

    // If it's a Stripe subscription, attempt to cancel it on Stripe
    const stripeSubIdToCancel =
      subscription.stripeSubscriptionId ||
      (subscription.stripeData && subscription.stripeData.subscriptionId);
    if (
      stripeSubIdToCancel &&
      (subscription.source === "stripe" ||
        subscription.source === "stripe_webhook" ||
        subscription.source === "stripe_api")
    ) {
      console.log(
        `Deleting Stripe subscription ${stripeSubIdToCancel} as part of local deletion.`
      );
      const cancelResult = await cancelStripeSubscription(stripeSubIdToCancel);
      if (!cancelResult.success) {
        console.warn(
          `Failed to cancel Stripe subscription ${stripeSubIdToCancel} during deletion: ${cancelResult.message}. Proceeding with local deletion.`
        );
        // Decide if you want to stop deletion if Stripe fails. For now, proceeding.
      } else {
        console.log(
          `Successfully cancelled Stripe subscription ${stripeSubIdToCancel} during deletion.`
        );
      }
    }

    // Delete locally
    await subscriptionStorage.deleteSubscription(subscriptionId);

    // Optional: Clean up user record if they were linked to this subscription
    if (userEmail) {
      const user = await userStorage.getUser(userEmail);
      if (user && user.subscriptionId === subscriptionId) {
        user.subscriptionId = null;
        user.subscriptionType = "free"; // or null
        user.subscription = null; // Clear subscription details
        user.updatedAt = new Date().toISOString();
        await userStorage.setUser(userEmail, user);
        console.log(
          `Cleaned up user record for ${userEmail} after deleting subscription ${subscriptionId}`
        );
      }
    }

    res.json({ message: "Subscription deleted successfully" });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    res.status(500).json({
      message: "Failed to delete subscription",
      error: error.message,
    });
  }
};

/**
 * Get system statistics and recent activity
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getStats = async (req, res) => {
  try {
    // Get all users
    const allUsers = await userStorage.getAllUsers();
    const users = Object.values(allUsers);

    // Calculate stats from users
    const totalUsers = users.length;
    const activeUsers = users.filter((user) => user.active).length;
    const freeUsers = users.filter(
      (user) => !user.subscriptionType || user.subscriptionType === "free"
    ).length;
    const premiumUsers = users.filter(
      (user) => user.subscriptionType === "premium"
    ).length;

    // Fetch all subscriptions from Stripe for accurate MRR and active subscriptions count
    const stripeSubscriptionsResult = await require('../utils/stripe').getAllStripeSubscriptions('active', 1000); // Fetch all active, up to a high limit
    
    let activeStripeSubscriptionsCount = 0;
    let monthlyRevenueCents = 0;

    if (stripeSubscriptionsResult.success && stripeSubscriptionsResult.data) {
      activeStripeSubscriptionsCount = stripeSubscriptionsResult.data.length; // Assuming 'active' filter in getAllStripeSubscriptions works
      stripeSubscriptionsResult.data.forEach(sub => {
        // Ensure the subscription is active and has a monthly plan amount
        if ((sub.status === 'active' || sub.status === 'trialing') && sub.plan_interval === 'month' && typeof sub.plan_amount === 'number') {
          monthlyRevenueCents += sub.plan_amount;
        }
      });
    } else {
      console.warn('Could not fetch Stripe subscriptions for stats calculation, MRR might be inaccurate.');
      // Fallback or error handling if Stripe fetch fails - for now, MRR will be 0
    }

    const activeSubscriptions = activeStripeSubscriptionsCount; // Use count from Stripe
    const monthlyRevenue = parseFloat((monthlyRevenueCents / 100).toFixed(2));

    // Calculate new users in the last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const newUsers7d = users.filter((user) => {
      const createdAt = new Date(user.createdAt);
      return createdAt >= sevenDaysAgo;
    }).length;

    // Calculate conversion rate (premium users / total users)
    const conversionRate =
      totalUsers > 0 ? Math.round((premiumUsers / totalUsers) * 100) : 0;

    // Mock API requests in the last 24 hours
    const apiRequests24h = 0; // Placeholder: Actual API call tracking to be implemented.

    // Generate mock recent activity
    const recentActivity = generateMockActivity(users);

    res.json({
      stats: {
        totalUsers: totalUsers,
        activeSubscriptions: activeSubscriptions,
        apiCallsToday: apiRequests24h, // Renamed from apiRequests24h
      },
      activity: recentActivity,
      // You can include other stats here if needed by other parts of the admin panel
      // or for more detailed views, but they are not directly used by the current dashboard cards.
      additionalStats: {
        activeUsers,
        freeUsers,
        premiumUsers,
        monthlyRevenue,
        newUsers7d,
        conversionRate
      }
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch stats", error: error.message });
  }
};

/**
 * Generate mock activity data
 * @param {Array} users - List of users
 * @returns {Array} - Array of activity objects
 */
const generateMockActivity = (users) => {
  const actions = [
    "logged in",
    "analyzed profile",
    "performed search",
    "updated subscription",
    "viewed top voices",
    "verified license",
  ];

  const activity = [];
  const activityCount = Math.min(20, users.length * 2);

  for (let i = 0; i < activityCount; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];

    const timestamp = new Date();
    timestamp.setMinutes(
      timestamp.getMinutes() - Math.floor(Math.random() * 10000)
    );

    activity.push({
      timestamp: timestamp.toISOString(),
      message: `${randomUser.email} ${randomAction}.`,
      // Keep original fields if they might be useful for more detailed views later
      user: randomUser.email,
      action: randomAction,
      details: `IP: 192.168.${Math.floor(Math.random() * 255)}.${Math.floor(
        Math.random() * 255
      )}`
    });
  }

  // Sort by timestamp (newest first)
  return activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

/**
 * Get system settings
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getSettings = async (req, res) => {
  try {
    // In a real application, these would be fetched from a database
    // For this demo, we'll return mock settings
    const settings = {
      rateLimit: 100,
      cacheDuration: 60,
      gumroadWebhookUrl: "https://api.example.com/webhooks/gumroad",
      linkedinApiKey: "li_12345abcdef",
    };

    res.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch settings", error: error.message });
  }
};

/**
 * Update system settings
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateSettings = async (req, res) => {
  try {
    const newSettings = req.body;

    // In a real application, these would be saved to a database
    // For this demo, we'll just return the updated settings

    res.json({
      message: "Settings updated successfully",
      settings: newSettings,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    res
      .status(500)
      .json({ message: "Failed to update settings", error: error.message });
  }
};

/**
 * Get recent system activity
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getActivity = async (req, res) => {
  try {
    // Get all users
    const allUsers = await userStorage.getAllUsers();
    const users = Object.values(allUsers);

    // Generate mock activity
    const recentActivity = generateMockActivity(users);

    res.json({
      activity: recentActivity,
    });
  } catch (error) {
    console.error("Error fetching activity:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch activity", error: error.message });
  }
};

/**
 * Get top voices statistics and data for admin
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getTopVoicesStats = async (req, res) => {
  try {
    console.log("Getting top voices stats...");

    // Ensure data is initialized and potentially processed
    if (!topVoicesCache.has("topVoices")) {
      await topVoicesController.refreshTopVoicesData(); // Use the initialize function from the controller
    }

    const topVoicesData = topVoicesCache.get("topVoices");

    // Initialize counters
    let totalTopics = 0;
    let totalAuthors = 0;
    let totalPosts = 0;
    let topicStats = [];
    let lastUpdated = null; // Initialize lastUpdated

    if (
      topVoicesData &&
      topVoicesData.topics &&
      Array.isArray(topVoicesData.topics)
    ) {
      // Data is structured with topics (processed)
      console.log("Processing structured data with topics...");
      totalTopics = topVoicesData.topics.length;
      lastUpdated = topVoicesData.lastUpdated || new Date().toISOString(); // Use timestamp from data if available

      topVoicesData.topics.forEach((topic) => {
        if (topic.authors && Array.isArray(topic.authors)) {
          const authorCount = topic.authors.length;
          let postCount = 0;

          topic.authors.forEach((author) => {
            if (author.posts && Array.isArray(author.posts)) {
              postCount += author.posts.length;
            }
          });

          totalAuthors += authorCount;
          totalPosts += postCount;

          topicStats.push({
            topic: topic.tag || "Unknown",
            authorCount,
            postCount,
          });
        } else {
          // Handle topic entry without authors array
          topicStats.push({
            topic: topic.tag || "Unknown",
            authorCount: 0,
            postCount: 0,
          });
        }
      });
    } else if (topVoicesData && Array.isArray(topVoicesData)) {
      // This case handles if the cache somehow still holds the raw array
      // It might indicate an issue in initialization/caching, but we handle it defensively
      console.warn(
        "Cache contained raw post array, processing directly (might indicate initialization issue)"
      );
      const processedAuthors =
        topVoicesController.processPostsIntoAuthors(topVoicesData); // Assuming processPostsIntoAuthors is accessible or moved
      totalTopics = 1; // Treat as one general topic if raw
      totalAuthors = processedAuthors.length;
      totalPosts = topVoicesData.length;
      topicStats.push({
        topic: "All Posts (Raw Data)",
        authorCount: totalAuthors,
        postCount: totalPosts,
      });
      lastUpdated = new Date().toISOString(); // No specific timestamp for raw data
    } else {
      console.log("No valid topVoicesData available in cache or file.");
      // Attempt to fetch/re-initialize again as a fallback
      try {
        await topVoicesController.refreshTopVoicesData();
        const freshData = topVoicesCache.get("topVoices");
        if (freshData && freshData.topics && Array.isArray(freshData.topics)) {
          // Recalculate based on freshly loaded data (code omitted for brevity, similar to above)
          console.log("Recalculating stats after fallback refresh...");
        } else {
          console.error("Fallback refresh failed to load valid data.");
        }
      } catch (refreshError) {
        console.error("Error during fallback refresh:", refreshError);
      }
    }

    console.log(
      `Final Stats - Topics: ${totalTopics}, Authors: ${totalAuthors}, Posts: ${totalPosts}`
    );

    res.json({
      totalTopics,
      totalAuthors,
      totalPosts,
      topicStats,
      lastUpdated: lastUpdated || new Date().toISOString(), // Ensure lastUpdated is always set
    });
  } catch (error) {
    console.error("Error processing top voices stats:", error);
    res.status(500).json({
      message: "Failed to process top voices statistics",
      error: error.message,
    });
  }
};

/**
 * Refresh top voices data
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const refreshTopVoices = async (req, res) => {
  try {
    // Call refreshAllData which handles cache clearing and response
    await topVoicesController.refreshAllData(req, res);
  } catch (error) {
    console.error("Error refreshing top voices data:", error);
    res.status(500).json({
      message: "Failed to refresh top voices data",
      error: error.message,
    });
  }
};

/**
 * Add a manual subscription for a user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const addManualSubscription = async (req, res) => {
  try {
    const { email, type = "premium", notes, source = "manual" } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Generate a subscription ID that includes the email for easier tracking
    const emailHash = Buffer.from(email).toString("base64").substring(0, 8);
    const subscriptionId = `${source}_${emailHash}_${Date.now()}`;

    // Create subscription
    const subscription = {
      id: subscriptionId,
      active: true,
      type,
      email,
      source,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save subscription
    await subscriptionStorage.setSubscription(subscriptionId, subscription);
    console.log(`Manual subscription ${subscriptionId} created for ${email}`);

    // Double-check that the subscription is properly indexed by email
    const emailKey = `email:${email}`;
    let emailSubscriptions =
      subscriptionStorageModule.subscriptionCache.get(emailKey) || {};
    emailSubscriptions[subscriptionId] = true;
    subscriptionStorageModule.subscriptionCache.set(
      emailKey,
      emailSubscriptions
    );
    console.log(
      `Email index updated for ${email}:`,
      Object.keys(emailSubscriptions)
    );

    // Make sure to persist the cache to files after updating the email index
    const { persistCacheToFiles } = require("../utils/storage");
    await persistCacheToFiles();

    // Get or create user
    let user = await userStorage.getUser(email);

    if (user) {
      // Update existing user
      user.subscriptionId = subscriptionId;
      user.subscriptionType = type;
      user.active = true;
      user.updatedAt = new Date().toISOString();
      console.log(
        `Updated existing user ${email} with subscription ${subscriptionId}`
      );
    } else {
      // Create new user
      user = {
        email,
        name: email.split("@")[0],
        subscriptionId,
        subscriptionType: type,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      console.log(
        `Created new user ${email} with subscription ${subscriptionId}`
      );
    }

    // Save user
    await userStorage.setUser(email, user);

    res.json({
      message: "Manual subscription added successfully",
      subscription: {
        ...subscription,
        id: subscriptionId,
      },
    });
  } catch (error) {
    console.error("Error adding manual subscription:", error);
    res.status(500).json({
      message: "Failed to add manual subscription",
      error: error.message,
    });
  }
};


/**
 * Scan for missing subscriptions
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const scanForMissingSubscriptions = async (req, res) => {
  try {
    console.log("Starting scan for missing subscriptions...");

    // Get all users
    const allUsers = await userStorage.getAllUsers();
    const users = Object.values(allUsers);

    // Get all subscriptions
    const allSubscriptions = await subscriptionStorage.getAllSubscriptions();

    // Track recovered subscriptions
    let recovered = 0;
    let missingGumroad = 0;

    // Check for users with subscriptionId that might not be in the subscription storage
    for (const user of users) {
      if (user.subscriptionId && !allSubscriptions[user.subscriptionId]) {
        console.log(
          `Found user ${user.email} with missing subscription ${user.subscriptionId}`
        );

        // Create a new subscription entry for this user
        const subscription = {
          id: user.subscriptionId,
          email: user.email,
          type: user.subscriptionType || "premium",
          active: user.active || true,
          source: user.subscriptionId && user.subscriptionId.includes("stripe")
            ? "stripe"
            : "manual",
          createdAt: user.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Save to storage
        await subscriptionStorage.setSubscription(
          user.subscriptionId,
          subscription
        );
        console.log(`Recovered missing subscription for ${user.email}`);

        recovered++;
        if (
          subscription.source === "gumroad" ||
          user.subscriptionId.includes("gumroad")
        ) {
          missingGumroad++;
        }
      }
    }

    // Check for email-indexed subscriptions that might not be properly stored
    const subscriptionCache = subscriptionStorageModule.subscriptionCache;

    // Get all keys from the subscription cache
    const allKeys = subscriptionCache.keys();
    const emailKeys = allKeys.filter((key) => key.startsWith("email:"));

    console.log(`Found ${emailKeys.length} email indices to check`);

    for (const emailKey of emailKeys) {
      const email = emailKey.replace("email:", "");
      const emailSubscriptions = subscriptionCache.get(emailKey) || {};

      console.log(
        `Checking email index for ${email}, found ${
          Object.keys(emailSubscriptions).length
        } subscriptions`
      );

      for (const subId in emailSubscriptions) {
        if (!allSubscriptions[subId]) {
          console.log(
            `Found missing subscription ${subId} in email index for ${email}`
          );

          // Try to get the subscription from the user
          const user = await userStorage.getUser(email);
          if (user) {
            // Create a new subscription entry
            const subscription = {
              id: subId,
              email: email,
              type: user.subscriptionType || "premium",
              active: user.active || true,
              source: subId && subId.includes("stripe") ? "stripe" : "manual",
              createdAt: user.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            // Save to storage
            await subscriptionStorage.setSubscription(subId, subscription);
            console.log(
              `Recovered missing subscription ${subId} for ${email} from email index`
            );

            recovered++;
            if (
              subscription.source === "gumroad" ||
              subId.includes("gumroad")
            ) {
              missingGumroad++;
            }
          }
        }
      }
    }

    // Check for Gumroad subscriptions specifically
    const gumroadSubs = Object.values(allSubscriptions).filter(
      (sub) =>
        sub.source &&
        (sub.source.includes("gumroad") || sub.id.includes("gumroad"))
    );

    // Get updated count of Gumroad subscriptions
    const updatedGumroadSubs = Object.values(
      await subscriptionStorage.getAllSubscriptions()
    ).filter(
      (sub) =>
        sub.source &&
        (sub.source.includes("gumroad") || sub.id.includes("gumroad"))
    );

    console.log(
      `Scan complete. Recovered ${recovered} missing subscriptions (${missingGumroad} Gumroad)`
    );
    console.log(
      `Found ${updatedGumroadSubs.length} total Gumroad subscriptions after scan`
    );

    res.json({
      message: "Scan complete",
      recovered,
      missingGumroad,
      importedFromGumroad,
      totalGumroad: updatedGumroadSubs.length,
      initialGumroadCount: gumroadSubs.length,
      totalSubscriptions: Object.keys(
        await subscriptionStorage.getAllSubscriptions()
      ).length,
      subscriptionsBySource: Object.values(
        await subscriptionStorage.getAllSubscriptions()
      ).reduce((acc, sub) => {
        const source = sub.source || "unknown";
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {}),
    });
  } catch (error) {
    console.error("Error scanning for subscriptions:", error);
    res.status(500).json({
      message: "Failed to scan for subscriptions",
      error: error.message,
    });
  }
};

/**
 * Add a Stripe subscription for a user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const addStripeSubscription = async (req, res) => {
  try {
    const { email, stripeSubscriptionId, stripeCustomerId, notes } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!stripeSubscriptionId) {
      return res
        .status(400)
        .json({ message: "Stripe subscription ID is required" });
    }

    // Verify the subscription with Stripe
    const stripeResult = await verifyStripeSubscription(stripeSubscriptionId);

    if (!stripeResult.success) {
      return res.status(400).json({
        message: `Failed to verify Stripe subscription: ${stripeResult.message}`,
        success: false,
      });
    }

    // Generate a subscription ID
    const emailHash = Buffer.from(email).toString("base64").substring(0, 8);
    const subscriptionId = `stripe_${emailHash}_${Date.now()}`;

    // Create subscription object
    const subscription = {
      id: subscriptionId,
      active: stripeResult.subscription.active,
      type: "premium",
      email,
      source: "stripe_api_linked",
      stripeSubscriptionId: stripeSubscriptionId,
      stripeCustomerId:
        stripeCustomerId || stripeResult.subscription.customerId,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stripeData: {
        subscriptionId: stripeSubscriptionId,
        customerId: stripeCustomerId || stripeResult.subscription.customerId,
        status: stripeResult.subscription.status,
        currentPeriodEnd: stripeResult.subscription.currentPeriodEnd,
        canceledAt: stripeResult.subscription.canceledAt,
      },
    };

    // Save subscription
    await subscriptionStorage.setSubscription(subscriptionId, subscription);
    console.log(
      `Stripe subscription ${subscriptionId} created/linked for ${email}`
    );

    // Double-check that the subscription is properly indexed by email
    const emailKey = `email:${email}`;
    let emailSubscriptions =
      subscriptionStorageModule.subscriptionCache.get(emailKey) || {};
    emailSubscriptions[subscriptionId] = true;
    subscriptionStorageModule.subscriptionCache.set(
      emailKey,
      emailSubscriptions
    );
    console.log(
      `Email index updated for ${email}:`,
      Object.keys(emailSubscriptions)
    );

    // Make sure to persist the cache to files after updating the email index
    const { persistCacheToFiles } = require("../utils/storage");
    await persistCacheToFiles();

    // Get or create user
    let user = await userStorage.getUser(email);

    if (user) {
      // Update existing user
      user.subscriptionId = subscriptionId;
      user.subscriptionType = "premium";
      user.active = true;
      user.updatedAt = new Date().toISOString();
      console.log(
        `Updated existing user ${email} with subscription ${subscriptionId}`
      );
    } else {
      // Create new user
      user = {
        email,
        name: email.split("@")[0],
        subscriptionId,
        subscriptionType: "premium",
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      console.log(
        `Created new user ${email} with subscription ${subscriptionId}`
      );
    }

    // Save user
    await userStorage.setUser(email, user);

    res.json({
      message: "Stripe subscription linked successfully",
      subscription: {
        ...subscription,
        id: subscriptionId,
      },
      stripeVerified: true,
    });
  } catch (error) {
    console.error("Error adding Stripe subscription:", error);
    res.status(500).json({
      message: "Failed to add Stripe subscription",
      error: error.message,
    });
  }
};

module.exports = {
  login,
  getUsers,
  getUserByEmail,
  updateUser,
  activateUser,
  deactivateUser,
  deleteUser,
  getSubscriptions,
  activateSubscription,
  deactivateSubscription,
  getStats,
  getSettings,
  updateSettings,
  getActivity,
  getTopVoicesStats,
  refreshTopVoices,
  addManualSubscription,
  addStripeSubscription,
  scanForMissingSubscriptions,
  deleteSubscription,
};
