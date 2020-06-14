const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage }= require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)       //creating server
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))


//server(emit) -> client (receive) -countupdated
//client(emit) -> server(receive) = increment

io.on('connection', (socket) => {                                                    //socket is an object and it conatains info about the new connection
    console.log('new websocket connection')

    socket.on('join', (options, callback) => {
        const {error, user} = addUser({ id: socket.id, ...options })         //...options is a spread operator we are using instead of username and room

        if(error) {
            return callback(error)
        }

        socket.join(user.room)                                                            //join() method is only used in the server and it allows to join a chat room
        
        socket.emit('message', generateMessage('Admin','Welcome!'))                              //emit to particular user
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin',`${user.username} has joined`))       //emit to everyone except the user himself
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })
    socket.on('sendMessage', (message, callback) => {                                //sendmessage is the event name
        const user = getUser(socket.id)
        const filter = new Filter()

        if(filter.isProfane(message)) {
            return callback('profanity is not allowed')
        }

        io.to(user.room).emit('message', generateMessage(user.username,message))                                 //emit to everyone
        callback()
    })

    socket.on('sendlocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationmessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
      
        if(user) {
            io.to(user.room).emit('message', generateMessage('Admin',`${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        } 
    })
})

server.listen(port, () => {
    console.log('server is up on port ' + port)
})