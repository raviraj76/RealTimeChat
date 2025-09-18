// server.js (replace your current file with this)
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// serve frontend from public/
app.use(express.static("public"));

// allow all origins for quick deploy; tighten later in production
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // join a room
  socket.on("joinChat", ({ room, username }) => {
    if (!room) room = "general";
    socket.join(room);
    socket.data.username = username || "Unknown";
    console.log(`${socket.data.username} (${socket.id}) joined room: ${room}`);
  });

  // chat message -> broadcast to everyone in room (including sender)
  socket.on("sendMessage", ({ chatId, sender, text }) => {
    if (!chatId) chatId = "general";
    console.log(`Message from ${sender} in ${chatId}: ${text}`);
    // Emit to everyone in room
    io.to(chatId).emit("receiveMessage", { sender, text });
  });

  // Caller sends offer to the room -> server forwards to all other sockets in the room
  socket.on("callUser", ({ room, signalData, from, name }) => {
    if (!room) room = "general";
    // broadcast to everyone else in the room
    socket.to(room).emit("incomingCall", { signal: signalData, from, name });
  });

  // A callee answers to a specific socket id
  socket.on("answerCall", ({ to, signal }) => {
    if (!to) return;
    io.to(to).emit("callAccepted", signal);
  });

  // ICE candidate forwarding (to specific socket)
  socket.on("iceCandidate", ({ to, candidate }) => {
    if (!to || !candidate) return;
    io.to(to).emit("iceCandidate", { candidate });
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
