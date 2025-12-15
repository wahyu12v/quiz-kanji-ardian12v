const TEMP_KEY = "kanji_app_temp_session";

export function saveTemp(state) {
  // Simpan state saat ini ke LocalStorage (Temporary)
  const payload = {
    sessionType: state.sessionType,
    orderIndices: state.orderIndices,
    answers: state.answers,
    current: state.current
  };
  try { localStorage.setItem(TEMP_KEY, JSON.stringify(payload)); } catch (e) {}
}

export function loadTemp() {
    try {
        return JSON.parse(localStorage.getItem(TEMP_KEY) || 'null');
    } catch(e) { return null; }
}

export function clearTemp() {
    localStorage.removeItem(TEMP_KEY);
}