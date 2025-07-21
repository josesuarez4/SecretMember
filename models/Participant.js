const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
  name: String
});

module.exports = mongoose.model('Participant', ParticipantSchema);
module.exports.schema = ParticipantSchema;