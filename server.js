// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Serve frontend
app.use(express.static("public"));

// Users in rooms
const rooms = {}; // room -> Set of socket ids

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Join chat room
  socket.on("joinChat", ({ room, username }) => {
    if (!rooms[room]) rooms[room] = new Set();
    rooms[room].add(socket.id);
    socket.join(room);
    socket.data.username = username;

    // Send other users in room to this user
    const otherUsers = Array.from(rooms[room]).filter(id => id !== socket.id);
    socket.emit("usersInRoom", otherUsers);
  });

  // Call a specific user
  socket.on("callUser", ({ to, signalData, from, name }) => {
    if (to) io.to(to).emit("incomingCall", { signal: signalData, from, name });
  });

  // Answer a call
  socket.on("answerCall", ({ to, signal }) => {
    if (to) io.to(to).emit("callAccepted", signal);
  });

  // ICE candidates
  socket.on("iceCandidate", ({ to, candidate }) => {
    if (to) io.to(to).emit("iceCandidate", { candidate });
  });

  // Chat message
  socket.on("sendMessage", ({ chatId, sender, text }) => {
    io.to(chatId).emit("receiveMessage", { sender, text });
  });

  // Disconnect
  socket.on("disconnect", () => {
    for (const room in rooms) {
      rooms[room].delete(socket.id);
      if (rooms[room].size === 0) delete rooms[room];
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
