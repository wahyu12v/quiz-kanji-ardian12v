// main.js - Loader (path asli: file JS ada di subfolder js/)
const scriptsToLoad = [
    'js/variables.js',
    'js/utils.js',
    'js/data.js',
    'js/ui-list.js',
    'js/ui-reader.js',
    'js/ui-quiz.js',
    'js/init.js' 
];

function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve();
        script.onerror = () => {
            console.error(`Gagal memuat: ${url}`);
            reject();
        };
        document.body.appendChild(script);
    });
}

async function initApp() {
    try {
        for (const url of scriptsToLoad) {
            await loadScript(url);
        }
        console.log("Semua script siap.");
        if (typeof mulaiAplikasi === "function") {
            mulaiAplikasi();
        } else {
            console.error("Fungsi mulaiAplikasi tidak ditemukan.");
        }
    } catch (error) {
        console.error("Terjadi kesalahan saat memuat script:", error);
    }
}

initApp();