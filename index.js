const express = require('express')
const app = express()
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const multer = require('multer')
const fs = require('fs')
const path = require('path')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './images')
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname)
  },
})

const upload = multer({ storage })

app.use(cors())

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: '*',
  },
})

let users = []

io.on('connection', socket => {
  socket.on('join', (username, callback) => {
    const user = { id: socket.id, username }

    users.push(user)

    socket.broadcast.emit('user-joined', user)

    callback({ users })
  })

  socket.on('send-message', message => {
    io.emit('receive-message', message)
  })

  socket.on('disconnect', () => {
    const i = users.findIndex(u => u.id === socket.id)

    socket.broadcast.emit('user-left', users[i])

    users.splice(i, 1)

    if (users.length == 0) {
      fs.readdir('images', (err, files) => {
        if (err) throw err

        for (const file of files) {
          fs.unlink(path.join('images', file), err => {
            if (err) throw err
          })
        }
      })
    }
  })
})

app.get('/', (req, res) => {
  res.send('<h1>degas</h1>')
})

app.get('/images/:img', (req, res) => {
  res.sendFile(__dirname + '/images/' + req.params.img)
})

app.post('/image', upload.array('files'), (req, res) => {
  const user = JSON.parse(req.body.user)
  io.emit('receive-message', { user, img: req.files[0].filename, message: null })

  res.send('image uploaded')
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`cepa se jako na portu ${PORT}...`))
