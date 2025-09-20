// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Serve frontend (put your HTML, script.js inside "public" folder)
app.use(express.static("public"));

const rooms = {}; // { roomId: Set(socketIds) }

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // ✅ Join chat room
  socket.on("joinChat", ({ room, username }) => {
    if (!rooms[room]) rooms[room] = new Set();
    rooms[room].add(socket.id);

    socket.join(room);
    socket.data.username = username;

    console.log(`${username} joined room: ${room}`);

    // Send other users in room (for video call)
    const otherUsers = Array.from(rooms[room]).filter(id => id !== socket.id);
    socket.emit("usersInRoom", otherUsers);
  });

  // ✅ Video call: callUser
  socket.on("callUser", ({ to, signalData, from, name }) => {
    io.to(to).emit("incomingCall", { signal: signalData, from, name });
  });

  // ✅ Video call: answerCall
  socket.on("answerCall", ({ to, signal }) => {
    io.to(to).emit("callAccepted", signal);
  });

  // ✅ WebRTC ICE Candidates
  socket.on("iceCandidate", ({ to, candidate }) => {
    io.to(to).emit("iceCandidate", { candidate });
  });

  // ✅ Chat messaging
  socket.on("sendMessage", ({ room, sender, text }) => {
    io.to(room).emit("receiveMessage", { sender, text });
  });

  // ✅ Disconnect handling
  socket.on("disconnect", () => {
    for (const room in rooms) {
      rooms[room].delete(socket.id);
      if (rooms[room].size === 0) delete rooms[room];
    }
    console.log("Socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
