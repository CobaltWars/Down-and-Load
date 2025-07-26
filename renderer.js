let urlbar = document.getElementById("urlInput");
let downloadBtn = document.getElementById("downloadBtn");
let info = document.getElementById("info");
let downloadList = document.getElementById("downloadList");

// Logique du changement de page interne
function showSection(sectionId, event) {
    // Masquer toutes les sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Afficher la section sélectionnée
    document.getElementById(sectionId).classList.add('active');
    
    // Mettre à jour les icônes actives
    document.querySelectorAll('.sidebar-icon').forEach(icon => {
        icon.classList.remove('active');
    });
    
    event.currentTarget.classList.add('active');
}

function isValidYouTubeUrl(url) {
    const regex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    return regex.test(url);
}

downloadBtn.addEventListener('click', () => {
    if (isValidYouTubeUrl(urlbar.value)) {
        const itemId = 'item-' + Date.now();
        addToDownloadList(urlbar.value, itemId);
        window.electronAPI.downloadVideo({ data: urlbar.value, itemId: itemId });
        urlbar.value = ""; // Vider le champ après soumission
    }
    else  {
        info.textContent = "URL Youtube invalide";
    }
});

// Nettoyer la liste des finis
const cleanBtn = document.getElementById('cleanBtn');
cleanBtn.addEventListener('click', () => {
    const items = document.querySelectorAll('.download-item');
    items.forEach(item => {
        const statusElement = item.querySelector('.status');
        if (statusElement.textContent.includes('terminé')) {
            item.remove();
        }
    });
});

function addToDownloadList(url, itemId) {
    const item = document.createElement('div');
    item.className = 'download-item';
    item.id = itemId;
    item.dataset.url = url;
    item.innerHTML = `
        <div class="thumbnail-container">
            <img class="thumbnail" src="ressource/default_thumbnail.png" alt="Thumbnail">
        </div>
        <div class="details">
            <div class="title">Récupération des informations...</div>
            <div class="url">${url}</div>
            <div class="progress-container">
                <div class="progress-bar"></div>
            </div>
            <div class="status">Initialisation...</div>
        </div>
    `;
    downloadList.appendChild(item);
    return itemId;
}

window.electronAPI.onReply((event, arg) => {
    if (arg.id && arg.status) {
        const item = document.getElementById(arg.id);
        if (item) {
            const statusElement = item.querySelector('.status');
            statusElement.textContent = arg.status;
            // Correction barre de progression
            if (arg.percent !== undefined) {
                const progressBar = item.querySelector('.progress-bar');
                progressBar.style.width = `${arg.percent}%`;
                
                // Mettre à jour le statut seulement si c'est une progression
                if (arg.percent > 0 && arg.percent < 100) {
                    statusElement.textContent = `Téléchargement... ${arg.percent.toFixed(1)}%`;
                }
            }
            
            if (arg.completed) {
                statusElement.style.color = 'green';
            } else if (arg.error) {
                statusElement.style.color = 'red';
            } else if (arg.paused) {
                statusElement.style.color = 'orange';
            }
        }
    } else {
        info.textContent = arg;
    }
});

window.electronAPI.onMetadata((event, data) => {
    const item = document.getElementById(data.id);
    if (item) {
        const thumbnail = item.querySelector('.thumbnail');
        const title = item.querySelector('.title');
        const urlElement = item.querySelector('.url');
        
        thumbnail.src = data.thumbnail;
        title.textContent = data.title;
        urlElement.textContent = ""; // Cacher l'URL maintenant qu'on a le titre
    }
});

// Écouter les mises à jour de statut des téléchargements
window.electronAPI.onDownloadStatus((event, data) => {
    const item = document.getElementById(data.id);
    if (item) {
        const statusElement = item.querySelector('.status');
        statusElement.textContent = data.status;
        
        if (data.stopped) {
            statusElement.style.color = 'red';
        } else {
            statusElement.style.color = 'black';
        }
    }
});


// Variables pour les paramètres
let currentConfig = {};

// Éléments de la section paramètres
const downloadPathInput = document.getElementById('downloadPath');
const selectFolderBtn = document.getElementById('selectFolderBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

// Charger la configuration au démarrage
async function loadSettings() {
    try {
        currentConfig = await window.electronAPI.getConfig();
        downloadPathInput.value = currentConfig.downloadPath || '';
    } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
    }
}

// Gestionnaires d'événements pour les paramètres
selectFolderBtn.addEventListener('click', async () => {
    try {
        const selectedPath = await window.electronAPI.selectDownloadFolder();
        if (selectedPath) {
            downloadPathInput.value = selectedPath;
        }
    } catch (error) {
        console.error('Erreur lors de la sélection du dossier:', error);
    }
});

saveSettingsBtn.addEventListener('click', async () => {
    try {
        const newConfig = {
            downloadPath: downloadPathInput.value
        };
        currentConfig = await window.electronAPI.saveConfig(newConfig);
        alert('Paramètres sauvegardés avec succès !');
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        alert('Erreur lors de la sauvegarde des paramètres.');
    }
});

// Charger les paramètres au démarrage de l'application
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
});

// Système de mise à jour
const updateNotification = document.createElement('div')
updateNotification.id = 'updateNotification'
updateNotification.style.cssText = 'display:none; padding:10px; margin-top:20px; background:#f0f0f0; border-radius:4px;'
updateNotification.innerHTML = `
  <p id="updateMessage"></p>
  <button id="downloadUpdateBtn" style="display:none; margin-right:10px;">Télécharger la mise à jour</button>
  <button id="installUpdateBtn" style="display:none;">Redémarrer et installer</button>
`
document.getElementById('main').appendChild(updateNotification)

const updateMessage = document.getElementById('updateMessage')
const downloadUpdateBtn = document.getElementById('downloadUpdateBtn')
const installUpdateBtn = document.getElementById('installUpdateBtn')

window.electronAPI.onUpdateAvailable(() => {
  updateNotification.style.display = 'block'
  updateMessage.textContent = 'Une nouvelle version est disponible !'
  downloadUpdateBtn.style.display = 'inline-block'
})

window.electronAPI.onUpdateDownloaded(() => {
  updateNotification.style.display = 'block'
  updateMessage.textContent = 'Mise à jour téléchargée. Prête à installer.'
  installUpdateBtn.style.display = 'inline-block'
  downloadUpdateBtn.style.display = 'none'
})

window.electronAPI.onUpdateError((event, error) => {
  updateNotification.style.display = 'block'
  updateMessage.textContent = `Erreur de mise à jour: ${error}`
})

downloadUpdateBtn.addEventListener('click', () => {
  window.electronAPI.startDownloadUpdate()
  downloadUpdateBtn.disabled = true
  updateMessage.textContent = 'Téléchargement en cours...'
})

installUpdateBtn.addEventListener('click', () => {
  window.electronAPI.installUpdate()
})