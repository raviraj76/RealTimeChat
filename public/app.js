// public/app.js
const socket = io(); // connect to same origin (works on Render)

// ---------------- USER ----------------
const TEST_MODE = true; // keep true for testing; set false for prod/login flow

let username;
if (TEST_MODE) {
  username = "User" + Math.floor(Math.random() * 1000);
} else {
  username = localStorage.getItem("username") || prompt("Enter your name:");
}
localStorage.setItem("username", username);
document.getElementById("user-name").textContent = username;

const chatId = "general";
socket.emit("joinChat", { room: chatId, username });

// debug connect
socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});
socket.on("connect_error", (err) => {
  console.error("Socket connect_error:", err);
});
socket.on("disconnect", (reason) => {
  console.warn("Socket disconnected:", reason);
});

// ---------------- CHAT ----------------
const chatBox = document.getElementById("messages");
const msgInput = document.getElementById("message");

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;
  console.log("Sending message:", text);
  socket.emit("sendMessage", { chatId, sender: username, text });
  addMessage(text, "right");
  msgInput.value = "";
}

socket.on("receiveMessage", ({ sender, text }) => {
  console.log("receiveMessage event:", sender, text);
  if (sender === username) return;
  addMessage(text, "left", sender);
});

function addMessage(text, side, sender = "") {
  const div = document.createElement("div");
  div.classList.add("chat-bubble", side);
  div.innerHTML = side === "left" ? `<strong>${sanitize(sender)}</strong><br>${sanitize(text)}` : sanitize(text);
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function sanitize(str) {
  return String(str).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

msgInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });

// ---------------- DP ----------------
const profileImg = document.getElementById("profile-img");
profileImg.src = localStorage.getItem("dp") || "assets/default-image.png";

document.getElementById("dpInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  profileImg.src = url;
  localStorage.setItem("dp", url);
});

// ---------------- CALLING (WebRTC) ----------------
let peerConnection = null;
let localStream = null;
let currentCallPeerId = null; // socket id of peer we are in call with

const callBtn = document.getElementById("call-btn");
const videoBtn = document.getElementById("video-btn");
const endCallBtn = document.getElementById("end-call");

const videoContainer = document.getElementById("video-container");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

callBtn?.addEventListener("click", () => startCall(true, false));
videoBtn?.addEventListener("click", () => startCall(true, true));
endCallBtn?.addEventListener("click", endCall);

// ----------------- WebRTC with TURN -----------------
function createPeerConnection(peerId) {
  const configuration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }, // Google STUN
      // Free TURN server
      {
        urls: "turn:relay1.expressturn.com:3478",
        username: "efkM2P3Wc6P2rZcYcG",
        credential: "Y0qFb2Czv1gYABwA"
      }
    ]
  };

  peerConnection = new RTCPeerConnection(configuration);

  peerConnection.ontrack = (e) => {
    console.log("Remote track received");
    remoteVideo.srcObject = e.streams[0];
  };

  peerConnection.onicecandidate = (e) => {
    if (e.candidate && peerId) {
      socket.emit("iceCandidate", { to: peerId, candidate: e.candidate });
      console.log("Sent ICE candidate to", peerId);
    }
  };
}

// Start call: get media, create offer
async function startCall(useAudio = true, useVideo = false) {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: useAudio, video: useVideo });
  } catch (err) {
    console.error("getUserMedia error:", err);
    alert("Could not access camera/mic: " + err.message);
    return;
  }

  localVideo.srcObject = localStream;
  videoContainer.style.display = "flex";

  createPeerConnection(null);
  localStream.getTracks().forEach((t) => peerConnection.addTrack(t, localStream));

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("callUser", { room: chatId, signalData: offer, from: socket.id, name: username });
  console.log("Broadcasted offer to room", chatId);
}

// Incoming call -> answer
socket.on("incomingCall", async ({ signal, from, name }) => {
  console.log("Incoming call from:", from, name);
  currentCallPeerId = from;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  } catch (err) {
    console.error("getUserMedia (answer) error:", err);
    return;
  }

  localVideo.srcObject = localStream;
  videoContainer.style.display = "flex";

  createPeerConnection(from);
  localStream.getTracks().forEach((t) => peerConnection.addTrack(t, localStream));

  await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answerCall", { to: from, signal: answer });
  console.log("Sent answer to", from);
});

// Caller receives answer
socket.on("callAccepted", async (signal) => {
  console.log("Call accepted, setting remote description");
  await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
});

// ICE candidates from server
socket.on("iceCandidate", ({ candidate }) => {
  if (!candidate) return;
  console.log("Received ICE candidate");
  if (peerConnection) peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(e));
});

// End call
function endCall() {
  if (localStream) localStream.getTracks().forEach(t => t.stop());
  if (peerConnection) { peerConnection.close(); peerConnection = null; }
  currentCallPeerId = null;
  videoContainer.style.display = "none";
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
}
