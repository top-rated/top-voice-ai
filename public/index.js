document.addEventListener("DOMContentLoaded", function () {
  // Theme Handling
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  
  // Function to set theme
  function setTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      themeIcon.classList.remove('fa-moon');
      themeIcon.classList.add('fa-sun');
    } else {
      document.documentElement.removeAttribute('data-theme');
      themeIcon.classList.remove('fa-sun');
      themeIcon.classList.add('fa-moon');
    }
    localStorage.setItem('theme', theme);
  }
  
  // Check for saved theme preference or use device preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    setTheme(prefersDarkMode ? 'dark' : 'light');
  }
  
  // Theme toggle click event
  themeToggle.addEventListener('click', function() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  });

  // Initialize highlight.js with auto-detection
  hljs.configure({
    languages: [
      "javascript",
      "python",
      "html",
      "css",
      "json",
      "bash",
      "shell",
      "typescript",
      "java",
      "c",
      "cpp",
      "csharp",
      "php",
      "ruby",
      "go",
      "rust",
      "sql",
      "xml",
      "markdown",
      "yaml",
      "swift",
      "plaintext",
      "powershell",
      "jsx",
      "tsx",
    ],
  });
  // DOM Elements
  const chatForm = document.getElementById("chat-form");
  const messageInput = document.getElementById("message-input");
  const chatContainer = document.getElementById("chat-container");
  const deleteAllChatsButton = document.getElementById("delete-all-chats");
  const deleteAllChatsMobileButton = document.getElementById(
    "delete-all-chats-mobile"
  );
  const newChatButton = document.getElementById("new-chat");
  const newChatMiniButton = document.getElementById("new-chat-mini");
  const newChatMobileButton = document.getElementById("new-chat-mobile");
  const mobileMenuButton = document.getElementById("mobile-menu-button");
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebarExpandMini = document.getElementById("sidebar-expand-mini");
  const promptCards = document.querySelectorAll(".prompt-card");
  const chatHistoryList = document.getElementById("chat-history-list");
  const miniChatHistory = document.getElementById("mini-chat-history");

  // Create overlay element for mobile sidebar
  const overlay = document.createElement("div");
  overlay.className = "sidebar-overlay";
  document.body.appendChild(overlay);

  // Chat history storage
  let chatHistory = {};
  let currentThreadId = "thread_" + Date.now();

  // Check if sidebar state is stored in localStorage
  const sidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
  if (sidebarCollapsed) {
    sidebar.classList.add("collapsed");
  }

  // Sidebar toggle functionality
  sidebarToggle.addEventListener("click", function () {
    sidebar.classList.add("collapsed");
    localStorage.setItem("sidebarCollapsed", "true");
  });

  // Sidebar expand functionality from mini sidebar
  sidebarExpandMini.addEventListener("click", function () {
    sidebar.classList.remove("collapsed");
    localStorage.setItem("sidebarCollapsed", "false");
  });

  // New chat functionality from mini sidebar
  newChatMiniButton.addEventListener("click", function () {
    createNewChat();
  });
  
  // Main new chat button functionality
  newChatButton.addEventListener("click", function () {
    createNewChat();
  });

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
          promptText = "FREE: show new posts of LinkedIn Top Voices 2025";
          break;
        case 1: // Content Creation
          promptText = "Generate post from article in a certain profile style";
          break;
        case 2: // Engagement Tips
          promptText = "Analyze posts content and style of certain profile";
          break;
        case 3: // Profile Analysis
          promptText = "Search past 24hr posts with certain keywords";
          break;
      }

      // Hide the welcome container
      welcomeContainer.style.display = "none";

      messageInput.value = promptText;
      sendMessage(promptText);

      // Clear the input after sending
      messageInput.value = "";
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

  // Handle delete all chats mini button
  const deleteAllChatsMiniButton = document.getElementById(
    "delete-all-chats-mini"
  );
  if (deleteAllChatsMiniButton) {
    deleteAllChatsMiniButton.addEventListener("click", function () {
      deleteAllChats();
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
    miniChatHistory.innerHTML = "";

    // Sort threads by last message timestamp (newest first)
    const sortedThreads = Object.keys(chatHistory).sort((a, b) => {
      const aTimestamp = chatHistory[a].lastMessageTime || 0;
      const bTimestamp = chatHistory[b].lastMessageTime || 0;
      return bTimestamp - aTimestamp;
    });

    sortedThreads.forEach((threadId, index) => {
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
            ? "bg-[var(--hover-bg)] text-[var(--active-color)]"
            : "text-[var(--text-primary)] hover:bg-[var(--hover-bg)] hover:text-[var(--active-color)]"
        } transition-colors chat-history-item`;
        historyItem.innerHTML = `
          <span class="icon-comment w-4 h-4 mr-2 flex-shrink-0 text-[var(--text-primary)] flex items-center justify-center"></span>
          <span class="truncate w-full">${escapeHtml(title)}</span>
        `;

        historyItem.addEventListener("click", () => {
          loadChat(threadId);
        });

        // Create delete button
        const deleteButton = document.createElement("button");
        deleteButton.className =
          "p-1 ml-1 flex-shrink-0 text-[var(--text-primary)] hover:text-red-500 transition-colors";
        deleteButton.innerHTML = `<span class="icon-times"></span>`;
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

        // Create mini sidebar history item (only show first 5 for space)
        if (index < 5) {
          const miniHistoryItem = document.createElement("button");
          miniHistoryItem.className = `mini-button text-[var(--text-primary)] ${
            threadId === currentThreadId ? "bg-[var(--hover-bg)]" : "hover:bg-[var(--hover-bg)]"
          }`;
          miniHistoryItem.title = title;
          miniHistoryItem.innerHTML = `<span class="icon-comment"></span>`;

          miniHistoryItem.addEventListener("click", () => {
            loadChat(threadId);
          });

          miniChatHistory.appendChild(miniHistoryItem);
        }
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
                <span class="icon-user text-sm flex items-center justify-center w-full h-full"></span>
              </div>
            </div>
            <div class="rounded-lg p-3 flex-grow markdown">
              <p class="text-sm user-message">${escapeHtml(message.content)}</p>
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
              <span class="icon-robot text-white text-sm flex items-center justify-center w-full h-full"></span>
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

      // Apply syntax highlighting to code blocks
      applyHighlighting();
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
      "flex items-start w-full max-w-2xl mb-4 animate-slide-up mx-auto";
    messageElement.innerHTML = `
      <div class="flex-shrink-0 mr-3 mt-1">
        <div class="w-8 h-8 rounded-full flex items-center justify-center">
          <span class="icon-user text-sm flex items-center justify-center w-full h-full"></span>
        </div>
      </div>
      
      <div class="rounded-lg p-3 flex-grow markdown">
        <p class="text-sm">${escapeHtml(message)}</p>
      </div>
    `;

    // Add the message to the chat container
    chatContainer.appendChild(messageElement);

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Add bot message to chat
  function addBotMessage() {
    const messageContainer = document.createElement("div");
    messageContainer.className = "flex items-start w-full max-w-2xl mb-4 animate-slide-up mx-auto";

    // Create avatar container similar to user message
    const avatarDiv = document.createElement("div");
    avatarDiv.className = "flex-shrink-0 mr-3 mt-1";
    avatarDiv.innerHTML = `
      <div class="w-8 h-8 rounded-full flex items-center justify-center">
        <img src="/top-voices.png" alt="AI" class="w-6 h-6 object-cover" />
      </div>
    `;
    
    // Create message content container
    const contentDiv = document.createElement("div");
    contentDiv.className = "rounded-lg p-3 flex-grow markdown";
    
    // Create text content area for actual message content
    const textContent = document.createElement("div");
    textContent.className = "text-content text-sm";
    contentDiv.appendChild(textContent);
  
    // Create typing indicator (will be hidden when content is displayed)
    const typingIndicator = document.createElement("div");
    typingIndicator.className = "typing-indicator";
    contentDiv.appendChild(typingIndicator);
    
    // Assemble the message
    messageContainer.appendChild(avatarDiv);
    messageContainer.appendChild(contentDiv);
    chatContainer.appendChild(messageContainer);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return messageContainer;
  }

  // Note: Typing indicator is now handled directly in the addBotMessage function

  // Apply syntax highlighting to code blocks within a specific element
  function applyHighlightingInElement(element) {
    element.querySelectorAll("pre code").forEach((block) => {
      // Check if already highlighted to prevent re-highlighting
      if (!block.classList.contains("hljs-added")) {
        hljs.highlightElement(block);
        block.classList.add("hljs-added"); // Mark as highlighted
      }
    });
  }

  // Global highlighting function (can be called after major DOM changes if needed)
  function applyHighlighting() {
    applyHighlightingInElement(document.body); // Apply to the whole body or a specific container
  }

  // Process markdown in text
  function processMarkdown(text) {
    // Process code blocks with language support
    text = text.replace(
      /```([\w-]*)\s*\n([\s\S]*?)```/g,
      function (_, language, code) {
        const languageClass = language ? ` class="language-${language}"` : "";
        // Use a data attribute instead of an inline onclick handler to avoid CSP issues
        return `<pre><code${languageClass}>${escapeHtml(
          code.trim()
        )}</code><button class="copy-button" data-copy="true">Copy</button></pre>`;
      }
    );

    // Process inline code
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Process bold
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    // Process italic
    text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    
    // Process Stripe checkout URLs - convert to clean payment links
    // Look for stripe checkout URLs in the text and completely replace them
    const stripeUrlRegex = /(https:\/\/checkout\.stripe\.com\/[^\s"'<>]+)/g;
    if (stripeUrlRegex.test(text)) {
      // If we have a Stripe URL, create a completely clean message
      const matches = text.match(stripeUrlRegex);
      if (matches && matches.length > 0) {
        // Get the first URL (in case there are multiple)
        const url = matches[0];
        // Replace the entire text with a clean message
        return `<p>Please use this secure link to complete your payment:</p>
<p><a href="${url}" target="_blank" rel="noopener noreferrer" class="payment-button">Complete Your Payment</a></p>
<p>You'll be redirected to Stripe to enter your payment details securely.</p>`;
      }
    }

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

  // Copy code to clipboard function
  async function copyToClipboard(button) {
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

      // Show error message on button
      button.textContent = "Copy failed";
      setTimeout(() => {
        button.textContent = "Copy";
      }, 2000);
    }
  }
  
  // Set up event delegation for copy buttons to avoid CSP issues with inline handlers
  document.addEventListener('click', function(event) {
    // Check if the clicked element is a copy button
    if (event.target.classList.contains('copy-button') || event.target.hasAttribute('data-copy')) {
      copyToClipboard(event.target);
    }
  });

  // Store current bot message element for streaming text
let currentBotMessageContentElement = null;

// Store tool call elements for reference when updating with results
let currentToolCallElements = {};

async function streamText(element, textChunk, append = false) {
  let newRawText;
  if (append) {
    newRawText = (element.dataset.rawText || "") + textChunk;
  } else {
    newRawText = textChunk;
  }
  element.dataset.rawText = newRawText; // Store the raw text

  element.innerHTML = processMarkdown(newRawText);
  applyHighlightingInElement(element);

  const chatContainer = document.getElementById("chat-container");
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

// Helper to create/get the current bot message element for text streaming
function ensureCurrentBotMessageElement() {
  // Find the last bot message using the new class structure
  let lastBotMessage = chatContainer.querySelector(".flex.items-start.mx-auto:last-child");
  
  // Check if the currentBotMessageContentElement is valid and part of the DOM
  if (currentBotMessageContentElement && document.body.contains(currentBotMessageContentElement)) {
    return currentBotMessageContentElement;
  }

  // If no last bot message, create one
  if (!lastBotMessage) {
    lastBotMessage = addBotMessage();
    currentBotMessageContentElement = lastBotMessage.querySelector(".text-content");
    return currentBotMessageContentElement;
  }

  // Find the text content element in the last bot message
  let textElement = lastBotMessage.querySelector(".text-content");
  
  // If no text element found, or it's part of a tool UI, create a new one
  if (!textElement || textElement.closest('.tool-invocation-item')) {
    // Create a new text element
    const newTextElement = document.createElement("div");
    newTextElement.className = "text-content text-sm text-white";
    
    // Find the content div to append to
    const contentDiv = lastBotMessage.querySelector(".rounded-lg.p-3.flex-grow");
    if (contentDiv) {
      contentDiv.appendChild(newTextElement);
    } else {
      // Fallback if content div not found
      lastBotMessage.appendChild(newTextElement);
    }
    textElement = newTextElement;
  }
  
  currentBotMessageContentElement = textElement;
  return currentBotMessageContentElement;
}

// Handles tool invocation message processing without displaying in the UI
function addToolInvocationMessage(toolInvocations, botMessageDiv) {
  if (!botMessageDiv) {
    console.error("Bot message div not provided for tool invocation");
    botMessageDiv = addBotMessage(); // Fallback, though it should be passed
  }

  // Hide typing indicator
  const typingIndicator = botMessageDiv.querySelector(".typing-indicator");
  if (typingIndicator) {
    typingIndicator.style.display = 'none';
  }

  // Find the content div and text content element
  const contentDiv = botMessageDiv.querySelector(".rounded-lg.p-3.flex-grow");
  let textContentElement = botMessageDiv.querySelector(".text-content");
  
  if (!textContentElement) {
    // If .text-content doesn't exist, create it
    textContentElement = document.createElement('div');
    textContentElement.className = 'text-content text-sm text-white';
    if (contentDiv) {
      contentDiv.appendChild(textContentElement);
    } else {
      botMessageDiv.appendChild(textContentElement);
    }
  }

  // Store tool invocations in memory without displaying them
  toolInvocations.forEach((toolInvo) => {
    const toolCallId = toolInvo.id || `tool-call-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    // Just store a reference to the tool call without creating UI elements
    currentToolCallElements[toolCallId] = {
      name: toolInvo.name,
      args: toolInvo.args
    };
  });

  // Set the current bot message content element for future text responses
  currentBotMessageContentElement = textContentElement;
}

// Processes tool results without displaying them in the UI
function updateToolResultMessage(toolResult) {
  if (!toolResult || !toolResult.tool_call_id) {
    console.warn('Skipping tool_result due to missing tool_call_id:', toolResult);
    return;
  }
  const toolCallId = toolResult.tool_call_id;
  const toolCallElement = currentToolCallElements[toolCallId];

  if (toolCallElement) {
    // Just update the stored data without modifying the UI
    toolCallElement.result = toolResult.content;
    toolCallElement.completed = true;
    
    // Log for debugging purposes only
    console.debug(`Tool ${toolResult.name || toolCallId} executed successfully`);
  } else {
    console.warn("No matching tool invocation found for result:", toolResult);
    // We don't need to display a fallback message anymore since we're hiding tool results
  }
  
  // We don't force a new message bubble since we're not displaying tool results
}


// Send message to API and handle response via SSE
async function sendMessage(message) {
  // Reset accumulated content for a new message
  window.accumulatedContent = "";
  
  if (welcomeContainer.style.display !== "none") {
    welcomeContainer.style.display = "none";
  }

  addUserMessage(message);

  if (!chatHistory[currentThreadId]) {
    chatHistory[currentThreadId] = { messages: [], lastMessageTime: Date.now() };
  }
  chatHistory[currentThreadId].messages.push({ role: "user", content: message });
  chatHistory[currentThreadId].lastMessageTime = Date.now();
  saveChatHistory();

  currentBotMessageContentElement = null; // Ensure a fresh element is fetched/created by ensureCurrentBotMessageElement
  let accumulatedResponseForHistory = "";
  const typingIndicator = document.getElementById("typing-indicator");
  if (typingIndicator) typingIndicator.remove();

  // Create a bot message bubble and get its text content area
  const botMessageBubble = addBotMessage(); // Always create a fresh bot message bubble
  const initialBotTextElement = botMessageBubble.querySelector('.text-content');
  
  if (initialBotTextElement) {
    // Clean loading indicator - single pulsing dot with no text
    initialBotTextElement.innerHTML = '<div class="loading-indicator"><div class="loading-dot"></div></div>';
    
    // Add this style to the head if it doesn't exist
    if (!document.getElementById('loading-style')) {
      const style = document.createElement('style');
      style.id = 'loading-style';
      style.textContent = `
        .loading-indicator {
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
          padding: 10px 0;
        }
        .loading-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: #3b82f6;
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0.3; }
          50% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.3; }
        }
      `;
      document.head.appendChild(style);
    }
  } else {
    console.error("Could not find .text-content in newly created bot message");
  }
  
  // Set currentBotMessageContentElement to the initial text element
  currentBotMessageContentElement = initialBotTextElement;

  let hasClearedProcessingMessage = false;
  let isEchoedQueryProcessed = false;

  try {
    console.log("Sending chat request to server:", message);
    const response = await fetch("/api/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: message, threadId: currentThreadId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Server error." }));
      const errorText = `Error: ${errorData.message || response.statusText}`;
      if (initialBotTextElement) streamText(initialBotTextElement, errorText, false);
      else {
        const errElem = ensureCurrentBotMessageElement();
        if (errElem) streamText(errElem, errorText, false);
      }
      accumulatedResponseForHistory = errorText;
      chatHistory[currentThreadId].messages.push({ role: "assistant", content: accumulatedResponseForHistory });
      saveChatHistory();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const sseMessage = buffer.substring(0, boundary);
        buffer = buffer.substring(boundary + 2);
        if (sseMessage.startsWith("data: ")) {
          const jsonData = sseMessage.substring(6);
          try {
            const eventData = JSON.parse(jsonData);
            console.log("Parsed event:", eventData.type, eventData.data);

            // Ensure currentBotMessageContentElement is up-to-date, especially after tool calls
            const activeTextElement = ensureCurrentBotMessageElement(); 

            if (eventData.type === "connected") {
              console.log("Connection established with server");
            } else if (eventData.type === "content_chunk") {
              let content = eventData.data;
              console.log("Received content chunk:", content);
              
              // Skip if this is just echoing the user's query
              if (!isEchoedQueryProcessed && content === message) {
                isEchoedQueryProcessed = true;
                console.log("Skipped echoed user query:", content);
                accumulatedResponseForHistory += content; // Echoed query is part of history
                continue; // Skip to next iteration
              }
              
              // Handle actual content
              const isLikelyJson = (str) => {
                  if (typeof str !== 'string') return false;
                  str = str.trim();
                  return (str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'));
              };
              
              // Skip json content (usually internal state)
              if (isLikelyJson(content)) {
                console.log("Skipped rendering likely JSON data:", content);
                accumulatedResponseForHistory += content; 
                continue; // Skip to next iteration
              }
              
              // Handle Stripe payment URLs - preprocess before rendering
              if (content.includes("checkout.stripe.com")) {
                console.log("Processing Stripe payment URL for better display");
                // Extract just the URL from the content
                const urlMatch = content.match(/(https:\/\/checkout\.stripe\.com\/[^\s"'<>]+)/);
                if (urlMatch && urlMatch[1]) {
                  // Just pass the URL through - the markdown processor will handle it
                  // We want to keep this simple to avoid duplication issues
                  content = urlMatch[1];
                }
              }
              
              // Clear thinking indicator on first actual content & stream
              if (!hasClearedProcessingMessage) {
                console.log("Clearing temporary loading dot and streaming first content_chunk");
                // Main typing indicator should persist, only remove the temporary loading dot from text area
                const loadingDotIndicator = activeTextElement.querySelector(".loading-indicator");
                if (loadingDotIndicator) {
                  loadingDotIndicator.remove();
                }
                hasClearedProcessingMessage = true;
                streamText(activeTextElement, content, false); // Stream first chunk
              } else {
                streamText(activeTextElement, content, true); // Stream subsequent chunks
              }
              accumulatedResponseForHistory += content;
            } else if (eventData.type === "tool_invocation") {
              // Handle tool invocation silently without displaying in UI
              if (!hasClearedProcessingMessage && initialBotTextElement) {
                hasClearedProcessingMessage = true;
              }
              
              // If botMessageBubble is somehow null (shouldn't happen now), create a new one
              if (!botMessageBubble) {
                console.warn("botMessageBubble was null, creating a new one");
                botMessageBubble = addBotMessage();
              }
              
              // Process tool invocation without displaying in UI
              addToolInvocationMessage(eventData.data, botMessageBubble);
              console.debug("Tool invocation processed silently:", eventData.data.map(t => t.name).join(', '));
            } else if (eventData.type === "tool_result") {
              // Process tool result without displaying in UI
              updateToolResultMessage(eventData.data);
              // We don't add tool results to the accumulated response anymore 
            } else if (eventData.type === "error") {
              if (activeTextElement) streamText(activeTextElement, `Error: ${eventData.data}`, true);
              accumulatedResponseForHistory += `\nError: ${eventData.data}\n`;
            }
          } catch (e) {
            console.error("Error parsing SSE JSON:", e, "Raw:", jsonData);
          }
        }
      }
    }

    if (currentBotMessageContentElement && currentBotMessageContentElement.innerHTML.trim() !== "") {
      applyHighlightingInElement(currentBotMessageContentElement);
    }
    
    const trimmedHistoryResponse = accumulatedResponseForHistory.trim();
    if (trimmedHistoryResponse.length > 0) {
      console.log("Saving response to history:", trimmedHistoryResponse);
      const lastHistory = chatHistory[currentThreadId].messages;
      if (lastHistory.length > 0 && lastHistory[lastHistory.length - 1].role === 'user') {
        lastHistory.push({ role: "assistant", content: trimmedHistoryResponse });
      } else if (lastHistory.length > 0 && lastHistory[lastHistory.length - 1].role === 'assistant') {
        // Append to existing assistant message or create new if significantly different
        // For now, let's just update if it's the same logical turn, or add if new turn after tool results
        lastHistory[lastHistory.length - 1].content = trimmedHistoryResponse; // Simplistic update for now
      } else {
        lastHistory.push({ role: "assistant", content: trimmedHistoryResponse });
      }
      chatHistory[currentThreadId].lastMessageTime = Date.now();
      saveChatHistory();
    }

  } catch (error) {
    console.error("Error in sendMessage (outer catch):", error);
    const errorText = "Error: Connection issue or unexpected error. Please try again.";
    const errElem = ensureCurrentBotMessageElement();
    if(errElem) streamText(errElem, errorText, false);
    chatHistory[currentThreadId].messages.push({ role: "assistant", content: errorText });
    saveChatHistory();
  } finally {
    // Remove the persistent typing indicator for the current bot message
    if (currentBotMessageContentElement && currentBotMessageContentElement.parentElement) {
      const finalBotMessageSpinner = currentBotMessageContentElement.parentElement.querySelector('.typing-indicator');
      if (finalBotMessageSpinner) {
        finalBotMessageSpinner.remove();
      }
    }
    messageInput.disabled = false;
    messageInput.focus();
    chatContainer.scrollTop = chatContainer.scrollHeight;
    console.log("Chat interaction complete");
  }
}

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
  
  // Add form submission handler
  chatForm.addEventListener("submit", function(event) {
    // Prevent the default form submission which would reload the page
    event.preventDefault();
    
    const message = messageInput.value.trim();
    if (message) {
      sendMessage(message);
      messageInput.value = "";
    }
  });
  
  // Apply event listeners to any existing copy buttons in the DOM
  document.querySelectorAll('.copy-button').forEach(button => {
    button.removeAttribute('onclick'); // Remove any existing onclick attributes for safety
  });
});

