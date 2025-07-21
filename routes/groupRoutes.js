const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');

router.post('/', groupController.createGroup);
router.get('/:code', groupController.getGroup);
router.post('/:code/participants', groupController.addParticipant);
router.get('/:code/participants', groupController.getParticipants);
router.post('/:code/pairing', groupController.generatePairs);
router.get('/:code/participants/:id', groupController.getAssignment);
router.delete('/:code', groupController.deleteGroup);
router.delete('/:code/participants/:participantId', groupController.removeParticipant);
router.post('/:code/creator-return', groupController.creatorReturnedToGroup);
router.get('/:code/assignments', groupController.getAssignments);

module.exports = router;