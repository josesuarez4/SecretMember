const mongoose = require('mongoose');
const Group = require('../models/Group');
const Participant = require('../models/Participant');
const generateSecretMember = require('../utils/pairing');

exports.createGroup = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Nombre inválido (mínimo 2 caracteres)' });
    }
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const group = new Group({ 
      code, 
      participants: [{
        _id: new mongoose.Types.ObjectId(),
        name: name
      }],
      pairs: [] 
    });
    
    const savedGroup = await group.save();

    res.status(201).json({ 
      success: true,
      code: savedGroup.code // Usa el código del documento guardado
    });
    
  } catch (err) {
    // Muestra el error real en consola
    console.error('Error al crear grupo:', err);
    
    res.status(500).json({ 
      error: 'Error creating group',
      details: err.message // Envía el mensaje real al cliente
    });
  }
};

exports.addParticipant = async (req, res) => {
  try {
    const { code } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Name is required' });
    }

    const group = await Group.findOne({ code });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Verifica si ya existe un participante con ese nombre (ignorando mayúsculas/minúsculas y espacios)
    const exists = group.participants.some(
      p => p.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (exists) {
      return res.status(409).json({ message: 'Ya existe un participante con ese nombre en el grupo' });
    }

    const newParticipant = {
      _id: new mongoose.Types.ObjectId(),
      name
    };

    group.participants.push(newParticipant);
    await group.save();

    const io = req.app.get('socketio');
    io.to(code).emit('participantJoined', {
      participants: group.participants.map(p => p.name),
      newParticipantId: newParticipant._id
    });

    res.status(201).json({ participantId: newParticipant._id });
  } catch (err) {
    res.status(500).json({ error: 'Error adding participant' });
  }
};

exports.generatePairs = async (req, res) => {
  try {
    const { code } = req.params;
    const group = await Group.findOne({ code });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.participants.length < 2) {
      return res.status(400).json({ message: 'Se necesitan al menos 2 participantes' });
    }

    const isRegeneration = group.pairs && group.pairs.length > 0;
    
    const pairs = generateSecretMember(group.participants);
    group.pairs = pairs;
    await group.save();
    
    // Notificar a todos sobre las nuevas asignaciones
    exports.notifyAssignments(code);
    
    // Si es una regeneración, notificar específicamente
    if (isRegeneration) {
      const io = req.app.get('socketio');
      io.to(code).emit('pairsRegenerated', {
        message: 'Las parejas han sido regeneradas'
      });
    }

    res.json({ 
      message: isRegeneration ? 'Pairs regenerated successfully' : 'Pairs generated successfully',
      isRegeneration 
    });
  } catch (err) {
    res.status(500).json({ error: 'Error generating pairs', details: err.message });
  }
};

exports.getAssignment = async (req, res) => {
  try {
    const { code, id } = req.params;
    const group = await Group.findOne({ code });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const pair = group.pairs.find(p => p.giverId.toString() === id);
    if (!pair) return res.status(404).json({ message: 'Assignment not found' });

    const receiver = group.participants.find(p => p._id.toString() === pair.receiverId.toString());
    if (!receiver) return res.status(404).json({ message: 'Receiver not found' });

    res.json({ youHave: receiver.name });
  } catch (err) {
    res.status(500).json({ error: 'Error getting assignment' });
  }
};

exports.getParticipants = async (req, res) => {
  try {
    const { code } = req.params;
    const group = await Group.findOne({ code });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    res.json(group.participants);
  } catch (err) {
    res.status(500).json({ error: 'Error getting participants' });
  }
};

exports.getGroup = async (req, res) => {
  try {
    const { code } = req.params;
    const group = await Group.findOne({ code });
    
    if (!group) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    res.json({
      code: group.code,
      participants: group.participants,
      pairs: group.pairs
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAssignments = async (req, res) => {
  try {
    const { code } = req.params;
    const group = await Group.findOne({ code });

    if (!group) return res.status(404).json({ error: 'Group not found' });

    res.json({
      participants: group.participants.map(p => ({ id: p._id, name: p.name })),
      pairsGenerated: Array.isArray(group.pairs) && group.pairs.length > 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.notifyAssignments = async (code) => {
  const group = await Group.findOne({ code });
  if (!group || !Array.isArray(group.pairs)) return;
  const io = require('../index').io;

  // console.log('Notificando asignaciones para grupo:', code);
  // console.log('Participantes:', group.participants.map(p => ({ id: p._id.toString(), name: p.name })));
  // console.log('Parejas:', group.pairs);

  group.pairs.forEach(pair => {
    const giver = group.participants.find(p => p._id.toString() === pair.giverId.toString());
    const receiver = group.participants.find(p => p._id.toString() === pair.receiverId.toString());
    if (giver && receiver) {
      const assignment = {
        userId: giver._id.toString(),
        userName: giver.name,
        assignment: receiver.name
      };
      // console.log('Enviando asignación:', assignment);
      io.to(code).emit('assignment', assignment);
    }
  });
};

exports.deleteGroup = async (req, res) => {
  try {
    const { code } = req.params;
    const group = await Group.findOne({ code });
    
    if (!group) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    // Notificar a todos los participantes que el grupo ha sido eliminado
    const io = req.app.get('socketio');
    io.to(code).emit('groupDeleted', {
      reason: 'El grupo ha sido eliminado por el creador'
    });

    // Limpiar el registro del creador
    const { clearCreatorByGroupCode } = require('../index');
    clearCreatorByGroupCode(code);

    // Eliminar el grupo
    await Group.deleteOne({ code });

    res.json({ message: 'Grupo eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar grupo', details: err.message });
  }
};

exports.removeParticipant = async (req, res) => {
  try {
    const { code, participantId } = req.params;
    const group = await Group.findOne({ code });
    
    if (!group) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    // Buscar el participante
    const participantIndex = group.participants.findIndex(p => p._id.toString() === participantId);
    if (participantIndex === -1) {
      return res.status(404).json({ error: 'Participante no encontrado' });
    }

    // Remover el participante
    group.participants.splice(participantIndex, 1);
    await group.save();

    // Notificar a todos los participantes sobre la actualización
    const io = req.app.get('socketio');
    io.to(code).emit('participantLeft', {
      participants: group.participants.map(p => p.name),
      leftParticipantId: participantId
    });

    res.json({ message: 'Participante eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar participante', details: err.message });
  }
};

exports.creatorReturnedToGroup = async (req, res) => {
  try {
    const { code } = req.params;
    const group = await Group.findOne({ code });
    
    if (!group) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    console.log('Notificando que el creador regresó al grupo:', code);
    
    // Notificar a todos los participantes que el creador regresó al grupo
    const io = req.app.get('socketio');
    io.to(code).emit('creatorReturnedToGroup', {
      message: 'El creador ha regresado al grupo'
    });

    console.log('Notificación enviada exitosamente para grupo:', code);
    res.json({ message: 'Notificación enviada exitosamente' });
  } catch (err) {
    console.error('Error al notificar regreso del creador:', err);
    res.status(500).json({ error: 'Error al notificar regreso del creador', details: err.message });
  }
};