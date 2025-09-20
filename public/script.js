const socket = io("http://127.0.0.1:5000");

const username = prompt("Enter your name") || "User";
const room = "general"; // Fixed room for now

// ✅ Join chat room
socket.emit("joinChat", { room, username });

/* ---------------- CHAT ------------------ */
// Send chat message
document.getElementById("sendBtn").addEventListener("click", () => {
  const text = document.getElementById("message").value.trim();
  if (!text) return;

  socket.emit("sendMessage", { room, sender: username, text });
  addMessage(`You: ${text}`, "self");
  document.getElementById("message").value = "";
});

// Receive chat message
socket.on("receiveMessage", ({ sender, text }) => {
  if (sender !== username) addMessage(`${sender}: ${text}`, "other");
});

// Add chat message to UI
function addMessage(msg, type) {
  const li = document.createElement("li");
  li.textContent = msg;
  li.classList.add(type);
  document.getElementById("messages").appendChild(li);
  li.scrollIntoView({ behavior: "smooth" });
}

/* ---------------- VIDEO CALL ------------------ */
let localStream;
let peerConnection;

// ✅ STUN/TURN servers
const servers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "efgh",
      credential: "abcd1234"
    }
  ]
};

// ✅ Start video call (request camera + mic)
document.getElementById("callBtn").addEventListener("click", async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  document.getElementById("localVideo").srcObject = localStream;

  peerConnection = new RTCPeerConnection(servers);

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = event => {
    document.getElementById("remoteVideo").srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("iceCandidate", { to: remoteUserId, candidate: event.candidate });
    }
  };

  // Get other users in room
  socket.on("usersInRoom", async (users) => {
    if (users.length > 0) {
      remoteUserId = users[0]; // Call the first user
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit("callUser", {
        to: remoteUserId,
        signalData: offer,
        from: socket.id,
        name: username
      });
    }
  });
});

// ✅ Handle incoming call
let remoteUserId;

socket.on("incomingCall", async ({ signal, from, name }) => {
  remoteUserId = from;
  console.log("Incoming call from", name);

  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  document.getElementById("localVideo").srcObject = localStream;

  peerConnection = new RTCPeerConnection(servers);

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = event => {
    document.getElementById("remoteVideo").srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("iceCandidate", { to: remoteUserId, candidate: event.candidate });
    }
  };

  await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answerCall", { to: from, signal: answer });
});

// ✅ Call accepted
socket.on("callAccepted", async (signal) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
});

// ✅ ICE Candidates
socket.on("iceCandidate", ({ candidate }) => {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});
