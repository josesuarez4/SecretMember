const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();
const PORT = process.env.PORT || 3000;

//
const http = require('http');
const socketio = require('socket.io');

const server = http.createServer(app);
// const io = socketio(server);

const Group = require('./models/Group');

// Mapa para rastrear creadores de grupos: socketId -> groupCode
const groupCreators = new Map();

const io = socketio(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
app.set('socketio', io);

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);
  
  socket.on('joinGroup', (code) => {
    socket.join(code);
    console.log(`Usuario ${socket.id} unido al grupo ${code}`);
    console.log(`Salas del usuario:`, Array.from(socket.rooms));
    
    Group.findOne({ code }).then(group => {
      if (group) {
        console.log(`Emitiendo participantJoined a grupo ${code} con ${group.participants.length} participantes`);
        io.to(code).emit('participantJoined', {
          participants: group.participants.map(p => p.name)
        });
      }
    });
  });
  
  // Registrar cuando alguien se identifica como creador
  socket.on('registerAsCreator', (code) => {
    groupCreators.set(socket.id, code);
    console.log(`Usuario ${socket.id} registrado como creador del grupo ${code}`);
  });
  
  // Heartbeat para verificar que el creador sigue activo
  socket.on('creatorHeartbeat', (code) => {
    // Solo actualizar si el socket está registrado como creador de este grupo
    if (groupCreators.get(socket.id) === code) {
      console.log(`Heartbeat recibido del creador del grupo ${code}`);
    }
  });
  
  socket.on('disconnect', async () => {
    console.log('Cliente desconectado:', socket.id);
    
    // Verificar si el usuario desconectado era un creador
    const groupCode = groupCreators.get(socket.id);
    if (groupCode) {
      console.log(`El creador del grupo ${groupCode} se desconectó, eliminando grupo`);
      
      try {
        // Verificar que el grupo aún existe
        const group = await Group.findOne({ code: groupCode });
        if (group) {
          // Notificar a todos los participantes que el grupo fue eliminado
          io.to(groupCode).emit('groupDeleted', {
            reason: 'El creador se desconectó'
          });
          
          // Eliminar el grupo de la base de datos
          await Group.deleteOne({ code: groupCode });
          console.log(`Grupo ${groupCode} eliminado por desconexión del creador`);
        }
      } catch (error) {
        console.error('Error al eliminar grupo por desconexión:', error);
      }
      
      // Limpiar el registro del creador
      groupCreators.delete(socket.id);
    }
  });
  
});

//

mongoose.connect(process.env.MONGO_URI, {
})
.then(() => console.log('✅ MongoDB conectado'))
.catch(err => {
  console.error('❌ FALLO DE CONEXIÓN A MONGODB:', err);
  process.exit(1); // Detiene la aplicación si no hay conexión
});

const groupRoutes = require('./routes/groupRoutes');

app.use(express.static('public'));
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000', // Ajusta según tu frontend
  methods: ['GET', 'POST', 'DELETE']
}));

app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});


app.use('/groups', groupRoutes);

// Ruta de prueba
// app.get('/', (req, res) => {
//   res.send('Servidor Express funcionando 🎉');
// });
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

// app.listen(PORT, () => {
//   console.log(`Servidor escuchando en http://localhost:${PORT}`);
// });

server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

// Función para limpiar el registro de un creador por código de grupo
function clearCreatorByGroupCode(groupCode) {
  for (const [socketId, code] of groupCreators.entries()) {
    if (code === groupCode) {
      groupCreators.delete(socketId);
      console.log(`Registro de creador eliminado para grupo ${groupCode}`);
      break;
    }
  }
}

module.exports = { io, clearCreatorByGroupCode };