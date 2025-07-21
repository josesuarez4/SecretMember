const express = require('express');
const router = express.Router();
const participantController = require('../controllers/participantController');

// Obtener datos de un participante
router.get('/:id', participantController.getParticipantById);

// Actualizar nombre
router.put('/:id', participantController.updateParticipantName);

// Eliminar participante de un grupo
router.delete('/:code/:id', participantController.deleteParticipant);

module.exports = router;