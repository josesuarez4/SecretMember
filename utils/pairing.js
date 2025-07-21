function generateSecretMember(participants) {
  if (participants.length < 2) {
    throw new Error('Se necesitan al menos 2 participantes para generar pares');
  }

  let givers = [...participants];
  let receivers = [...participants];
  let pairs = [];

  for (let giver of givers) {
    let options = receivers.filter(r => r._id.toString() !== giver._id.toString());

    if (options.length === 0) {
      // Si no hay opciones, reiniciamos el proceso
      return generateSecretMember(participants);
    }

    const randomIndex = Math.floor(Math.random() * options.length);
    const receiver = options[randomIndex];

    pairs.push({ 
      giverId: giver._id.toString(), 
      receiverId: receiver._id.toString() 
    });

    receivers = receivers.filter(r => r._id.toString() !== receiver._id.toString());
  }

  return pairs;
}

module.exports = generateSecretMember;