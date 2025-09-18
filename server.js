const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET","POST"] },
});

app.use(express.static("public"));

io.on("connection", socket => {
  console.log("User connected:", socket.id);

  // Join room
  socket.on("joinChat", ({ room, username }) => {
    socket.join(room);
    socket.data.username = username; // save username in socket
    console.log(`${username} joined room: ${room}`);
  });

  // Chat message
  socket.on("sendMessage", ({ chatId, sender, text }) => {
    io.to(chatId).emit("receiveMessage", { sender, text });
  });

  // Call signaling
  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    socket.to(userToCall).emit("incomingCall", { signal: signalData, from, name });
  });

  socket.on("answerCall", ({ to, signal }) => {
    socket.to(to).emit("callAccepted", signal);
  });

  socket.on("iceCandidate", ({ to, candidate }) => {
    socket.to(to).emit("iceCandidate", { candidate });
  });

  socket.on("disconnect", () => { console.log("User disconnected:", socket.id); });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
