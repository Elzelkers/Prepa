const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;
let cachedData = null;

function loadAndCacheData() {
    if (cachedData) return cachedData;
    
    const jsonPath = path.join(__dirname, 'assets', 'Doc Solus.json');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    
    cachedData = {
        sujets: data,
        matieres: [...new Set(data.map(s => s["Matière"]))],
        filieres: [...new Set(data.map(s => s["Filière"]))],
        annees: [...new Set(data.map(s => s["Année"]))].sort(),
        concours: [...new Set(data.map(s => s["Concours"]))]
    };

    return cachedData;
}

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');

    mainWindow.webContents.once('did-finish-load', () => {
        const data = loadAndCacheData();
        mainWindow.webContents.send('load-data', {
            matieres: data.matieres,
            filieres: data.filieres,
            annees: data.annees,
            concours: data.concours
        });
    });
});

ipcMain.on('filter-data', (event, filters) => {
    const data = loadAndCacheData();
    const selectedConcours = new Set(filters.concours);
    
    // Filtrer les sujets selon les critères
    const filtered = data.sujets.filter(s => {
        if (filters.matiere && s["Matière"] !== filters.matiere) return false;
        if (filters.filiere && s["Filière"] !== filters.filiere) return false;
        if (filters.concours.length > 0 && !selectedConcours.has(s["Concours"])) return false;
        
        const annee = parseInt(s["Année"]);
        if (filters.anneeMin && annee < filters.anneeMin) return false;
        if (filters.anneeMax && annee > filters.anneeMax) return false;
        
        return true;
    });

    // Ensemble pour stocker les noms uniques de sujets
    const uniqueSujets = new Set(filtered.map(s => s["Nom"]));
    const totalSujets = uniqueSujets.size;

    // Map pour compter les occurrences de mots-clés par sujet unique
    const motsClesStats = new Map();
    const sujetsTraites = new Set(); // Pour éviter de compter deux fois le même sujet

    filtered.forEach(sujet => {
        // Si on a déjà traité ce sujet, on passe
        if (sujetsTraites.has(sujet["Nom"])) return;
        
        if (sujet["Mots_clés"]) {
            const motsCles = sujet["Mots_clés"];
            if (!motsClesStats.has(motsCles)) {
                motsClesStats.set(motsCles, { count: 0, percentage: 0 });
            }
            motsClesStats.get(motsCles).count++;
        }
        
        // Marquer le sujet comme traité
        sujetsTraites.add(sujet["Nom"]);
    });

    // Calculer les pourcentages basés sur le nombre total de sujets uniques
    const resultats = {};
    for (const [motCle, stats] of motsClesStats) {
        stats.percentage = (stats.count / totalSujets) * 100;
        resultats[motCle] = stats;
    }

    event.sender.send('filtered-data', { resultats, totalSujets });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
