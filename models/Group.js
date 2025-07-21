const mongoose = require('mongoose');

// Importar el esquema de Participant
const ParticipantSchema = require('./Participant').schema;

const GroupSchema = new mongoose.Schema({
  code: { 
    type: String, 
    unique: true,
    required: true 
  },
  participants: [ParticipantSchema],
  pairs: [{
    giverId: { 
      type: mongoose.Schema.Types.ObjectId,
      required: true 
    },
    receiverId: { 
      type: mongoose.Schema.Types.ObjectId,
      required: true 
    }
  }]
});

// // Añadir índice para búsquedas más rápidas por código
// GroupSchema.index({ code: 1 }, { unique: true });

module.exports = mongoose.model('Group', GroupSchema);