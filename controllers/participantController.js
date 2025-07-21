const Participant = require('../models/Participant');
const Group = require('../models/Group');

exports.getParticipantById = async (req, res) => {
  try {
    const { id } = req.params;
    const participant = await Participant.findById(id);
    if (!participant) return res.status(404).json({ message: 'Participante no encontrado' });
    res.json(participant);
  } catch (err) {
    res.status(500).json({ error: 'Error al buscar participante' });
  }
};

exports.deleteParticipant = async (req, res) => {
  try {
    const { code, id } = req.params;

    const group = await Group.findOne({ code });
    if (!group) return res.status(404).json({ message: 'Grupo no encontrado' });

    group.participants = group.participants.filter(pid => pid.toString() !== id);
    await group.save();

    await Participant.findByIdAndDelete(id);

    res.json({ message: 'Participante eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar participante' });
  }
};

exports.updateParticipantName = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const participant = await Participant.findByIdAndUpdate(id, { name }, { new: true });
    if (!participant) return res.status(404).json({ message: 'Participante no encontrado' });

    res.json(participant);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar nombre' });
  }
};
