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
  socket.on("joinChat", room => {
    socket.join(room);
    console.log(`${socket.id} joined room: ${room}`);
  });

  // Chat message
  socket.on("sendMessage", ({ chatId, sender, text }) => {
    // Emit to all users in room INCLUDING sender
    io.in(chatId).emit("receiveMessage", { sender, text });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => console.log("Server running on port 5000"));
