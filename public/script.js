const socket = io("http://127.0.0.1:5000");

const username = prompt("Enter your name") || "User";
const chatId = "general"; // Same for both users

socket.emit("joinChat", chatId);

// Chat send
document.getElementById("sendBtn").addEventListener("click", () => {
  const text = document.getElementById("message").value.trim();
  if (!text) return;

  socket.emit("sendMessage", { chatId, sender: username, text });
  addMessage(`You: ${text}`, "self");
  document.getElementById("message").value = "";
});

// Chat receive
socket.on("receiveMessage", ({ sender, text }) => {
  // Temporary: remove sender check for testing
  if (sender !== username) addMessage(`${sender}: ${text}`, "other");
  else addMessage(`You: ${text}`, "self");
});

// Add message to UI
function addMessage(msg, type) {
  const li = document.createElement("li");
  li.textContent = msg;
  li.classList.add(type);
  document.getElementById("messages").appendChild(li);
  li.scrollIntoView({ behavior: "smooth" });
}
