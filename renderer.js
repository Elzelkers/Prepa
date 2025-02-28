const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        matiere: document.getElementById('matiere'),
        filiere: document.getElementById('filiere'),
        anneeMin: document.getElementById('anneeMin'),
        anneeMax: document.getElementById('anneeMax'),
        concours: document.getElementById('concours'),
        analyser: document.getElementById('analyser'),
        resultats: document.getElementById('resultats')
    };

    ipcRenderer.on('load-data', (event, data) => {
        // Remplir les menus déroulants
        data.matieres.forEach(m => {
            const option = new Option(m, m);
            elements.matiere.add(option);
        });

        data.filieres.forEach(f => {
            const option = new Option(f, f);
            elements.filiere.add(option);
        });

        data.concours.forEach(c => {
            const option = new Option(c, c);
            elements.concours.add(option);
        });

        // Définir les années min/max
        const annees = data.annees.map(Number);
        elements.anneeMin.min = Math.min(...annees);
        elements.anneeMin.max = Math.max(...annees);
        elements.anneeMax.min = Math.min(...annees);
        elements.anneeMax.max = Math.max(...annees);
    });

    elements.analyser.addEventListener('click', () => {
        const filters = {
            matiere: elements.matiere.value,
            filiere: elements.filiere.value,
            anneeMin: parseInt(elements.anneeMin.value) || null,
            anneeMax: parseInt(elements.anneeMax.value) || null,
            concours: Array.from(elements.concours.selectedOptions).map(opt => opt.value)
        };

        ipcRenderer.send('filter-data', filters);
    });

    ipcRenderer.on('filtered-data', (event, data) => {
        const { resultats, totalSujets } = data;
        
        elements.resultats.innerHTML = `
            <h3>Résultats (${totalSujets} sujets analysés)</h3>
        `;

        const sortedResults = Object.entries(resultats)
            .sort(([,a], [,b]) => b.count - a.count);

        sortedResults.forEach(([motCle, stats]) => {
            const div = document.createElement('div');
            div.className = 'mot-cle';
            div.innerHTML = `
                <div class="progress-bar" style="width: ${stats.percentage}%"></div>
                <div class="mot-cle-content">
                    ${motCle}: ${stats.count} occurence${stats.count > 1 ? 's' : ''} 
                    (${stats.percentage.toFixed(1)}%)
                </div>
            `;
            elements.resultats.appendChild(div);
        });
    });
});
