/** @format */
import { About, Rules } from "./prompt.js";
import config from "./config.js";

// Select DOM elements
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const chat = document.getElementById("chat");
const sendButton = document.getElementById("send-button");

messageInput.addEventListener("input", function (event) {
  var message = event.target.value.trim();
  sendButton.classList.toggle("hidden", message === "");
});

// ---------------words Length Select------------
const wordLength = document.getElementById("wordLength");
var wordLengthSelected = wordLength.value;
wordLength.addEventListener("change", (event) => {
  wordLengthSelected = event.target.value;
});

// ---------------words mode Select------------
const wordMode = document.getElementById("wordMode");
var wordModeSelected = wordMode.value;
wordMode.addEventListener("change", (event) => {
  wordModeSelected = event.target.value;
});

// ---------------------------------Start-----------------------------------------------------
let history = [];

var temperatureInput = document.getElementById("temperature-input");

// Replace with your new Google Gemini API key
const generatedString = "AIzaSyDGZYGwaaU82fOkMFyH641K9cHfrjH_y_U";

const createMessageElement = (content, classes = [], isUser = false) => {
  const messageElement = document.createElement("div");
  messageElement.classList.add("p-2", "my-2", "rounded-md", ...classes);
  messageElement.textContent = content;
  return messageElement;
};

// Function to limit the number of words in a string
const limitWords = (text, maxWords) => {
  const words = text.split(" ");
  if (words.length > maxWords) {
    let truncatedText = words.slice(0, maxWords).join(" ");
    // Ensure the truncated text ends with a complete sentence
    const lastPeriodIndex = truncatedText.lastIndexOf(".");
    if (lastPeriodIndex !== -1) {
      truncatedText = truncatedText.substring(0, lastPeriodIndex + 1);
    } else {
      truncatedText += "...";
    }
    return truncatedText;
  }
  return text;
};

// Function to clean up the response text
const cleanResponse = (text) => {
  return text.replace(/^##\s.*?:\s*/, ''); // Remove "## ..:" pattern
};

const submitForm = async (event) => {
  event.preventDefault();

  const maxRetries = 5;
  let retryCount = 0;
  let success = false;

  const message = messageInput.value;
  if (message.trim() === "") {
    alert("Please Enter a message.");
    return;
  }

  const userMessageElement = createMessageElement(message, ["bg-gray-100", "ml-auto", "max-w-xs"], true);
  chat.appendChild(userMessageElement);

  history.push({
    role: "user",
    content: message,
  });

  messageInput.value = "";

  const loadingText = createMessageElement("Loading...", ["bg-gray-300", "text-gray-700", "mr-auto", "max-w-xs"]);
  chat.appendChild(loadingText);

  while (retryCount < maxRetries && !success) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${generatedString}`,
        {
          contents: [
            {
              parts: [
                {
                  text: `${About}\n\n${Rules}\n\nUser: ${message}`
                }
              ]
            }
          ]
        },
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      chat.removeChild(loadingText);

      // Apply word limit and clean up the bot's response
      let botResponse = response.data.candidates[0].content.parts[0].text;
      botResponse = cleanResponse(botResponse);
      const maxWords = parseInt(wordLengthSelected.split(" ")[0]); // Get the lower limit of the selected range
      const limitedResponse = limitWords(botResponse, maxWords); // Limit to selected word length

      const botMessageElement = createMessageElement(limitedResponse, ["bg-gray-500", "text-white", "mr-auto", "max-w-xs"]);
      chat.appendChild(botMessageElement);
      navigator.clipboard.writeText(limitedResponse);
      success = true;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        retryCount++;
        const retryAfter = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`Retrying in ${retryAfter / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, retryAfter));
      } else {
        console.log(`An error occurred during the HTTP request: ${error}`);
        chat.removeChild(loadingText);
        chatForm.innerText =
          "Please contact prathm for assistance with obtaining a new API, as the current API has expired.";
        window.location.reload();
        break;
      }
    }
  }

  if (!success) {
    alert("Too many requests. Please try again later.");
    window.location.reload();
  }
};

chatForm.addEventListener("submit", submitForm);

// -----paste button-----
const paste = document.getElementById("paste");
paste.addEventListener("click", async function () {
  try {
    const clipboardText = await navigator.clipboard.readText();
    messageInput.value = clipboardText;

    submitForm(new Event("submit")); // call submitForm with a fake submit event
  } catch (error) {
    console.error("Failed to read clipboard text: ", error);
  }
});

// -----------warnings----------------
const warning = document.getElementById("warning");

const handleEvent = (event) => {
  if (event.target.id === "Disclaimer") {
    if (warning.style.display === "none" || warning.style.display === "") {
      warning.style.display = "block";
      warning.classList.remove("text-green-500");
      warning.classList.add("text-red-500");
      warning.innerText =
        "Disclaimer: For any important or critical yoga inquiries, it is advisable to seek advice from a certified yoga specialist or consult a doctor prior to offering recommendations to clients.";
    } else {
      warning.style.display = "none";
      warning.innerText = "";
    }
  } else if (event.target.id === "autoCopy") {
    if (warning.style.display === "none" || warning.style.display === "") {
      warning.style.display = "block";
      warning.classList.remove("text-red-500");
      warning.classList.add("text-green-500");
      warning.innerText =
        "You don't have to copy the bot message manually. It will be automatically copied to your clipboard.";
    } else {
      warning.style.display = "none";
      warning.innerText = "";
    }
  }
};

document.addEventListener("click", handleEvent);

// -----------reset Memory------------
// Reset memory button event listener
const resetMemoryButton = document.getElementById("reset-memory");
const reset = document.getElementById("reset");

const resetMemory = () => {
  history = []; // Clear the history array
  while (chat.firstChild) {
    chat.removeChild(chat.firstChild);
  }

  reset.innerText =
    "Bot Memory has been cleared. Now you can start a new conversation.";
  setTimeout(() => {
    reset.innerText = "";
  }, 3500);
};

resetMemoryButton.addEventListener("click", resetMemory);
