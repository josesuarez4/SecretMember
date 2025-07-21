// const API_URL = 'http://localhost:3000/groups'; // Debes definir esta variable

// async function setupGroup() {
//   try {
//     // Crear grupo
//     const createResponse = await fetch(`${API_URL}/groups`, { 
//       method: 'POST' 
//     });
//     const { code } = await createResponse.json();
    
//     // Unirse
//     const joinResponse = await fetch(`${API_URL}/groups/${code}/participants`, {
//       method: 'POST',
//       body: JSON.stringify({ name: 'Juan' }),
//       headers: { 'Content-Type': 'application/json' }
//     });
//     const { participantId } = await joinResponse.json();
    
//     // Generar sorteo (necesitarías al menos otro participante)
//     const pairResponse = await fetch(`${API_URL}/groups/${code}/pairing`, { 
//       method: 'POST' 
//     });
    
//     // Ver tu resultado
//     const assignmentResponse = await fetch(`${API_URL}/groups/${code}/participants/${participantId}`);
//     const assignment = await assignmentResponse.json();
//     console.log(assignment);
//   } catch (err) {
//     console.error('Error:', err);
//   }
// }

// setupGroup();

const API_URL = 'http://localhost:3000';

async function testGroupCreation() {
  try {
    // 1. Crear grupo
    console.log('🔵 Creando grupo...');
    const createRes = await fetch(`${API_URL}/groups`, { method: 'POST' });

    const { code } = await createRes.json();
    // console.log('Respuesta cruda:', await createRes.text());
    console.log('✅ Grupo creado. Código:', code);

    // 2. Añadir participantes de prueba
    const testParticipants = ['Ana', 'Carlos', 'Luisa', 'Pedro', 'María', 'Javier'];
    
    for (const name of testParticipants) {
      await fetch(`${API_URL}/groups/${code}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      console.log(`➕ Participante añadido: ${name}`);
    }

    // 3. Generar pares
    console.log('🎲 Generando pares...');
    await fetch(`${API_URL}/groups/${code}/pairing`, { method: 'POST' });
    console.log('✨ Pares generados con éxito!');

    // 4. Ver resultados (opcional)
    const groupData = await fetch(`${API_URL}/groups/${code}`).then(res => res.json());
    console.log('📦 Datos finales del grupo:', groupData);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecuta la prueba
testGroupCreation();