// Express server
const path = require('path');
const http = require('http');       //http
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const {generateMessage, generateLocationMessage} = require('./utils/messages')
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')
const port = process.env.PORT || 3000

const publicDirPath = path.join(__dirname, '../public');

const app = express();
const server = http.createServer(app);      //http
const io = socketio(server);

app.use(express.static(publicDirPath));

io.on('connection', (socket) => {
    console.log('New websocket connection');

    socket.on('join', ({ username, room }, callback) => {
        const {error, user} = addUser({ id: socket.id, username, room })
        if(error) {
           return callback(error)
        }
        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!'));
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`));
        io.to(user.room).emit('roomData', {
            room:user.room,
            users: getUsersInRoom(user.room)
        })

        callback()

        // socket.emit --> emits only to specific connected client, 
        // io.emit --> emits message to all connected clients, 
        // socket.broadcast.emit --> emits to all clients except the client whose message is broadcasted, 
        // io.to.emit --> emits an event to everybody in a room, 
        // socket.broadcast.to.emit --> emits to all clients of the chat room except that 1 client 
    })

    socket.on('sendMessage', (inputMessage, callback) => {
        const filter = new Filter()

        if(filter.isProfane(inputMessage)) {
            return callback('Profanity is not allowed!')
        }

        const user = getUser(socket.id)
        io.to(user.room).emit('message', generateMessage(user.username, inputMessage))
        callback()
    })

    //disconnect event is in-built
    socket.on('disconnect', () => {     
        const user = removeUser(socket.id)
        if(user){
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    // socket.on('coordinates', (location) => {
    //     io.emit('message', location);
    // })

    socket.on('coordinates', (location, callback) => {
        //io.emit('message', `Location: ${location.latitude}, ${location.longitude}`);
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${location.latitude},${location.longitude}`));
        callback();
    })
})

server.listen(port, () => {                     //server. instead of app.
    console.log('Server is ready on port 3000!');
})

//New code for socket.io