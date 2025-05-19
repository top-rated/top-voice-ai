document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const chatForm = document.getElementById("chat-form");
  const messageInput = document.getElementById("message-input");
  const chatContainer = document.getElementById("chat-container");
  const deleteAllChatsButton = document.getElementById("delete-all-chats");
  const deleteAllChatsMobileButton = document.getElementById(
    "delete-all-chats-mobile"
  );
  const newChatButton = document.getElementById("new-chat");
  const newChatMobileButton = document.getElementById("new-chat-mobile");
  const mobileMenuButton = document.getElementById("mobile-menu-button");
  const sidebar = document.querySelector(".w-64.bg-dark-800");
  const promptCards = document.querySelectorAll(".prompt-card");
  const chatHistoryList = document.getElementById("chat-history-list");

  // Create overlay element for mobile sidebar
  const overlay = document.createElement("div");
  overlay.className = "sidebar-overlay";
  document.body.appendChild(overlay);

  // Chat history storage
  let chatHistory = {};
  let currentThreadId = "thread_" + Date.now();

  // Mobile menu toggle
  mobileMenuButton.addEventListener("click", function () {
    sidebar.classList.toggle("sidebar-mobile");
    sidebar.classList.toggle("open");
    sidebar.classList.toggle("hidden");
    overlay.classList.toggle("open");
  });

  // Close sidebar when clicking overlay
  overlay.addEventListener("click", function () {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
    setTimeout(() => {
      sidebar.classList.add("hidden");
      sidebar.classList.remove("sidebar-mobile");
    }, 300);
  });

  // Get welcome container
  const welcomeContainer = document.getElementById("welcome-container");

  // Handle prompt cards in welcome message
  promptCards.forEach((card, index) => {
    card.addEventListener("click", function () {
      let promptText = "";

      // Set different prompt text based on which card was clicked
      switch (index) {
        case 0: // Trending Topics
          promptText = "What are the trending topics on LinkedIn right now?";
          break;
        case 1: // Content Creation
          promptText = "Help me write a LinkedIn post about innovation";
          break;
        case 2: // Engagement Tips
          promptText =
            "What engagement patterns are most effective on LinkedIn?";
          break;
        case 3: // Profile Analysis
          promptText =
            "How can I optimize my LinkedIn profile for better visibility?";
          break;
      }

      // Hide the welcome container
      welcomeContainer.style.display = "none";

      messageInput.value = promptText;
      sendMessage(promptText);
    });
  });

  // No longer needed as we removed the feature buttons

  // Function to delete all chats
  function deleteAllChats() {
    // Confirm with the user
    if (
      confirm(
        "Are you sure you want to delete all chats? This cannot be undone."
      )
    ) {
      // Clear chat history
      chatHistory = {};

      // Save to local storage
      saveChatHistory();

      // Create a new chat
      createNewChat();
    }
  }

  // Handle delete all chats button
  deleteAllChatsButton.addEventListener("click", function () {
    deleteAllChats();
  });

  // Handle delete all chats mobile button
  if (deleteAllChatsMobileButton) {
    deleteAllChatsMobileButton.addEventListener("click", function () {
      deleteAllChats();

      // Close mobile sidebar if open
      if (sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
        overlay.classList.remove("open");
        setTimeout(() => {
          sidebar.classList.add("hidden");
          sidebar.classList.remove("sidebar-mobile");
        }, 300);
      }
    });
  }

  // Handle upgrade button
  const upgradeButton = document.getElementById("upgrade-button");
  if (upgradeButton) {
    upgradeButton.addEventListener("click", function () {
      // Add a bot message about upgrading
      const upgradeMessage =
        "To upgrade to Premium and unlock all features, please visit our website at https://top-rated.pro/l/gpt or contact our sales team at sales@top-rated.pro";

      // Hide the welcome container if it's visible
      if (welcomeContainer.style.display !== "none") {
        welcomeContainer.style.display = "none";
      }

      // Close mobile sidebar if open
      if (sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
        overlay.classList.remove("open");
        setTimeout(() => {
          sidebar.classList.add("hidden");
          sidebar.classList.remove("sidebar-mobile");
        }, 300);
      }

      // Add a fake user message
      addUserMessage("How do I upgrade to Premium?");

      // Add bot response
      const botMessageElement = addBotMessage();
      streamText(botMessageElement, upgradeMessage);
    });
  }

  // Auto-resize textarea as user types
  messageInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
  });

  // Load chat history from local storage
  function loadChatHistory() {
    const savedHistory = localStorage.getItem("topVoicesAI_chatHistory");
    if (savedHistory) {
      chatHistory = JSON.parse(savedHistory);
      updateChatHistoryUI();
    }
  }

  // Save chat history to local storage
  function saveChatHistory() {
    localStorage.setItem(
      "topVoicesAI_chatHistory",
      JSON.stringify(chatHistory)
    );
    updateChatHistoryUI();
  }

  // Update chat history UI in sidebar
  function updateChatHistoryUI() {
    chatHistoryList.innerHTML = "";

    // Sort threads by last message timestamp (newest first)
    const sortedThreads = Object.keys(chatHistory).sort((a, b) => {
      const aTimestamp = chatHistory[a].lastMessageTime || 0;
      const bTimestamp = chatHistory[b].lastMessageTime || 0;
      return bTimestamp - aTimestamp;
    });

    sortedThreads.forEach((threadId) => {
      const thread = chatHistory[threadId];
      if (thread.messages && thread.messages.length > 0) {
        const firstUserMessage = thread.messages.find((m) => m.role === "user");
        const title = firstUserMessage
          ? firstUserMessage.content.length > 15
            ? firstUserMessage.content.substring(0, 15) + "..."
            : firstUserMessage.content
          : "New chat";

        // Create container for the history item
        const historyItemContainer = document.createElement("div");
        historyItemContainer.className = "flex items-center w-full";

        // Create the chat history button
        const historyItem = document.createElement("button");
        historyItem.className = `flex-grow text-left px-3 py-2 rounded-md flex items-center text-sm font-medium min-w-0 ${
          threadId === currentThreadId
            ? "bg-white/10 text-blue-300"
            : "text-gray-300 hover:bg-white/5 hover:text-blue-300"
        } transition-colors`;
        historyItem.innerHTML = `
          <i class="fas fa-comment w-4 h-4 mr-2 flex-shrink-0 text-gray-400 flex items-center justify-center"></i>
          <span class="truncate w-full">${escapeHtml(title)}</span>
        `;

        historyItem.addEventListener("click", () => {
          loadChat(threadId);
        });

        // Create delete button
        const deleteButton = document.createElement("button");
        deleteButton.className =
          "p-1 ml-1 flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors";
        deleteButton.innerHTML = `<i class="fas fa-times"></i>`;
        deleteButton.title = "Delete this chat";

        // Add event listener to delete button
        deleteButton.addEventListener("click", (e) => {
          e.stopPropagation(); // Prevent triggering the parent button click
          deleteChat(threadId);
        });

        // Append elements to container
        historyItemContainer.appendChild(historyItem);
        historyItemContainer.appendChild(deleteButton);

        // Add the container to the chat history list
        chatHistoryList.appendChild(historyItemContainer);
      }
    });
  }

  // Delete a specific chat
  function deleteChat(threadId) {
    // If deleting the current chat, create a new chat
    const isCurrentChat = threadId === currentThreadId;

    // Delete the chat from history
    delete chatHistory[threadId];

    // Save to local storage
    saveChatHistory();

    // If we deleted the current chat, create a new one
    if (isCurrentChat) {
      createNewChat();
    }
  }

  // Load a specific chat thread
  function loadChat(threadId) {
    if (!chatHistory[threadId]) return;

    currentThreadId = threadId;
    clearChat();

    const thread = chatHistory[threadId];
    if (thread.messages && thread.messages.length > 0) {
      // Hide welcome container
      welcomeContainer.style.display = "none";

      // Add messages to chat
      thread.messages.forEach((message) => {
        if (message.role === "user") {
          const messageElement = document.createElement("div");
          messageElement.className =
            "flex items-start w-full max-w-2xl mb-4 animate-fade-in";
          messageElement.innerHTML = `
            <div class="flex-shrink-0 mr-3 mt-1">
              <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <i class="fas fa-user text-white text-sm"></i>
              </div>
            </div>
            <div class="rounded-lg p-3 flex-grow markdown">
              <p class="text-sm text-white">${escapeHtml(message.content)}</p>
            </div>
          `;
          chatContainer.appendChild(messageElement);
        } else if (message.role === "assistant") {
          const messageElement = document.createElement("div");
          messageElement.className =
            "flex items-start w-full max-w-2xl mb-4 animate-fade-in";

          // Add bot icon
          const iconDiv = document.createElement("div");
          iconDiv.className = "flex-shrink-0 mr-3 mt-1";
          iconDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
              <i class="fas fa-robot text-white text-sm"></i>
            </div>
          `;
          messageElement.appendChild(iconDiv);

          const contentDiv = document.createElement("div");
          contentDiv.className = "rounded-lg p-3 flex-grow markdown";
          contentDiv.innerHTML = processMarkdown(message.content);

          messageElement.appendChild(contentDiv);
          chatContainer.appendChild(messageElement);
        }
      });

      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Update UI to show active chat
    updateChatHistoryUI();
  }

  // Create a new chat
  function createNewChat() {
    // Generate new thread ID
    currentThreadId = "thread_" + Date.now();

    // Clear all messages
    clearChat();

    // Show welcome container and make sure it's visible
    welcomeContainer.style.display = "block";

    // Update chat history UI
    updateChatHistoryUI();
  }

  // Clear the current chat
  function clearChat() {
    // Get reference to welcome container
    const welcomeContainer = document.getElementById("welcome-container");

    // Remove all messages
    while (chatContainer.firstChild) {
      if (chatContainer.firstChild !== welcomeContainer) {
        chatContainer.removeChild(chatContainer.firstChild);
      } else {
        // Skip the welcome container
        const nextSibling = chatContainer.firstChild.nextSibling;
        if (nextSibling) {
          chatContainer.removeChild(nextSibling);
        } else {
          break;
        }
      }
    }

    // Make sure welcome container is in the chat container
    if (welcomeContainer && !chatContainer.contains(welcomeContainer)) {
      chatContainer.appendChild(welcomeContainer);
    }
  }

  // Add user message to chat
  function addUserMessage(message) {
    // Get reference to welcome container
    const welcomeContainer = document.getElementById("welcome-container");

    // Hide welcome container
    if (welcomeContainer) {
      welcomeContainer.style.display = "none";
    }

    const messageElement = document.createElement("div");
    messageElement.className =
      "flex items-start w-full max-w-2xl mb-4 animate-slide-up";
    messageElement.innerHTML = `
      <div class="flex-shrink-0 mr-3 mt-1">
        <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
          <i class="fas fa-user text-white text-sm"></i>
        </div>
      </div>
      <div class="rounded-lg p-3 flex-grow markdown">
        <p class="text-sm text-white">${escapeHtml(message)}</p>
      </div>
    `;

    // Add the message to the chat container
    chatContainer.appendChild(messageElement);

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Add bot message to chat
  function addBotMessage() {
    const messageElement = document.createElement("div");
    messageElement.className =
      "flex items-start w-full max-w-2xl mb-4 animate-fade-in";

    // Add bot icon
    const iconDiv = document.createElement("div");
    iconDiv.className = "flex-shrink-0 mr-3 mt-1";
    iconDiv.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
        <i class="fas fa-robot text-white text-sm"></i>
      </div>
    `;
    messageElement.appendChild(iconDiv);

    // Create the message content div
    const contentDiv = document.createElement("div");
    contentDiv.className = "rounded-lg p-3 flex-grow markdown";
    contentDiv.id = "bot-message-" + Date.now();

    // Add typing indicator initially
    contentDiv.innerHTML = `
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;

    // Assemble the message element
    messageElement.appendChild(contentDiv);

    // Add to chat and scroll to bottom
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    return contentDiv;
  }

  // Note: Typing indicator is now handled directly in the addBotMessage function

  // Process markdown in text
  function processMarkdown(text) {
    // This is a simple implementation - for production, use a proper markdown library

    // Process code blocks
    text = text.replace(/```([\s\S]*?)```/g, function (_, code) {
      return `<pre><code>${escapeHtml(
        code.trim()
      )}</code><button class="copy-button" onclick="copyToClipboard(this)">Copy</button></pre>`;
    });

    // Process inline code
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Process bold
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    // Process italic
    text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    // Process links
    text = text.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // Process lists (simple implementation)
    text = text.replace(/^\s*-\s+(.+)$/gm, "<li>$1</li>");
    text = text.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

    // Process paragraphs (simple implementation)
    text = text.replace(/^(.+)$/gm, function (match) {
      if (match.startsWith("<")) return match; // Skip HTML
      return "<p>" + match + "</p>";
    });

    return text;
  }

  // Escape HTML to prevent XSS
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Copy code to clipboard
  window.copyToClipboard = async function (button) {
    const codeBlock = button.previousSibling;
    const text = codeBlock.textContent;

    try {
      // Use the modern Clipboard API
      await navigator.clipboard.writeText(text);

      // Change button text temporarily
      const originalText = button.textContent;
      button.textContent = "Copied!";
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);

      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();

      try {
        document.execCommand("copy");

        // Change button text temporarily
        const originalText = button.textContent;
        button.textContent = "Copied!";
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      } catch (e) {
        console.error("Fallback copy failed: ", e);
        button.textContent = "Copy failed";
        setTimeout(() => {
          button.textContent = "Copy";
        }, 2000);
      }

      document.body.removeChild(textArea);
    }
  };

  // Render the response text with markdown formatting
  function streamText(element, text) {
    return new Promise((resolve) => {
      // Clear the typing indicator
      element.innerHTML = "";

      // Process markdown and set the HTML
      element.innerHTML = processMarkdown(text);

      // Scroll to bottom to show the new content
      chatContainer.scrollTop = chatContainer.scrollHeight;

      resolve();
    });
  }

  // Send message to API and handle response
  async function sendMessage(message) {
    try {
      // Initialize chat history for this thread if it doesn't exist
      if (!chatHistory[currentThreadId]) {
        chatHistory[currentThreadId] = {
          messages: [],
          lastMessageTime: Date.now(),
        };
      }

      // Save user message to chat history
      chatHistory[currentThreadId].messages.push({
        role: "user",
        content: message,
        timestamp: Date.now(),
      });

      // Update last message time
      chatHistory[currentThreadId].lastMessageTime = Date.now();

      // Save to local storage
      saveChatHistory();

      // Add user message to chat
      addUserMessage(message);

      // Add bot typing indicator
      const botMessageElement = addBotMessage();

      // Send request to API
      const response = await fetch("/api/v1/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId: currentThreadId,
          query: message,
        }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();

      // Stream the response text
      await streamText(botMessageElement, data.response);

      // Save bot response to chat history
      chatHistory[currentThreadId].messages.push({
        role: "assistant",
        content: data.response,
        timestamp: Date.now(),
      });

      chatHistory[currentThreadId].lastMessageTime = Date.now();
      saveChatHistory();

      // Scroll to bottom after streaming completes
      chatContainer.scrollTop = chatContainer.scrollHeight;
    } catch (error) {
      console.error("Error:", error);
      // Handle error - show error message in chat
      const errorElement = document.createElement("div");
      errorElement.className = "text-red-500 text-center my-4";
      errorElement.textContent =
        "Sorry, there was an error processing your request. Please try again.";
      chatContainer.appendChild(errorElement);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  // Handle form submission
  chatForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (message) {
      sendMessage(message);
      messageInput.value = "";
      messageInput.style.height = "auto";
    }
  });

  // No clear chat button handlers needed anymore as we've replaced them with delete functionality

  // Handle new chat button
  newChatButton.addEventListener("click", function () {
    createNewChat();
  });

  // Handle new chat mobile button
  newChatMobileButton.addEventListener("click", function () {
    createNewChat();

    // Close mobile sidebar if open
    if (sidebar.classList.contains("open")) {
      sidebar.classList.remove("open");
      overlay.classList.remove("open");
      setTimeout(() => {
        sidebar.classList.add("hidden");
        sidebar.classList.remove("sidebar-mobile");
      }, 300);
    }
  });

  // Load chat history from local storage
  loadChatHistory();

  // Focus input on page load
  messageInput.focus();
});
