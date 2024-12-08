import { generateContent } from "@/configs/AiModel";

export const generateFlashcards = async (selectedSubjects, selectedNotes, onProgress) => {
  try {
    onProgress({ status: 'starting', message: 'Iniciando generación de flashcards...' });
    
    const content = prepareContent(selectedSubjects, selectedNotes);
    
    onProgress({ status: 'preparing', message: 'Analizando contenido...' });
    
    onProgress({ status: 'generating', message: 'Generando flashcards inteligentes...' });
    
    const prompt = `Actúa como un experto profesor y crea un conjunto de tarjetas de estudio basadas en este contenido. IMPORTANTE: Usa EXACTAMENTE el mismo idioma que está en el contenido proporcionado.

Contenido para analizar: ${content}

IMPORTANTE: Tu respuesta debe ser ÚNICAMENTE un objeto JSON válido con la siguiente estructura exacta, sin texto adicional antes o después:

{
  "flashcards": [
    {
      "front": "Concepto o término clave a aprender",
      "back": "Explicación detallada con ejemplos",
      "topic": "Tema específico",
      "difficulty": "basic|intermediate|advanced"
    }
  ]
}

Reglas para generar el contenido:
1. SIEMPRE usa el mismo idioma que está en el contenido proporcionado
2. El frente (front) debe ser un concepto clave, definición o principio importante
3. El reverso (back) debe incluir:
   - Explicación clara y detallada
   - Al menos un ejemplo práctico
   - Conexiones con otros conceptos cuando sea relevante
4. Crea al menos 10 flashcards variadas
5. Asegúrate de cubrir los conceptos más importantes
6. Incluye una mezcla de dificultades
7. Evita preguntas tipo examen, enfócate en presentar información valiosa
8. NO uses caracteres especiales que puedan romper el JSON
9. Asegúrate de que todo el contenido esté en el mismo idioma que los apuntes originales`;

    const text = await generateContent(prompt);
    
    onProgress({ status: 'processing', message: 'Procesando flashcards...' });

    let jsonStr = text;
    
    if (text.includes('{') && text.includes('}')) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}') + 1;
      jsonStr = text.slice(start, end);
    }

    let parsedFlashcards;
    try {
      parsedFlashcards = JSON.parse(jsonStr);
    } catch (error) {
      console.error('Error parsing JSON:', jsonStr);
      throw new Error('El formato de la respuesta no es válido');
    }

    if (!parsedFlashcards.flashcards || !Array.isArray(parsedFlashcards.flashcards)) {
      throw new Error('Estructura de flashcards inválida');
    }

    parsedFlashcards.flashcards = parsedFlashcards.flashcards.map(flashcard => {
      if (!flashcard.front || !flashcard.back || !flashcard.topic) {
        throw new Error('Flashcard incompleta');
      }

      return {
        id: generateId(),
        front: String(flashcard.front).trim(),
        back: String(flashcard.back).trim(),
        topic: String(flashcard.topic).trim(),
        difficulty: String(flashcard.difficulty || 'intermediate').trim(),
        status: 'new',
        lastReviewed: null,
        nextReview: null,
        reviewCount: 0
      };
    });

    onProgress({ status: 'completed', message: '¡Flashcards listas!' });
    
    return parsedFlashcards;
  } catch (error) {
    console.error('Error generando flashcards:', error);
    throw new Error('Error al generar las flashcards. Por favor, intenta de nuevo.');
  }
};

function prepareContent(subjects, notes) {
  return subjects.map(subject => {
    const subjectNotes = notes
      .filter(note => note.subjectId === subject.id)
      .map(note => note.content)
      .join('\\n');
    
    return `${subject.name}:\\n${subjectNotes}`;
  }).join('\\n\\n');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function calculateNextReview(status, reviewCount) {
  const now = new Date();
  let nextReview = new Date(now);

  switch (status) {
    case 'new':
      nextReview.setMinutes(now.getMinutes() + 10);
      break;
    case 'reviewing':
      switch (reviewCount) {
        case 1:
          nextReview.setHours(now.getHours() + 1);
          break;
        case 2:
          nextReview.setDate(now.getDate() + 1);
          break;
        case 3:
          nextReview.setDate(now.getDate() + 3);
          break;
        case 4:
          nextReview.setDate(now.getDate() + 7);
          break;
        default:
          nextReview.setDate(now.getDate() + 14);
      }
      break;
    case 'mastered':
      nextReview.setMonth(now.getMonth() + 1);
      break;
  }

  return nextReview;
}
