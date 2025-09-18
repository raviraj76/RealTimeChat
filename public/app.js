// public/app.js
const socket = io(); // connect to same origin

// ---------------- USER ----------------
const TEST_MODE = true;
let username = TEST_MODE ? "User" + Math.floor(Math.random() * 1000) : localStorage.getItem("username") || prompt("Enter your name:");
localStorage.setItem("username", username);
document.getElementById("user-name").textContent = username;

const chatId = "general";
socket.emit("joinChat", { room: chatId, username });

// Track users in room
let usersInRoom = [];
socket.on("usersInRoom", (users) => {
  usersInRoom = users;
  console.log("Users in room:", usersInRoom);
});

// ---------------- CHAT ----------------
const chatBox = document.getElementById("messages");
const msgInput = document.getElementById("message");

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;
  socket.emit("sendMessage", { chatId, sender: username, text });
  addMessage(text, "right");
  msgInput.value = "";
}

socket.on("receiveMessage", ({ sender, text }) => {
  if (sender === username) return;
  addMessage(text, "left", sender);
});

function addMessage(text, side, sender = "") {
  const div = document.createElement("div");
  div.classList.add("chat-bubble", side);
  div.innerHTML = side === "left" ? `<strong>${sender}</strong><br>${text}` : text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

msgInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });

// ---------------- CALLING ----------------
let peerConnection = null;
let localStream = null;
let currentCallPeerId = null;

const callBtn = document.getElementById("call-btn");
const videoBtn = document.getElementById("video-btn");
const endCallBtn = document.getElementById("end-call");

const videoContainer = document.getElementById("video-container");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

// Create peer connection with STUN+TURN
function createPeerConnection(peerId) {
  const configuration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "turn:relay1.expressturn.com:3478", username: "efkM2P3Wc6P2rZcYcG", credential: "Y0qFb2Czv1gYABwA" }
    ]
  };

  peerConnection = new RTCPeerConnection(configuration);

  peerConnection.ontrack = (e) => remoteVideo.srcObject = e.streams[0];
  peerConnection.onicecandidate = (e) => {
    if (e.candidate && peerId) socket.emit("iceCandidate", { to: peerId, candidate: e.candidate });
  };
}

// Start call
async function startCall(useAudio = true, useVideo = false) {
  if (usersInRoom.length === 0) { alert("No user to call"); return; }
  const peerId = usersInRoom[0]; 
  currentCallPeerId = peerId;

  try { localStream = await navigator.mediaDevices.getUserMedia({ audio: useAudio, video: useVideo }); }
  catch (err) { alert("Cannot access camera/mic"); return; }

  localVideo.srcObject = localStream;
  videoContainer.style.display = "flex";

  createPeerConnection(peerId);
  localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("callUser", { to: peerId, signalData: offer, from: socket.id, name: username });
}

// Incoming call
socket.on("incomingCall", async ({ signal, from, name }) => {
  currentCallPeerId = from;
  try { localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true }); }
  catch (err) { return; }

  localVideo.srcObject = localStream;
  videoContainer.style.display = "flex";

  createPeerConnection(from);
  localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));

  await peerConnection.setRemoteDescription(signal);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answerCall", { to: from, signal: answer });
});

// Caller receives answer
socket.on("callAccepted", async (signal) => {
  await peerConnection.setRemoteDescription(signal);
});

// ICE candidates
socket.on("iceCandidate", ({ candidate }) => {
  if (peerConnection) peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
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

callBtn?.addEventListener("click", () => startCall(true, false));
videoBtn?.addEventListener("click", () => startCall(true, true));
endCallBtn?.addEventListener("click", endCall);
