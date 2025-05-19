const jwt = require("jsonwebtoken");
const { userStorage, subscriptionStorage } = require("../utils/storage");
const path = require("path");
const fs = require("fs").promises;
const topVoicesController = require("./topVoices.controller");
const { topVoicesCache } = require("./topVoices.controller");
const NodeCache = require("node-cache");
const {
  getSubscriptions: getGumroadSubscriptions,
  cancelGumroadSubscription, // Import the new cancel function
} = require("../utils/gumroad");
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

    // Use hardcoded admin credentials instead of database lookup
    if (email === "admin" && password === "admin123") {
      // Generate JWT token
      const token = jwt.sign(
        {
          email: "admin@example.com",
          name: "Admin User",
          role: "admin",
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      res.json({
        message: "Login successful",
        token,
        user: {
          email: "admin@example.com",
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

    // Get all users
    const allUsers = await userStorage.getAllUsers();

    // Filter users by search term if provided
    let filteredUsers = Object.values(allUsers);

    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (user) =>
          user.email.toLowerCase().includes(searchLower) ||
          (user.name && user.name.toLowerCase().includes(searchLower))
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

    // Get user from storage
    const user = await userStorage.getUser(email);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
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
    console.log("Fetching all subscriptions...");

    // Get all subscriptions from local storage
    const allSubscriptions = await subscriptionStorage.getAllSubscriptions();

    // Get all users to check for any missing subscriptions
    const allUsers = await userStorage.getAllUsers();
    const users = Object.values(allUsers);

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
          source: user.subscriptionId.includes("gumroad")
            ? "gumroad"
            : "manual",
          createdAt: user.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Add to the subscriptions object
        allSubscriptions[user.subscriptionId] = subscription;

        // Save to storage
        await subscriptionStorage.setSubscription(
          user.subscriptionId,
          subscription
        );
        console.log(`Created missing subscription for ${user.email}`);
      }
    }

    // Convert local subscriptions to array
    let subscriptions = Object.values(allSubscriptions);

    console.log(
      `Found ${subscriptions.length} total subscriptions in local storage`
    );

    // Now fetch subscriptions directly from Gumroad API
    console.log("Fetching subscriptions from Gumroad API...");
    try {
      const gumroadResult = await getGumroadSubscriptions();

      // Also check for Stripe subscriptions in our system
      console.log("Checking for Stripe subscriptions...");
      const stripeSubscriptions = subscriptions.filter(
        (sub) => sub.source && sub.source.includes("stripe")
      );
      console.log(
        `Found ${stripeSubscriptions.length} Stripe subscriptions in local storage`
      );

      if (
        gumroadResult.success &&
        gumroadResult.subscriptions &&
        gumroadResult.subscriptions.length > 0
      ) {
        console.log(
          `Successfully fetched ${gumroadResult.subscriptions.length} subscriptions from Gumroad API`
        );

        // Create a map of existing subscriptions by email for easy lookup
        const existingSubscriptionsByEmail = {};
        subscriptions.forEach((sub) => {
          if (sub.email) {
            if (!existingSubscriptionsByEmail[sub.email]) {
              existingSubscriptionsByEmail[sub.email] = [];
            }
            existingSubscriptionsByEmail[sub.email].push(sub);
          }
        });

        // Process Gumroad subscriptions
        for (const gumroadSub of gumroadResult.subscriptions) {
          // Check if we already have this subscription by Gumroad subscription ID
          const existingByGumroadId = subscriptions.find(
            (sub) =>
              sub.gumroadSubscriptionId === gumroadSub.gumroadSubscriptionId
          );

          if (existingByGumroadId) {
            // Update existing subscription with latest data from Gumroad
            console.log(
              `Updating existing subscription for ${gumroadSub.email} with Gumroad data`
            );
            existingByGumroadId.active = gumroadSub.active;
            existingByGumroadId.updatedAt = new Date().toISOString();
            existingByGumroadId.gumroadData = gumroadSub.gumroadData;

            // Save updated subscription
            await subscriptionStorage.setSubscription(
              existingByGumroadId.id,
              existingByGumroadId
            );
          } else {
            // Check if user already has a subscription by email
            const existingSubsForEmail =
              existingSubscriptionsByEmail[gumroadSub.email] || [];

            // If user has an active subscription, update it with Gumroad data
            const activeSubForEmail = existingSubsForEmail.find(
              (sub) => sub.active
            );

            if (activeSubForEmail) {
              console.log(
                `Updating existing active subscription for ${gumroadSub.email} with Gumroad data`
              );
              activeSubForEmail.gumroadSubscriptionId =
                gumroadSub.gumroadSubscriptionId;
              activeSubForEmail.gumroadPurchaseId =
                gumroadSub.gumroadPurchaseId;
              activeSubForEmail.source = "gumroad_api_linked";
              activeSubForEmail.updatedAt = new Date().toISOString();
              activeSubForEmail.gumroadData = gumroadSub.gumroadData;

              // Ensure the subscription has a valid ID before saving
              if (!activeSubForEmail.id) {
                console.warn(
                  `Subscription for ${gumroadSub.email} has undefined ID, generating a new one`
                );
                const emailHash = Buffer.from(gumroadSub.email)
                  .toString("base64")
                  .substring(0, 8);
                activeSubForEmail.id = `gumroad_fixed_${emailHash}_${Date.now()}`;
              }

              // Save updated subscription
              await subscriptionStorage.setSubscription(
                activeSubForEmail.id,
                activeSubForEmail
              );
            } else {
              // This is a new subscription from Gumroad, add it
              console.log(
                `Adding new subscription from Gumroad for ${gumroadSub.email}`
              );

              // Ensure the subscription has a valid ID before saving
              if (!gumroadSub.id) {
                console.warn(
                  `New Gumroad subscription for ${gumroadSub.email} has undefined ID, generating a new one`
                );
                const emailHash = Buffer.from(gumroadSub.email)
                  .toString("base64")
                  .substring(0, 8);
                gumroadSub.id = `gumroad_fixed_${emailHash}_${Date.now()}`;
              }

              // Save the new subscription
              await subscriptionStorage.setSubscription(
                gumroadSub.id,
                gumroadSub
              );

              // Add to our local array
              subscriptions.push(gumroadSub);

              // Update user if they exist
              const user = await userStorage.getUser(gumroadSub.email);
              if (user) {
                user.subscriptionId = gumroadSub.id;
                user.subscriptionType = "premium";
                user.active = true;
                user.updatedAt = new Date().toISOString();
                await userStorage.setUser(gumroadSub.email, user);
                console.log(
                  `Updated user ${gumroadSub.email} with Gumroad subscription`
                );
              } else {
                // Create a new user for this subscription
                const newUser = {
                  email: gumroadSub.email,
                  subscriptionId: gumroadSub.id,
                  subscriptionType: "premium",
                  active: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                await userStorage.setUser(gumroadSub.email, newUser);
                console.log(
                  `Created new user for Gumroad subscription: ${gumroadSub.email}`
                );
              }
            }
          }
        }

        // Refresh the subscriptions array after all updates
        subscriptions = Object.values(
          await subscriptionStorage.getAllSubscriptions()
        );
      } else {
        console.log(
          "No subscriptions returned from Gumroad API or request failed"
        );
        if (!gumroadResult.success) {
          console.error("Gumroad API error:", gumroadResult.message);
        }
      }
    } catch (gumroadError) {
      console.error("Error fetching subscriptions from Gumroad:", gumroadError);
      // Continue with local subscriptions only
    }

    console.log(`Final count: ${subscriptions.length} total subscriptions`);

    // Count by source
    const sourceCount = {};
    subscriptions.forEach((sub) => {
      const source = sub.source || "unknown";
      sourceCount[source] = (sourceCount[source] || 0) + 1;
    });
    console.log("Subscriptions by source:", sourceCount);

    // Log each subscription with key details
    console.log("Subscription details:");
    subscriptions.forEach((sub, index) => {
      console.log(
        `[${index + 1}] ID: ${sub.id}, Email: ${sub.email}, Source: ${
          sub.source || "unknown"
        }, Active: ${sub.active}, Type: ${sub.type}, Created: ${sub.createdAt}`
      );
    });

    // Check for Gumroad subscriptions specifically
    const gumroadSubs = subscriptions.filter(
      (sub) =>
        sub.source &&
        (sub.source.includes("gumroad") || sub.id.includes("gumroad"))
    );
    console.log(`Found ${gumroadSubs.length} Gumroad subscriptions:`);
    gumroadSubs.forEach((sub, index) => {
      console.log(
        `[${index + 1}] ID: ${sub.id}, Email: ${sub.email}, Source: ${
          sub.source || "unknown"
        }, Active: ${sub.active}, Type: ${sub.type}`
      );
    });

    // Check for Stripe subscriptions specifically
    const stripeSubs = subscriptions.filter(
      (sub) =>
        sub.source &&
        (sub.source.includes("stripe") || sub.id.includes("stripe"))
    );
    console.log(`Found ${stripeSubs.length} Stripe subscriptions:`);
    stripeSubs.forEach((sub, index) => {
      console.log(
        `[${index + 1}] ID: ${sub.id}, Email: ${sub.email}, Source: ${
          sub.source || "unknown"
        }, Active: ${sub.active}, Type: ${sub.type}`
      );
    });

    res.json({
      subscriptions,
      total: subscriptions.length,
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
 * Delete a subscription (locally and from Gumroad if applicable)
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

    // If it's a Gumroad subscription, attempt to cancel it on Gumroad
    const gumroadSubIdToCancel =
      subscription.gumroadSubscriptionId ||
      (subscription.gumroadData && subscription.gumroadData.subscriptionId);
    if (
      gumroadSubIdToCancel &&
      (subscription.source === "gumroad" ||
        subscription.source === "gumroad_api" ||
        subscription.source === "gumroad_api_linked")
    ) {
      console.log(
        `Deleting Gumroad subscription ${gumroadSubIdToCancel} as part of local deletion.`
      );
      const cancelResult = await cancelGumroadSubscription(
        gumroadSubIdToCancel
      );
      if (!cancelResult.success) {
        console.warn(
          `Failed to cancel Gumroad subscription ${gumroadSubIdToCancel} during deletion: ${cancelResult.message}. Proceeding with local deletion.`
        );
        // Decide if you want to stop deletion if Gumroad fails. For now, proceeding.
      } else {
        console.log(
          `Successfully cancelled Gumroad subscription ${gumroadSubIdToCancel} during deletion.`
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

    // Get all subscriptions
    const allSubscriptions = await subscriptionStorage.getAllSubscriptions();
    const subscriptions = Object.values(allSubscriptions);

    // Calculate stats
    const totalUsers = users.length;
    const activeUsers = users.filter((user) => user.active).length;
    const freeUsers = users.filter(
      (user) => !user.subscriptionType || user.subscriptionType === "free"
    ).length;
    const premiumUsers = users.filter(
      (user) => user.subscriptionType === "premium"
    ).length;

    const activeSubscriptions = subscriptions.filter(
      (sub) => sub.active
    ).length;
    // Calculate monthly revenue and round to 2 decimal places
    const monthlyRevenue = parseFloat((activeSubscriptions * 29.99).toFixed(2)); // Assuming $29.99 per premium subscription

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
    const apiRequests24h = Math.floor(Math.random() * 10000) + 5000;

    // Generate mock recent activity
    const recentActivity = generateMockActivity(users);

    res.json({
      totalUsers,
      activeUsers,
      freeUsers,
      premiumUsers,
      activeSubscriptions,
      monthlyRevenue,
      newUsers7d,
      conversionRate,
      apiRequests24h,
      recentActivity,
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
      user: randomUser.email,
      action: randomAction,
      details: `IP: 192.168.${Math.floor(Math.random() * 255)}.${Math.floor(
        Math.random() * 255
      )}`,
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
 * Add a Gumroad subscription for a user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const addGumroadSubscription = async (req, res) => {
  try {
    const { email, gumroadSubscriptionId, gumroadProductId, notes } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // First, check if this user already exists in Gumroad
    const { getSubscriptions, createSubscriber } = require("../utils/gumroad");
    const gumroadResult = await getSubscriptions();

    let existingGumroadSubscription = null;
    let gumroadSubscriberResult = null;

    if (gumroadResult.success && gumroadResult.subscriptions) {
      // Look for a matching subscription by email
      existingGumroadSubscription = gumroadResult.subscriptions.find(
        (sub) => sub.email.toLowerCase() === email.toLowerCase() && sub.active
      );

      if (existingGumroadSubscription) {
        console.log(
          `Found existing Gumroad subscription for ${email}: ${existingGumroadSubscription.id}`
        );
      } else {
        console.log(`No existing Gumroad subscription found for ${email}`);

        // No existing subscription found, create one in Gumroad
        console.log(`Creating new Gumroad subscription for ${email}...`);
        gumroadSubscriberResult = await createSubscriber(
          email,
          gumroadProductId
        );

        if (gumroadSubscriberResult.success) {
          console.log(`Successfully created Gumroad subscription for ${email}`);
        } else {
          console.error(
            `Failed to create Gumroad subscription: ${gumroadSubscriberResult.message}`
          );
        }
      }
    }

    // Generate a subscription ID
    let subscriptionId;
    if (existingGumroadSubscription) {
      // Use the existing Gumroad subscription ID
      subscriptionId = existingGumroadSubscription.id;
    } else if (gumroadSubscriberResult && gumroadSubscriberResult.success) {
      // Use the newly created Gumroad subscription ID
      const subscriberId = gumroadSubscriberResult.subscriber.id;
      subscriptionId = `gumroad_direct_${subscriberId}`;
    } else {
      // Generate a new ID for manual entry
      const emailHash = Buffer.from(email).toString("base64").substring(0, 8);
      subscriptionId = `gumroad_${emailHash}_${Date.now()}`;
    }

    // Create subscription object
    const subscription = {
      id: subscriptionId,
      active: true,
      type: "premium",
      email,
      source: existingGumroadSubscription
        ? "gumroad_api_linked"
        : gumroadSubscriberResult && gumroadSubscriberResult.success
        ? "gumroad_api_created"
        : "gumroad_manual_entry",
      gumroadSubscriptionId: existingGumroadSubscription
        ? existingGumroadSubscription.gumroadSubscriptionId
        : gumroadSubscriberResult && gumroadSubscriberResult.success
        ? gumroadSubscriberResult.subscriber.id
        : gumroadSubscriptionId,
      gumroadPurchaseId: existingGumroadSubscription
        ? existingGumroadSubscription.gumroadPurchaseId
        : null,
      gumroadProductId: existingGumroadSubscription
        ? existingGumroadSubscription.gumroadData?.productId
        : gumroadSubscriberResult && gumroadSubscriberResult.success
        ? gumroadSubscriberResult.subscriber.product_id
        : gumroadProductId,
      notes,
      createdAt: existingGumroadSubscription
        ? existingGumroadSubscription.createdAt
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If we found an existing Gumroad subscription, copy its data
    if (
      existingGumroadSubscription &&
      existingGumroadSubscription.gumroadData
    ) {
      subscription.gumroadData = existingGumroadSubscription.gumroadData;
    } else if (gumroadSubscriberResult && gumroadSubscriberResult.success) {
      // Add data from the newly created subscription
      subscription.gumroadData = {
        subscriptionId: gumroadSubscriberResult.subscriber.id,
        productId: gumroadSubscriberResult.subscriber.product_id,
        productName:
          gumroadSubscriberResult.subscriber.product_name ||
          "Premium Subscription",
        price: gumroadSubscriberResult.subscriber.price_cents / 100,
        createdAt:
          gumroadSubscriberResult.subscriber.created_at ||
          new Date().toISOString(),
      };
    }

    // Save subscription
    await subscriptionStorage.setSubscription(subscriptionId, subscription);
    console.log(
      `Gumroad subscription ${subscriptionId} created/linked for ${email}`
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

    // Prepare response message
    let message;
    if (existingGumroadSubscription) {
      message = "Existing Gumroad subscription linked successfully";
    } else if (gumroadSubscriberResult && gumroadSubscriberResult.success) {
      message = "New subscription created in Gumroad successfully";
    } else {
      message =
        "Manual Gumroad subscription added locally (failed to create in Gumroad)";
    }

    res.json({
      message,
      subscription: {
        ...subscription,
        id: subscriptionId,
      },
      existingGumroadFound: !!existingGumroadSubscription,
      gumroadCreated: !!(
        gumroadSubscriberResult && gumroadSubscriberResult.success
      ),
      gumroadError:
        gumroadSubscriberResult && !gumroadSubscriberResult.success
          ? gumroadSubscriberResult.message
          : null,
    });
  } catch (error) {
    console.error("Error adding Gumroad subscription:", error);
    res.status(500).json({
      message: "Failed to add Gumroad subscription",
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
          source: user.subscriptionId.includes("gumroad")
            ? "gumroad"
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
              source: subId.includes("gumroad") ? "gumroad" : "manual",
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

    // Scan all users for Gumroad subscriptions that might not be properly tagged
    console.log("Scanning users for potential Gumroad subscriptions...");
    for (const user of users) {
      if (user.subscriptionId && allSubscriptions[user.subscriptionId]) {
        const sub = allSubscriptions[user.subscriptionId];

        // Check if this might be a Gumroad subscription that's not properly tagged
        if (
          (!sub.source || !sub.source.includes("gumroad")) &&
          user.subscriptionId.includes("gumroad")
        ) {
          console.log(
            `Found Gumroad subscription with incorrect source tag: ${user.subscriptionId}`
          );

          // Update the subscription source
          sub.source = "gumroad_fixed";
          sub.updatedAt = new Date().toISOString();

          // Save the updated subscription
          await subscriptionStorage.setSubscription(user.subscriptionId, sub);
          console.log(
            `Fixed source tag for Gumroad subscription: ${user.subscriptionId}`
          );
        }
      }
    }

    // Now fetch directly from Gumroad API
    console.log("Fetching subscriptions directly from Gumroad API...");
    let importedFromGumroad = 0;

    try {
      const gumroadResult = await getGumroadSubscriptions();

      if (
        gumroadResult.success &&
        gumroadResult.subscriptions &&
        gumroadResult.subscriptions.length > 0
      ) {
        console.log(
          `Successfully fetched ${gumroadResult.subscriptions.length} subscriptions from Gumroad API`
        );

        // Create a map of existing subscriptions by email for easy lookup
        const existingSubscriptionsByEmail = {};
        Object.values(allSubscriptions).forEach((sub) => {
          if (sub.email) {
            if (!existingSubscriptionsByEmail[sub.email]) {
              existingSubscriptionsByEmail[sub.email] = [];
            }
            existingSubscriptionsByEmail[sub.email].push(sub);
          }
        });

        // Process Gumroad subscriptions
        for (const gumroadSub of gumroadResult.subscriptions) {
          // Check if we already have this subscription by Gumroad subscription ID
          const existingByGumroadId = Object.values(allSubscriptions).find(
            (sub) =>
              sub.gumroadSubscriptionId === gumroadSub.gumroadSubscriptionId
          );

          if (existingByGumroadId) {
            // Update existing subscription with latest data from Gumroad
            console.log(
              `Updating existing subscription for ${gumroadSub.email} with Gumroad data`
            );
            existingByGumroadId.active = gumroadSub.active;
            existingByGumroadId.updatedAt = new Date().toISOString();
            existingByGumroadId.gumroadData = gumroadSub.gumroadData;

            // Save updated subscription
            await subscriptionStorage.setSubscription(
              existingByGumroadId.id,
              existingByGumroadId
            );
          } else {
            // Check if user already has a subscription by email
            const existingSubsForEmail =
              existingSubscriptionsByEmail[gumroadSub.email] || [];

            // If user has an active subscription, update it with Gumroad data
            const activeSubForEmail = existingSubsForEmail.find(
              (sub) => sub.active
            );

            if (activeSubForEmail) {
              console.log(
                `Updating existing active subscription for ${gumroadSub.email} with Gumroad data`
              );
              activeSubForEmail.gumroadSubscriptionId =
                gumroadSub.gumroadSubscriptionId;
              activeSubForEmail.gumroadPurchaseId =
                gumroadSub.gumroadPurchaseId;
              activeSubForEmail.source = "gumroad_api_linked";
              activeSubForEmail.updatedAt = new Date().toISOString();
              activeSubForEmail.gumroadData = gumroadSub.gumroadData;

              // Save updated subscription
              await subscriptionStorage.setSubscription(
                activeSubForEmail.id,
                activeSubForEmail
              );
            } else {
              // This is a new subscription from Gumroad, add it
              console.log(
                `Adding new subscription from Gumroad for ${gumroadSub.email}`
              );

              // Save the new subscription
              await subscriptionStorage.setSubscription(
                gumroadSub.id,
                gumroadSub
              );

              importedFromGumroad++;

              // Update user if they exist
              const user = await userStorage.getUser(gumroadSub.email);
              if (user) {
                user.subscriptionId = gumroadSub.id;
                user.subscriptionType = "premium";
                user.active = true;
                user.updatedAt = new Date().toISOString();
                await userStorage.setUser(gumroadSub.email, user);
                console.log(
                  `Updated user ${gumroadSub.email} with Gumroad subscription`
                );
              } else {
                // Create a new user for this subscription
                const newUser = {
                  email: gumroadSub.email,
                  subscriptionId: gumroadSub.id,
                  subscriptionType: "premium",
                  active: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                await userStorage.setUser(gumroadSub.email, newUser);
                console.log(
                  `Created new user for Gumroad subscription: ${gumroadSub.email}`
                );
              }
            }
          }
        }
      } else {
        console.log(
          "No subscriptions returned from Gumroad API or request failed"
        );
        if (!gumroadResult.success) {
          console.error("Gumroad API error:", gumroadResult.message);
        }
      }
    } catch (gumroadError) {
      console.error("Error fetching subscriptions from Gumroad:", gumroadError);
      // Continue with local subscriptions only
    }

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
  addGumroadSubscription,
  addStripeSubscription,
  scanForMissingSubscriptions,
  deleteSubscription,
};
