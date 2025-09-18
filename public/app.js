const socket = io("http://127.0.0.1:5000");

// ---------------- USER ----------------
let username = "User" + Math.floor(Math.random() * 1000);
document.getElementById("user-name").textContent = username;
localStorage.setItem("username", username);

const chatId = "general";
socket.emit("joinChat", { room: chatId, username });

// ---------------- CHAT ----------------
const chatBox = document.getElementById("messages");
const msgInput = document.getElementById("message");

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;

  socket.emit("sendMessage", { chatId, sender: username, text });
  addMessage(text, "right"); // right side for self
  msgInput.value = "";
}

socket.on("receiveMessage", ({ sender, text }) => {
  if (sender === username) return; // ignore self
  addMessage(text, "left", sender); // left side for other user
});

function addMessage(text, side, sender = "") {
  const div = document.createElement("div");
  div.classList.add("chat-bubble", side);
  div.innerHTML = side === "left" ? `<strong>${sender}</strong><br>${text}` : text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

msgInput.addEventListener("keypress", e => { if(e.key === "Enter") sendMessage(); });

// ---------------- DP ----------------
const profileImg = document.getElementById("profile-img");
profileImg.src = localStorage.getItem("dp") || "assets/default-image.png";

document.getElementById("dpInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  profileImg.src = url;
  localStorage.setItem("dp", url);
});

// ---------------- CALLING ----------------
let peerConnection;
let localStream;

const callBtn = document.getElementById("call-btn");
const videoBtn = document.getElementById("video-btn");
const endCallBtn = document.getElementById("end-call");

const videoContainer = document.getElementById("video-container");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

callBtn.addEventListener("click", startAudioCall);
videoBtn.addEventListener("click", startVideoCall);
endCallBtn.addEventListener("click", endCall);

function createPeerConnection(peerId) {
  peerConnection = new RTCPeerConnection();

  peerConnection.ontrack = e => { remoteVideo.srcObject = e.streams[0]; }

  peerConnection.onicecandidate = e => {
    if (e.candidate) socket.emit("iceCandidate", { to: peerId, candidate: e.candidate });
  };
}

async function startAudioCall() {
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  startCall(localStream);
}

async function startVideoCall() {
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  startCall(localStream);
}

function startCall(stream) {
  videoContainer.style.display = "block";
  localVideo.srcObject = stream;

  createPeerConnection(chatId);
  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

  peerConnection.createOffer().then(offer => {
    peerConnection.setLocalDescription(offer);
    socket.emit("callUser", { userToCall: chatId, signalData: offer, from: socket.id, name: username });
  });
}

socket.on("incomingCall", async ({ signal, from, name }) => {
  videoContainer.style.display = "block";
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  localVideo.srcObject = localStream;

  createPeerConnection(from);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.setRemoteDescription(new RTCSessionDescription(signal));

  peerConnection.createAnswer().then(answer => {
    peerConnection.setLocalDescription(answer);
    socket.emit("answerCall", { to: from, signal: answer });
  });
});

socket.on("callAccepted", signal => {
  peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
});

socket.on("iceCandidate", ({ candidate }) => {
  if (peerConnection) peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

function endCall() {
  if (localStream) localStream.getTracks().forEach(t => t.stop());
  if (peerConnection) { peerConnection.close(); peerConnection = null; }
  videoContainer.style.display = "none";
  remoteVideo.srcObject = null;
  localVideo.srcObject = null;
}
