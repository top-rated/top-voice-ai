document.addEventListener("DOMContentLoaded", function () {
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
            ? "bg-white/10 text-blue-300"
            : "text-white hover:bg-white/5 hover:text-blue-300"
        } transition-colors`;
        historyItem.innerHTML = `
          <span class="icon-comment w-4 h-4 mr-2 flex-shrink-0 text-white flex items-center justify-center"></span>
          <span class="truncate w-full">${escapeHtml(title)}</span>
        `;

        historyItem.addEventListener("click", () => {
          loadChat(threadId);
        });

        // Create delete button
        const deleteButton = document.createElement("button");
        deleteButton.className =
          "p-1 ml-1 flex-shrink-0 text-white hover:text-red-500 transition-colors";
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
          miniHistoryItem.className = `mini-button text-white ${
            threadId === currentThreadId ? "bg-[#303030]" : "hover:bg-[#303030]"
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
                <span class="icon-user text-white text-sm flex items-center justify-center w-full h-full"></span>
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
        <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
          <span class="icon-user text-white text-sm flex items-center justify-center w-full h-full"></span>
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
    const messageContainer = document.createElement("div");
    messageContainer.className = "flex items-start w-full max-w-2xl mb-4 animate-slide-up mx-auto";

    // Create avatar container similar to user message
    const avatarDiv = document.createElement("div");
    avatarDiv.className = "flex-shrink-0 mr-3 mt-1";
    avatarDiv.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
        <img src="/top-voices.png" alt="AI" class="w-6 h-6 object-cover rounded-full" />
      </div>
    `;
    
    // Create message content container
    const contentDiv = document.createElement("div");
    contentDiv.className = "bg-[#303030] rounded-lg p-3 flex-grow markdown";
    
    // Create text content area for actual message content
    const textContent = document.createElement("div");
    textContent.className = "text-content text-sm text-white";
    contentDiv.appendChild(textContent);
  
    // Create typing indicator (will be hidden when content is displayed)
    const typingIndicator = document.createElement("div");
    typingIndicator.className = "typing-indicator";
    typingIndicator.innerHTML = `<span>_Processing your request..._</span>`;
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

  // Render the response text with markdown formatting, with append option
  async function streamText(element, text, append = false) {
    // Clear previous content except for typing indicator if it exists and not appending
    const typingIndicator = element.querySelector(".typing-indicator");
    if (!append && !typingIndicator) {
      element.innerHTML = "";
    }

    // Process Markdown for the new chunk of text
    const processedText = processMarkdown(text);

    // Append the new text. DOMPurify is not used here as processMarkdown should handle sanitization.
    // If direct HTML injection is a concern from markdown, consider adding DOMPurify here.
    element.innerHTML += processedText;

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

    // Show error message on button
    button.textContent = "Copy failed";
    setTimeout(() => {
      button.textContent = "Copy";
    }, 2000);
  }
};

// Render the response text with markdown formatting, with append option
async function streamText(element, text, append = false) {
  // Hide the typing indicator in the parent container when content is being displayed
  const parentContainer = element.closest('.rounded-lg');
  if (parentContainer) {
    const typingIndicator = parentContainer.querySelector('.typing-indicator');
    if (typingIndicator) {
      typingIndicator.style.display = 'none';
    }
  }

  // Process Markdown for the new chunk of text
  const processedText = processMarkdown(text);

  // If not appending, clear the element first
  if (!append) {
    element.innerHTML = "";
  }

  // Append the processed text directly
  element.innerHTML += processedText;

  // Apply highlighting to any new code blocks within the element
  applyHighlightingInElement(element);

  // Scroll to bottom of the chat container to ensure new content is visible
  const chatContainer = document.getElementById("chat-container");
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

// Store current bot message element for streaming text
let currentBotMessageContentElement = null;

// Store tool call elements for reference when updating with results
let currentToolCallElements = {};

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
    streamText(initialBotTextElement, "_Processing your request..._", false);
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
              const content = eventData.data;
              if (!isEchoedQueryProcessed && content === message) {
                isEchoedQueryProcessed = true;
                console.log("Skipped echoed user query:", content);
                accumulatedResponseForHistory += content; // Echoed query is part of history
              } else {
                const isLikelyJson = (str) => {
                    if (typeof str !== 'string') return false;
                    str = str.trim();
                    return (str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'));
                };
                if (isLikelyJson(content)) {
                  console.log("Skipped rendering likely JSON data:", content);
                  accumulatedResponseForHistory += content; 
                } else {
                  // Always clear the processing message when we get actual content
                  if (!hasClearedProcessingMessage) {
                    // Find and hide all typing indicators
                    const typingIndicators = document.querySelectorAll(".typing-indicator");
                    typingIndicators.forEach(indicator => {
                      indicator.style.display = 'none';
                    });
                    
                    if (initialBotTextElement) {
                      // Clear the initial bot message element
                      initialBotTextElement.innerHTML = "";
                    }
                    hasClearedProcessingMessage = true;
                  }
                  
                  // Store the accumulated content for this response
                  if (!window.accumulatedContent) {
                    window.accumulatedContent = "";
                  }
                  
                  // Add the new chunk to our accumulated content
                  window.accumulatedContent += content;
                  
                  // Render the full accumulated content
                  if (activeTextElement) {
                    // Always use append=false to render the full accumulated content
                    streamText(activeTextElement, window.accumulatedContent, false);
                  }
                  
                  accumulatedResponseForHistory += content;
                }
              }
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

