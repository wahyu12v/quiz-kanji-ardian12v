import { KEYS } from './constants.js';
import { shuffleArray, extractHiraganaSubstrings, normalizeRomaji, hiraToRomaji } from './utils.js';

export function buildChoices(orderIndices, allQuestions) {
  // 1. Kumpulkan semua kemungkinan jawaban unik dari database
  const uniquePool = [];
  const seen = new Set();
  allQuestions.forEach(q => {
    const val = { meaning: String(q[KEYS.meaning]||'').trim(), hiragana: String(q[KEYS.hiragana]||'').trim() };
    if(val.meaning && !seen.has(val.meaning+val.hiragana)) {
        seen.add(val.meaning+val.hiragana);
        uniquePool.push(val);
    }
  });

  // 2. Buat pilihan untuk setiap soal
  return orderIndices.map(idx => {
      const q = allQuestions[idx];
      const correct = { meaning: String(q[KEYS.meaning]||'').trim(), hiragana: String(q[KEYS.hiragana]||'').trim() };
      
      const kanjiHiraParts = extractHiraganaSubstrings(String(q[KEYS.kanji]||''));
      
      let distractors = uniquePool.filter(o => {
          if (o.meaning === correct.meaning) return false;
          if (kanjiHiraParts.some(part => o.hiragana.includes(part))) return false;
          return true;
      });

      shuffleArray(distractors);
      const choices = [correct, ...distractors.slice(0, 3)];
      return shuffleArray(choices);
  });
}

export function gradeSession(state, allQuestions) {
    let correct = 0;
    const results = state.batch.map((q, i) => {
        const origIdx = state.orderIndices[i];
        const hira = String(q[KEYS.hiragana]||'').trim();
        const mean = String(q[KEYS.meaning]||'').trim();
        
        let isCorrect = false;
        let userAns = null;

        if (state.sessionType === 'quiz') {
            const choiceIdx = state.answers[i];
            const choices = state.choicesPerQ[i];
            if (choiceIdx !== null && choiceIdx !== 'Lupa') {
                const choice = choices[choiceIdx];
                if (choice && choice.meaning === mean && choice.hiragana === hira) isCorrect = true;
                userAns = choice;
            } else {
                userAns = choiceIdx;
            }
        } else {
            const raw = state.answers[i] || '';
            const normUser = normalizeRomaji(raw);
            const normTrue = normalizeRomaji(hiraToRomaji(hira));
            if (raw && raw !== 'Lupa' && normUser === normTrue) isCorrect = true;
            userAns = raw;
        }

        if (isCorrect) correct++;
        return { q, isCorrect, userAns, realHira: hira, realMean: mean, romTrue: hiraToRomaji(hira) };
    });
    
    return { score: correct, total: state.batch.length, details: results };
}