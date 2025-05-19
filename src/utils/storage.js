const fs = require("fs").promises;
const path = require("path");
const NodeCache = require("node-cache");

// Cache for in-memory data access
const userCache = new NodeCache({ stdTTL: 86400 * 30 }); // 30 day TTL
const subscriptionCache = new NodeCache({ stdTTL: 86400 }); // 24 hour TTL

// File paths for persistent storage
const DATA_DIR = path.join(__dirname, "..", "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "subscriptions.json");

// Ensure data directory exists
async function initStorage() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });

    // Initialize files if they don't exist
    for (const file of [USERS_FILE, SUBSCRIPTIONS_FILE]) {
      try {
        await fs.access(file);
      } catch {
        await fs.writeFile(file, JSON.stringify({}));
      }
    }
  } catch (error) {
    console.error("Error initializing storage:", error);
    throw error;
  }
}

// Load data from files into cache
async function loadDataIntoCache() {
  try {
    // Load users
    const usersData = JSON.parse(await fs.readFile(USERS_FILE, "utf8"));
    Object.entries(usersData).forEach(([key, value]) => {
      userCache.set(key, value);
    });

    // Load subscriptions
    const subscriptionsData = JSON.parse(
      await fs.readFile(SUBSCRIPTIONS_FILE, "utf8")
    );
    Object.entries(subscriptionsData).forEach(([key, value]) => {
      subscriptionCache.set(key, value);
    });
  } catch (error) {
    console.error("Error loading data into cache:", error);
    throw error;
  }
}

// Save cache data to files
async function persistCacheToFiles() {
  try {
    // Save users
    const usersData = {};
    userCache.keys().forEach((key) => {
      usersData[key] = userCache.get(key);
    });
    await fs.writeFile(USERS_FILE, JSON.stringify(usersData, null, 2));

    // Save subscriptions
    const subscriptionsData = {};
    subscriptionCache.keys().forEach((key) => {
      subscriptionsData[key] = subscriptionCache.get(key);
    });
    await fs.writeFile(
      SUBSCRIPTIONS_FILE,
      JSON.stringify(subscriptionsData, null, 2)
    );
  } catch (error) {
    console.error("Error persisting cache to files:", error);
    throw error;
  }
}

// User operations
const userStorage = {
  async getUser(key) {
    return userCache.get(key);
  },

  async setUser(key, userData) {
    userCache.set(key, userData);
    await persistCacheToFiles();
    return userData;
  },

  async deleteUser(key) {
    userCache.del(key);
    await persistCacheToFiles();
  },

  async getAllUsers() {
    const users = {};
    userCache.keys().forEach((key) => {
      users[key] = userCache.get(key);
    });
    return users;
  },
};

// Subscription operations
const subscriptionStorage = {
  async getSubscription(userId) {
    return subscriptionCache.get(userId);
  },

  async setSubscription(userId, subscriptionData) {
    // Ensure userId is not undefined
    if (!userId) {
      console.error(
        "Cannot save subscription with undefined ID:",
        subscriptionData
      );
      // Generate a fallback ID if needed
      if (subscriptionData.email) {
        const emailHash = Buffer.from(subscriptionData.email)
          .toString("base64")
          .substring(0, 8);
        userId = `fallback_${emailHash}_${Date.now()}`;
        subscriptionData.id = userId;
        console.log(`Generated fallback ID for subscription: ${userId}`);
      } else {
        userId = `fallback_${Date.now()}`;
        subscriptionData.id = userId;
        console.log(
          `Generated generic fallback ID for subscription: ${userId}`
        );
      }
    }

    subscriptionCache.set(userId, subscriptionData);

    // Also store in email index if provided
    if (subscriptionData.email) {
      const emailKey = `email:${subscriptionData.email}`;
      let emailSubscriptions = subscriptionCache.get(emailKey) || {};
      emailSubscriptions[userId] = true;
      subscriptionCache.set(emailKey, emailSubscriptions);
      console.log(
        `Email index updated for ${subscriptionData.email}:`,
        Object.keys(emailSubscriptions)
      );
    }

    await persistCacheToFiles();
    return subscriptionData;
  },

  async deleteSubscription(userId) {
    const subscription = subscriptionCache.get(userId);
    if (subscription && subscription.email) {
      // Remove from email index
      const emailKey = `email:${subscription.email}`;
      const emailSubscriptions = subscriptionCache.get(emailKey) || {};
      delete emailSubscriptions[userId];
      subscriptionCache.set(emailKey, emailSubscriptions);
    }

    subscriptionCache.del(userId);
    await persistCacheToFiles();
  },

  async getAllSubscriptions() {
    const subscriptions = {};

    // Get all direct subscription keys
    subscriptionCache.keys().forEach((key) => {
      // Skip email index keys
      if (key.startsWith("email:")) {
        return;
      }

      const subscription = subscriptionCache.get(key);
      if (subscription) {
        subscriptions[key] = subscription;
      }
    });

    // Double-check for any subscriptions that might be missing from email indices
    const emailKeys = subscriptionCache
      .keys()
      .filter((key) => key.startsWith("email:"));
    for (const emailKey of emailKeys) {
      const email = emailKey.replace("email:", "");
      const emailSubscriptions = subscriptionCache.get(emailKey) || {};

      // Ensure all subscriptions for this email are included
      for (const subId in emailSubscriptions) {
        if (!subscriptions[subId]) {
          const sub = subscriptionCache.get(subId);
          if (sub) {
            subscriptions[subId] = sub;
            console.log(`Found missing subscription ${subId} for ${email}`);
          }
        }
      }
    }

    return subscriptions;
  },

  async getSubscriptionsForEmail(email) {
    if (!email) {
      return {};
    }

    const emailKey = `email:${email}`;
    const subscriptionIds = subscriptionCache.get(emailKey) || {};
    const subscriptions = {};

    // Get all subscriptions from the index
    for (const subId in subscriptionIds) {
      const sub = subscriptionCache.get(subId);
      if (sub) {
        subscriptions[subId] = sub;
      }
    }

    // Also scan all subscriptions for this email as a fallback
    subscriptionCache.keys().forEach((key) => {
      if (key.startsWith("email:")) {
        return;
      }

      const sub = subscriptionCache.get(key);
      if (sub && sub.email === email && !subscriptions[key]) {
        subscriptions[key] = sub;

        // Fix the email index
        let emailSubscriptions = subscriptionCache.get(emailKey) || {};
        emailSubscriptions[key] = true;
        subscriptionCache.set(emailKey, emailSubscriptions);
        console.log(
          `Fixed email index for ${email}, added subscription ${key}`
        );
      }
    });

    console.log(
      `Found ${Object.keys(subscriptions).length} subscriptions for ${email}`
    );
    return subscriptions;
  },
};

// Initialize storage on module load
initStorage().then(loadDataIntoCache).catch(console.error);

module.exports = {
  userStorage,
  subscriptionStorage,
  initStorage,
  loadDataIntoCache,
  persistCacheToFiles,
};
