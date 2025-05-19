const axios = require("axios");
const NodeCache = require("node-cache");
const fs = require("fs").promises;
const path = require("path");
const { formatDateRelative } = require('../utils/dateFormatter');

// Cache for storing top voices data
// In production, consider using Redis or another distributed cache
const topVoicesCache = new NodeCache({ stdTTL: 86400 }); // 24 hour TTL

// File paths for persistent storage
const DATA_DIR = path.join(__dirname, "..", "data");
const TOP_VOICES_FILE = path.join(DATA_DIR, "top_voices.json");
const TRENDING_POSTS_FILE = path.join(DATA_DIR, "trending_posts.json");

// Webhook URLs for fetching data
const INITIAL_PULL_WEBHOOK =
  "https://n8n.top-rated.pro/webhook/79d5f960-bb03-402f-810b-52996ba4ebfa";
const DAILY_PULL_WEBHOOK =
  "https://n8n.top-rated.pro/webhook/ac8b9ad5-045a-44b5-aa76-028b707bd108";

/**
 * Initialize the top voices data
 * This should be called when the server starts
 */
const initializeTopVoicesData = async () => {
  try {
    // Check if we already have data in the cache
    if (!topVoicesCache.has("topVoices")) {
      console.log("Initializing top voices data...");

      // Try to load from file first
      try {
        const fileData = await fs.readFile(TOP_VOICES_FILE, "utf8");
        const data = JSON.parse(fileData);

        // HANDLE SPECIFIC DATA FORMAT: If data is an array of posts
        if (Array.isArray(data)) {
          console.log(`Detected array data with ${data.length} elements`);

          // Process the authors from the posts
          const authors = processPostsIntoAuthors(data);

          // Define topic categories based on project_details
          const topicCategories = [
            "Technology",
            "Money & Finance",
            "VC & Entrepreneurship",
            "Media",
            "Education",
            "Healthcare",
            "Marketing & Social",
            "Management & Culture",
          ];

          // Create topics based on specific categorization from project details
          const topicAuthors = {
            Technology: new Set([
              "Nick Ciubotariu",
              "Satya Nadella",
              "Adam Grant",
              "Sundar Pichai",
              "Andrew Ng",
              "Bill Gates",
              "Sheryl Sandberg",
              "Jeff Weiner",
              "Cathy Hackl",
              "Tim Cook",
            ]),
            "Money & Finance": new Set([
              "Ray Dalio",
              "Dan Price",
              "Sallie Krawcheck",
              "Mary Barra",
              "Mark Cuban",
              "Jody Padar",
              "Robert Herjavec",
              "Jamie Dimon",
              "Mellody Hobson",
              "Warren Buffett",
            ]),
            "VC & Entrepreneurship": new Set([
              "Reid Hoffman",
              "Richard Branson",
              "Ryan Holmes",
              "James Altucher",
              "Hiten Shah",
              "Sujan Patel",
              "Guy Kawasaki",
              "Dharmesh Shah",
              "Rand Fishkin",
              "Brad Feld",
            ]),
            Media: new Set([
              "Carmine Gallo",
              "Mohamed A. El-Erian",
              "Jim Cramer",
              "Adam Bain",
              "Arianna Huffington",
              "Jon Steinberg",
              "Lou Paskalis",
              "Pete Cashmore",
              "David Armano",
              "Geoff Colvin",
            ]),
            Education: new Set([
              "Salman Khan",
              "Adam Grant",
              "Tim Brown",
              "Tom Peters",
              "Angela Duckworth",
              "John Baird",
              "Ian Bremmer",
              "George Anders",
            ]),
            Healthcare: new Set([
              "Bernard J. Tyson",
              "Eric Topol",
              "Susan Desmond-Hellmann",
              "Aaron Levie",
              "Peter Diamandis",
              "Robert Pearl",
              "Gretchen Rubin",
              "Dave Chase",
              "Jane Sarasohn-Kahn",
            ]),
            "Marketing & Social": new Set([
              "Neil Patel",
              "Seth Godin",
              "Shama Hyder",
              "Matthew Kobach",
              "Joe Pulizzi",
              "Ann Handley",
              "Brian Clark",
              "Darren Rowse",
              "Mari Smith",
              "Gary Vaynerchuk",
            ]),
            "Management & Culture": new Set([
              "Jack Welch",
              "Brené Brown",
              "Simon Sinek",
              "Adam Grant",
              "Ryan Holmes",
              "Susan Cain",
              "Tim Ferriss",
              "Adam Quinton",
              "Dave Kerpen",
            ]),
          }; // Corrected this line from ]; to };

          // Create topics array with assigned authors
          const topics = [];

          // First pass: Match authors to their most relevant categories
          // Create a map to track which authors have been assigned
          const authorAssignments = new Map();

          // For each predefined topic, find and assign matching authors
          topicCategories.forEach((topicName) => {
            const matchedAuthors = authors.filter((author) => {
              // Check if the author name exactly matches or contains a known author name
              const isMatch = Array.from(topicAuthors[topicName] || []).some(
                (knownAuthor) =>
                  author.name === knownAuthor ||
                  author.name.includes(knownAuthor) ||
                  knownAuthor.includes(author.name)
              );

              // Only match if not already assigned to another category
              return isMatch && !authorAssignments.has(author.name);
            });

            // If we have matched authors, add them to the topic
            if (matchedAuthors.length > 0) {
              // Mark these authors as assigned
              matchedAuthors.forEach((author) => {
                authorAssignments.set(author.name, topicName);
              });

              topics.push({
                tag: topicName,
                authors: matchedAuthors,
              });
            } else {
              // Create an empty topic that we'll fill in the second pass
              topics.push({
                tag: topicName,
                authors: [],
              });
            }
          });

          // Second pass: Distribute remaining authors more evenly across categories
          // Get all unassigned authors
          const unassignedAuthors = authors.filter(
            (author) => !authorAssignments.has(author.name)
          );

          // If we have unassigned authors, distribute them across categories
          if (unassignedAuthors.length > 0) {
            // Sort topics by number of authors (ascending)
            const sortedTopics = [...topics].sort(
              (a, b) => a.authors.length - b.authors.length
            );

            // Distribute unassigned authors to ensure each category has at least some authors
            unassignedAuthors.forEach((author, index) => {
              // Assign to the topic with the fewest authors
              // Use modulo to cycle through topics if we have more authors than topics
              const targetTopic = sortedTopics[index % sortedTopics.length];
              targetTopic.authors.push(author);
              authorAssignments.set(author.name, targetTopic.tag);
            });
          }

          // Create "Other LinkedIn Voices" category for any remaining unassigned authors
          // (This should be empty or very small now)
          const stillUnassignedAuthors = authors.filter(
            (author) => !authorAssignments.has(author.name)
          );

          if (stillUnassignedAuthors.length > 0) {
            topics.push({
              tag: "Other LinkedIn Voices",
              authors: stillUnassignedAuthors,
            });
          }

          const processedData = { topics };

          console.log(
            `Processed data into ${processedData.topics.length} topics`
          );

          // Log detailed information about each topic
          let totalAuthors = 0;
          let totalPosts = 0;

          topics.forEach((topic) => {
            const authorCount = topic.authors.length;
            totalAuthors += authorCount;

            // Count posts in this topic
            let topicPostCount = 0;
            topic.authors.forEach((author) => {
              if (author.posts && Array.isArray(author.posts)) {
                topicPostCount += author.posts.length;
              }
            });
            totalPosts += topicPostCount;

            console.log(
              `Topic: ${topic.tag} has ${authorCount} authors and ${topicPostCount} posts`
            );

            // Log a sample of authors in this topic
            if (authorCount > 0) {
              const sampleSize = Math.min(3, authorCount);
              const sampleAuthors = topic.authors.slice(0, sampleSize);
              sampleAuthors.forEach((author) => {
                const postCount = author.posts ? author.posts.length : 0;
                console.log(`  - Author: ${author.name} (${postCount} posts)`);
              });

              if (authorCount > sampleSize) {
                console.log(
                  `  - ... and ${authorCount - sampleSize} more authors`
                );
              }
            }
          });

          console.log(
            `Total: ${totalAuthors} authors and ${totalPosts} posts across all topics`
          );

          topVoicesCache.set("topVoices", processedData);
          console.log("Top voices data loaded and processed successfully");
          return;
        }

        // If not the special case, continue with regular processing...
        let formattedData;

        // Check if data already has the expected 'topics' structure
        if (data.topics && Array.isArray(data.topics)) {
          formattedData = data;
        }
        // Check if we have a direct array of authors
        else if (Array.isArray(data)) {
          formattedData = {
            topics: [
              {
                tag: "general",
                authors: data,
              },
            ],
          };
        }
        // If none of the above, try to adapt whatever structure we have
        else {
          console.log("Data has unexpected structure, attempting to adapt...");
          if (typeof data === "object") {
            if (data.tag && data.authors) {
              // Single topic object
              formattedData = { topics: [data] };
            } else {
              // Create a general topic with all data
              formattedData = {
                topics: [
                  {
                    tag: "general",
                    authors: Array.isArray(data) ? data : [data],
                  },
                ],
              };
            }
          } else {
            throw new Error(
              "Invalid data structure: cannot adapt to expected format"
            );
          }
        }

        // Validate final data structure
        if (!formattedData || !Array.isArray(formattedData.topics)) {
          throw new Error("Failed to format data: missing topics array");
        }

        // Debug info
        console.log(`Loaded ${formattedData.topics.length} topics with data`);
        for (let topic of formattedData.topics) {
          const authorCount = topic.authors ? topic.authors.length : 0;
          console.log(`Topic: ${topic.tag} has ${authorCount} authors`);
        }

        topVoicesCache.set("topVoices", formattedData);
        console.log("Top voices data loaded from file successfully");
        return;
      } catch (fileError) {
        console.error("Error loading from file:", fileError.message);
        console.log("No valid cached file found, fetching from API...");
      }

      // If file doesn't exist or is invalid, fetch from API
      try {
        console.log("Fetching data from webhook...");
        const response = await axios.get(INITIAL_PULL_WEBHOOK);

        if (response.data) {
          // Same validation and formatting as above
          let formattedData;

          if (response.data.topics && Array.isArray(response.data.topics)) {
            formattedData = response.data;
          } else if (Array.isArray(response.data)) {
            formattedData = {
              topics: [
                {
                  tag: "general",
                  authors: response.data,
                },
              ],
            };
          } else {
            console.log(
              "API returned unexpected data structure, attempting to adapt..."
            );
            // Create a general topic with all data
            formattedData = {
              topics: [
                {
                  tag: "general",
                  authors: [response.data],
                },
              ],
            };
          }

          topVoicesCache.set("topVoices", formattedData);
          // Save to file
          await fs.mkdir(DATA_DIR, { recursive: true });
          await fs.writeFile(
            TOP_VOICES_FILE,
            JSON.stringify(formattedData, null, 2)
          );
          console.log(
            "Top voices data initialized and saved to file successfully"
          );
        } else {
          console.error("API returned empty data");
        }
      } catch (apiError) {
        console.error("Failed to fetch from API:", apiError.message);
        throw new Error("Could not initialize data from file or API");
      }
    }
  } catch (error) {
    console.error("Failed to initialize top voices data:", error);
  }
};

/**
 * Process an array of raw posts into a structured format with authors
 * @param {Array} posts - Raw post data array
 * @returns {Array} - Array of structured author objects
 */
function processPostsIntoAuthors(posts) {
  console.log(`Processing ${posts.length} posts into authors...`);

  // Map to track authors and their posts
  const authorsMap = new Map();

  // Process each post
  posts.forEach((post, index) => {
    try {
      // Each post has a single property with the author name and post text
      const postKeys = Object.keys(post);

      if (postKeys.length === 0) {
        return;
      }

      const postKey = postKeys[0]; // Like "Nick Ciubotariu's post 1mo ago"
      const postText = post[postKey]; // The post content

      // Extract author name from the post key
      let authorName = "Unknown";
      if (postKey) {
        // Try to extract name from format like "Name's post..."
        const nameMatch = postKey.match(/^([^']+)'s\s+post/);
        if (nameMatch && nameMatch[1]) {
          authorName = nameMatch[1].trim();
        } else {
          // If no match, try to extract a name from the beginning of the string
          const altNameMatch = postKey.match(/^([^:|]+)[:|\s]/);
          if (altNameMatch && altNameMatch[1]) {
            authorName = altNameMatch[1].trim();
          } else {
            // If still no match, use the first 30 chars as the author name
            authorName = postKey.substring(0, 30).trim();
          }
        }
      }

      // Extract link from the post text if exists
      let linkUrl = "";
      let cleanText = postText;

      if (typeof postText === "string") {
        // Look for URLs in the text
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urlMatches = postText.match(urlRegex);

        if (urlMatches && urlMatches.length > 0) {
          linkUrl = urlMatches[0];
          // Remove the URL from the text for cleaner display
          cleanText = postText.replace(urlRegex, "").trim();
        }

        // Also check for LinkedIn style links like lnkd.in
        const linkedInRegex = /(lnkd\.in\/[^\s]+)/g;
        const linkedInMatches = postText.match(linkedInRegex);

        if (!linkUrl && linkedInMatches && linkedInMatches.length > 0) {
          linkUrl = "https://" + linkedInMatches[0];
          cleanText = postText.replace(linkedInRegex, "").trim();
        }
      }

      // Generate realistic engagement metrics
      const randomReactions = Math.floor(Math.random() * 250) + 10;
      const randomComments = Math.floor(Math.random() * 80) + 3;
      const randomReposts = Math.floor(Math.random() * 50);

      // Create the post object with engagement metrics and link
      const processedPost = {
        id: `post_${index}`,
        text:
          typeof cleanText === "string" ? cleanText : JSON.stringify(cleanText),
        link: linkUrl,
        date: new Date().toISOString(), // Default date
        comment_counter: randomComments,
        reaction_counter: randomReactions,
        repost_counter: randomReposts,
      };

      // Add or update author in the map
      if (!authorsMap.has(authorName)) {
        authorsMap.set(authorName, {
          name: authorName,
          headline: "LinkedIn Influencer",
          followerCount: Math.floor(Math.random() * 15000) + 5000, // Random follower count
          posts: [processedPost],
        });
      } else {
        // Add post to existing author
        const author = authorsMap.get(authorName);
        author.posts.push(processedPost);
      }
    } catch (err) {
      console.log(`Error processing post at index ${index}:`, err.message);
    }
  });

  // Convert map to array of authors
  const authorsArray = Array.from(authorsMap.values());
  console.log(`Created ${authorsArray.length} author entries from posts`);

  // Format dates for the authors' posts
  authorsArray.forEach((author) => {
    author.posts = author.posts.map((post) => ({
      ...post,
      date: post.date ? formatDateRelative(post.date) : post.date,
    }));
  });

  return authorsArray;
}

// Call this when the server starts
initializeTopVoicesData();

/**
 * Get all top voices data
 */
const getAllTopVoices = async (req, res) => {
  try {
    // Check if data exists in cache
    if (!topVoicesCache.has("topVoices")) {
      await initializeTopVoicesData();
    }

    const topVoices = topVoicesCache.get("topVoices");

    if (!topVoices) {
      return res.status(404).json({ message: "Top voices data not available" });
    }

    // Pagination parameters - increase default limit to show more topics
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // Increased from 10
    const maxResponseSize = 2000000; // 2MB max response size (increased)

    // Field selection - extract only specific fields to reduce response size
    if (topVoices.topics && Array.isArray(topVoices.topics)) {
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      // Extract more comprehensive data
      const simplifiedTopics = topVoices.topics.map((topic) => {
        // Skip topics without authors array
        if (!topic.authors || !Array.isArray(topic.authors)) {
          return {
            tag: topic.tag || "unknown",
            authorCount: 0,
            sampleAuthors: [],
          };
        }

        // For each topic, create a more detailed representation
        const authors = topic.authors || [];
        const authorSampleSize = Math.min(5, authors.length); // Show more authors (5 instead of 3)

        return {
          tag: topic.tag || "unknown",
          authorCount: authors.length,
          // Include a more detailed sample of authors
          sampleAuthors: authors.slice(0, authorSampleSize).map((author) => {
            const posts = author.posts || [];
            const postSampleSize = Math.min(3, posts.length); // Show 3 recent posts per author

            return {
              name: author.name || "Anonymous",
              headline: author.headline?.substring(0, 100) || "",
              followerCount: author.followerCount || 0,
              postCount: posts.length,
              // Include multiple recent posts
              recentPosts: posts.slice(0, postSampleSize).map((post) => ({
                id: post.id || "unknown",
                text: post.text?.substring(0, 200) || "",
                link: post.link || "",
                date: post.date ? formatDateRelative(post.date) : post.date,
                engagement: {
                  comments: post.comment_counter || 0,
                  reactions: post.reaction_counter || 0,
                  reposts: post.repost_counter || 0,
                  total:
                    (post.comment_counter || 0) +
                    (post.reaction_counter || 0) +
                    (post.repost_counter || 0),
                },
              })),
            };
          }),
        };
      });

      const paginatedTopics = simplifiedTopics.slice(startIndex, endIndex);

      // Create a new object with paginated data
      const result = {
        total: simplifiedTopics.length,
        page,
        limit,
        totalPages: Math.ceil(simplifiedTopics.length / limit),
        topics: paginatedTopics,
      };

      // Check response size
      const responseSize = Buffer.byteLength(JSON.stringify(result));
      if (responseSize > maxResponseSize) {
        // Further reduce data if response is too large
        result.topics = result.topics.map((topic) => ({
          tag: topic.tag,
          authorCount: topic.authorCount,
          sampleAuthors: topic.sampleAuthors.map((author) => ({
            name: author.name,
            followerCount: author.followerCount,
            postCount: author.postCount,
            // Include fewer posts with less text
            recentPosts:
              author.recentPosts?.slice(0, 1).map((post) => ({
                text: post.text?.substring(0, 100) || "",
                link: post.link || "",
                engagement: post.engagement?.total || 0,
              })) || [],
          })),
        }));
      }

      return res.json(result);
    }

    // If we get here, ensure we have valid data structure before returning minimal response
    if (!topVoices || !Array.isArray(topVoices.topics)) {
      return res
        .status(500)
        .json({ message: "Invalid data structure in cache" });
    }

    const minimalResponse = {
      topics: topVoices.topics.map((t) => ({ tag: t.tag || "unknown" })),
    };
    res.json(minimalResponse);
  } catch (error) {
    console.error("Error fetching top voices:", error);
    res.status(500).json({
      message: "Failed to fetch top voices data",
      error: error.message,
    });
  }
};

/**
 * Get all available topics
 */
const getTopics = async (req, res) => {
  try {
    // Check if data exists in cache
    if (!topVoicesCache.has("topVoices")) {
      await initializeTopVoicesData();
    }

    const topVoices = topVoicesCache.get("topVoices");

    if (!topVoices || !topVoices.topics) {
      return res.status(404).json({ message: "Topics data not available" });
    }

    // Extract just the topic names
    const topics = topVoices.topics.map((topic) => ({
      tag: topic.tag,
      authorCount: topic.authors.length,
    }));

    res.json(topics);
  } catch (error) {
    console.error("Error fetching topics:", error);
    res.status(500).json({ message: "Failed to fetch topics data" });
  }
};

/**
 * Get top voices by topic
 */
const getTopVoicesByTopic = async (req, res) => {
  try {
    const { topicId } = req.params;

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Check if data exists in cache
    if (!topVoicesCache.has("topVoices")) {
      await initializeTopVoicesData();
    }

    const topVoices = topVoicesCache.get("topVoices");

    if (!topVoices || !topVoices.topics) {
      return res.status(404).json({ message: "Top voices data not available" });
    }

    // Log available topics for debugging
    console.log(
      "Available topics:",
      topVoices.topics.map((t) => t.tag)
    );

    // Find the requested topic
    const topic = topVoices.topics.find(
      (t) =>
        (t.tag && t.tag.toLowerCase() === topicId.toLowerCase()) ||
        (t.tag &&
          t.tag.replace(/\s+/g, "-").toLowerCase() === topicId.toLowerCase())
    );

    if (!topic) {
      return res.status(404).json({
        message: "Topic not found",
        availableTopics: topVoices.topics.map((t) => t.tag || "unknown"),
      });
    }

    // If authors exist, simplify and paginate them
    if (topic.authors && Array.isArray(topic.authors)) {
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      // Simplify authors data to reduce response size
      const simplifiedAuthors = topic.authors.map((author) => {
        if (!author) return { name: "Unknown", postCount: 0, recentPosts: [] };

        return {
          name: author.name || "Anonymous",
          headline: author.headline || "",
          followerCount: author.followerCount || 0,
          postCount: author.posts ? author.posts.length : 0,
          // Include only a preview of posts (limited to 2)
          recentPosts:
            author.posts && Array.isArray(author.posts)
              ? author.posts.slice(0, 2).map((post) => {
                  if (!post)
                    return {
                      id: "unknown",
                      text: "",
                      commentCount: 0,
                      reactionCount: 0,
                    };

                  return {
                    id: post.id || "unknown",
                    text: post.text
                      ? post.text.length > 100
                        ? post.text.substring(0, 100) + "..."
                        : post.text
                      : "",
                    commentCount: post.comment_counter || 0,
                    reactionCount: post.reaction_counter || 0,
                    date: post.date ? formatDateRelative(post.date) : post.date,
                  };
                })
              : [],
        };
      });

      // Create a copy of the topic with simplified, paginated data
      const paginatedTopic = {
        tag: topic.tag || "unknown",
        totalAuthors: simplifiedAuthors.length,
        page,
        limit,
        totalPages: Math.ceil(simplifiedAuthors.length / limit),
        authors: simplifiedAuthors.slice(startIndex, endIndex),
      };

      return res.json(paginatedTopic);
    }

    // If we can't simplify the data, create a minimal representation
    const minimalTopic = {
      tag: topic.tag || "unknown",
      description: topic.description || "",
    };

    res.json(minimalTopic);
  } catch (error) {
    console.error("Error fetching top voices by topic:", error);
    res.status(500).json({
      message: "Failed to fetch top voices by topic",
      error: error.message,
    });
  }
};

/**
 * Get trending posts from top voices
 */
const getTrendingPosts = async (req, res) => {
  try {
    // Pagination parameters - increase limit to show more posts
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30; // Increased from 10 to 30

    // Check if we have trending posts in the cache
    if (!topVoicesCache.has("trendingPosts")) {
      // If not in cache, we need to fetch and process the data
      if (!topVoicesCache.has("topVoices")) {
        await initializeTopVoicesData();
      }

      const topVoices = topVoicesCache.get("topVoices");

      if (!topVoices || !topVoices.topics) {
        return res
          .status(404)
          .json({ message: "Top voices data not available" });
      }

      // Extract all posts from all authors across all topics
      let allPosts = [];

      topVoices.topics.forEach((topic) => {
        if (!topic || !topic.authors || !Array.isArray(topic.authors)) {
          return;
        }

        topic.authors.forEach((author) => {
          if (!author) {
            return;
          }

          if (!author.posts || !Array.isArray(author.posts)) {
            return;
          }

          // Create detailed post objects with topic and author information
          const detailedPosts = author.posts
            .filter((post) => post) // Filter out null/undefined posts
            .map((post) => ({
              id: post.id || `unknown_${Date.now()}`,
              authorName: author.name || "Anonymous",
              authorHeadline: author.headline || "",
              authorFollowerCount: author.followerCount || 0,
              topic: topic.tag || "unknown",
              date: post.date ? formatDateRelative(post.date) : post.date,
              text: post.text || "",
              link: post.link || "", // Include the post link
              commentCount: post.comment_counter || 0,
              reactionCount: post.reaction_counter || 0,
              repostCount: post.repost_counter || 0,
              totalEngagement:
                (post.comment_counter || 0) +
                (post.reaction_counter || 0) +
                (post.repost_counter || 0),
            }));

          allPosts = [...allPosts, ...detailedPosts];
        });
      });

      // Sort by total engagement (reactions + comments + reposts)
      allPosts.sort((a, b) => b.totalEngagement - a.totalEngagement);

      // Cache all trending posts
      topVoicesCache.set("trendingPosts", allPosts, 21600);

      // Save trending posts to file
      try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(
          TRENDING_POSTS_FILE,
          JSON.stringify(allPosts, null, 2)
        );
        console.log("Trending posts saved to file successfully");
      } catch (fileError) {
        console.error("Failed to save trending posts to file:", fileError);
      }

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedPosts = allPosts.slice(startIndex, endIndex);

      return res.json({
        totalPosts: allPosts.length,
        page,
        limit,
        totalPages: Math.ceil(allPosts.length / limit),
        posts: paginatedPosts,
      });
    } else {
      // Get cached trending posts
      const allPosts = topVoicesCache.get("trendingPosts");

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedPosts = allPosts.slice(startIndex, endIndex);

      return res.json({
        totalPosts: allPosts.length,
        page,
        limit,
        totalPages: Math.ceil(allPosts.length / limit),
        posts: paginatedPosts,
      });
    }
  } catch (error) {
    console.error("Error fetching trending posts:", error);
    res.status(500).json({
      message: "Failed to fetch trending posts",
      error: error.message,
    });
  }
};

/**
 * Get posts by a specific top voice author
 * @param {string} authorId - The ID of the top voice author
 */
const getAuthorPosts = async (req, res) => {
  try {
    const { authorId } = req.params;

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // Increased from 10 to 20

    // Check if data exists in cache
    if (!topVoicesCache.has("topVoices")) {
      await initializeTopVoicesData();
    }

    const topVoices = topVoicesCache.get("topVoices");

    if (!topVoices || !topVoices.topics) {
      return res.status(404).json({ message: "Top voices data not available" });
    }

    // Find the author across all topics
    let authorPosts = [];
    let authorFound = false;
    let authorName = "";
    let authorHeadline = "";
    let authorFollowerCount = 0;
    let authorTopic = "";

    topVoices.topics.forEach((topic) => {
      if (!topic || !topic.authors || !Array.isArray(topic.authors)) {
        return;
      }

      const author = topic.authors.find(
        (a) =>
          a &&
          ((a.name && a.name.toLowerCase() === authorId.toLowerCase()) ||
            (a.name &&
              a.name.replace(/\s+/g, "-").toLowerCase() ===
                authorId.toLowerCase()))
      );

      if (author && author.posts && Array.isArray(author.posts)) {
        authorFound = true;
        authorName = author.name || authorId;
        authorHeadline = author.headline || "";
        authorFollowerCount = author.followerCount || 0;
        authorTopic = topic.tag || "unknown";

        // Include all post details including links
        const detailedPosts = author.posts
          .filter((post) => post) // Filter out null/undefined posts
          .map((post) => ({
            id: post.id || `unknown_${Date.now()}`,
            date: post.date ? formatDateRelative(post.date) : post.date,
            topic: topic.tag || "unknown",
            text: post.text || "",
            link: post.link || "", // Include the post link
            commentCount: post.comment_counter || 0,
            reactionCount: post.reaction_counter || 0,
            repostCount: post.repost_counter || 0,
            totalEngagement:
              (post.comment_counter || 0) +
              (post.reaction_counter || 0) +
              (post.repost_counter || 0),
          }));

        authorPosts = [...authorPosts, ...detailedPosts];
      }
    });

    if (!authorFound) {
      // Return a more helpful error message listing some available authors
      const sampleAuthors = [];
      topVoices.topics.forEach((topic) => {
        if (topic && topic.authors && Array.isArray(topic.authors)) {
          topic.authors.slice(0, 3).forEach((author) => {
            if (author && author.name) {
              sampleAuthors.push({
                name: author.name,
                topic: topic.tag || "unknown",
              });
            }
          });
        }
      });

      return res.status(404).json({
        message: "Author not found",
        suggestion: "Try one of these sample authors:",
        sampleAuthors: sampleAuthors.slice(0, 10), // Show more sample authors
      });
    }

    // Sort posts by engagement
    authorPosts.sort((a, b) => b.totalEngagement - a.totalEngagement);

    // Apply pagination to the posts
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedPosts = authorPosts.slice(startIndex, endIndex);

    res.json({
      name: authorName,
      headline: authorHeadline,
      followerCount: authorFollowerCount,
      primaryTopic: authorTopic,
      totalPosts: authorPosts.length,
      page,
      limit,
      totalPages: Math.ceil(authorPosts.length / limit),
      posts: paginatedPosts,
    });
  } catch (error) {
    console.error("Error fetching author posts:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch author posts", error: error.message });
  }
};

/**
 * Debug endpoint to check data structure
 * This should be removed in production
 */
const debugDataStructure = async (req, res) => {
  try {
    // Check if data exists in cache
    if (!topVoicesCache.has("topVoices")) {
      await initializeTopVoicesData();
    }

    const topVoices = topVoicesCache.get("topVoices");

    if (!topVoices) {
      return res.status(404).json({ message: "Top voices data not available" });
    }

    // Create a simplified structure overview without the full data
    const structureSummary = {
      hasTopics: !!topVoices.topics,
      topicsIsArray: Array.isArray(topVoices.topics),
      topicsCount: topVoices.topics ? topVoices.topics.length : 0,
      topics: topVoices.topics
        ? topVoices.topics.map((topic) => ({
            tag: topic.tag || "unknown",
            hasAuthors: !!topic.authors,
            authorsIsArray: Array.isArray(topic.authors),
            authorsCount: topic.authors ? topic.authors.length : 0,
            // Sample of first author if available
            sampleAuthor:
              topic.authors && topic.authors.length > 0
                ? {
                    hasName: !!topic.authors[0].name,
                    hasPosts: !!topic.authors[0].posts,
                    postsIsArray: Array.isArray(topic.authors[0].posts),
                    postsCount: topic.authors[0].posts
                      ? topic.authors[0].posts.length
                      : 0,
                  }
                : null,
          }))
        : [],
    };

    res.json(structureSummary);
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    res.status(500).json({
      message: "Failed to debug data structure",
      error: error.message,
    });
  }
};

/**
 * Force refresh all data by clearing cache and reloading
 */
const refreshAllData = async (req, res) => {
  try {
    console.log("Force refreshing all data...");

    // Clear all cache
    topVoicesCache.flushAll();

    // Reload top voices data
    await initializeTopVoicesData();

    // Get stats about the reloaded data
    const topVoices = topVoicesCache.get("topVoices");

    if (!topVoices || !topVoices.topics) {
      return res.status(500).json({ message: "Failed to reload data" });
    }

    // Collect detailed stats for each topic
    const topicStats = topVoices.topics.map((topic) => {
      // Skip invalid topics
      if (!topic || !topic.authors || !Array.isArray(topic.authors)) {
        return {
          topic: topic?.tag || "unknown",
          authorCount: 0,
          totalPosts: 0,
        };
      }

      // Get all authors with post counts
      const authorsWithCounts = topic.authors.map((author) => {
        const postCount =
          author.posts && Array.isArray(author.posts) ? author.posts.length : 0;

        return {
          name: author.name || "Anonymous",
          postCount: postCount,
        };
      });

      // Sort authors by post count (descending)
      authorsWithCounts.sort((a, b) => b.postCount - a.postCount);

      // Count total posts across all authors
      const totalPosts = authorsWithCounts.reduce((total, author) => {
        return total + author.postCount;
      }, 0);

      // Get top authors (up to 5) for verification
      const sampleAuthors = authorsWithCounts.slice(0, 5);

      return {
        topic: topic.tag || "unknown",
        authorCount: topic.authors.length,
        totalPosts: totalPosts,
        sampleAuthors,
        // Add distribution metrics
        avgPostsPerAuthor:
          topic.authors.length > 0
            ? (totalPosts / topic.authors.length).toFixed(1)
            : 0,
        maxPostsByAuthor:
          authorsWithCounts.length > 0 ? authorsWithCounts[0].postCount : 0,
      };
    });

    // Sort topics by total posts (descending)
    topicStats.sort((a, b) => b.totalPosts - a.totalPosts);

    // Count totals
    const totalAuthors = topVoices.topics.reduce((sum, topic) => {
      return sum + (topic.authors ? topic.authors.length : 0);
    }, 0);

    const totalPosts = topVoices.topics.reduce((sum, topic) => {
      if (!topic || !topic.authors) return sum;

      const topicPosts = topic.authors.reduce((authorSum, author) => {
        return authorSum + (author.posts ? author.posts.length : 0);
      }, 0);

      return sum + topicPosts;
    }, 0);

    // Return comprehensive stats
    res.json({
      message: "Data refreshed successfully",
      totalTopics: topVoices.topics.length,
      totalAuthors,
      totalPosts,
      topicStats,
    });
  } catch (error) {
    console.error("Error refreshing data:", error);
    res.status(500).json({
      message: "Failed to refresh data",
      error: error.message,
    });
  }
};

/**
 * Get all posts across all topics and authors
 */
const getAllPosts = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // Show up to 50 posts per page

    // Check if data exists in cache
    if (!topVoicesCache.has("topVoices")) {
      await initializeTopVoicesData();
    }

    const topVoices = topVoicesCache.get("topVoices");

    if (!topVoices || !topVoices.topics) {
      return res.status(404).json({ message: "Top voices data not available" });
    }

    // Extract all posts from all authors across all topics
    let allPosts = [];

    topVoices.topics.forEach((topic) => {
      if (!topic || !topic.authors || !Array.isArray(topic.authors)) {
        return;
      }

      topic.authors.forEach((author) => {
        if (!author || !author.posts || !Array.isArray(author.posts)) {
          return;
        }

        // Create detailed post objects with topic and author information
        const detailedPosts = author.posts
          .filter((post) => post) // Filter out null/undefined posts
          .map((post) => ({
            id: post.id || `unknown_${Date.now()}`,
            authorName: author.name || "Anonymous",
            authorHeadline: author.headline || "",
            authorFollowerCount: author.followerCount || 0,
            topic: topic.tag || "unknown",
            date: post.date ? formatDateRelative(post.date) : post.date,
            text: post.text || "",
            link: post.link || "",
            commentCount: post.comment_counter || 0,
            reactionCount: post.reaction_counter || 0,
            repostCount: post.repost_counter || 0,
            totalEngagement:
              (post.comment_counter || 0) +
              (post.reaction_counter || 0) +
              (post.repost_counter || 0),
          }));

        allPosts = [...allPosts, ...detailedPosts];
      });
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedPosts = allPosts.slice(startIndex, endIndex);

    return res.json({
      totalPosts: allPosts.length,
      page,
      limit,
      totalPages: Math.ceil(allPosts.length / limit),
      posts: paginatedPosts,
    });
  } catch (error) {
    console.error("Error fetching all posts:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch all posts", error: error.message });
  }
};

// Export all controller functions
module.exports = {
  getAllTopVoices,
  getTopics,
  getTopVoicesByTopic,
  getTrendingPosts,
  getAuthorPosts,
  getAllPosts,
  refreshTopVoicesData: initializeTopVoicesData,
  refreshAllData,
  debugDataStructure,
  topVoicesCache,
};
