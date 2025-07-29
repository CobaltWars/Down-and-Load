const { app, BrowserWindow, ipcMain } = require('electron')
const { autoUpdater } = require("electron-updater")
const path = require('path')
const fs = require('fs')
const os = require('os')
const { initYouTubeDownload } = require('./youtube_download')

// Chemin du fichier de configuration
const configPath = process.platform === 'win32' 
  ? path.join(os.homedir(), 'AppData', 'Local', 'yt-downloader', 'config.json')
  : path.join(os.homedir(), '.config', 'yt-downloader', 'config.json')

let mainWindow

// Fonction pour charger la configuration
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Erreur lors du chargement de la configuration:', error)
  }
  
  return {
    downloadPath: path.join(os.homedir(), 'Downloads')
  }
}

// Fonction pour sauvegarder la configuration
function saveConfig(config) {
  try {
    const dir = path.dirname(configPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la configuration:', error)
  }
}

let config = loadConfig()

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'ressource/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
    }
  })
  mainWindow.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()
  
  initYouTubeDownload(ipcMain, () => config)
  
  // Configuration de l'auto-update
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.checkForUpdatesAndNotify()
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Événements de mise à jour
autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update_available')
})

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update_downloaded')
})

autoUpdater.on('error', (error) => {
  mainWindow.webContents.send('update_error', error.message)
})

// Gestion des actions utilisateur via IPC
ipcMain.on('start-download', () => {
  autoUpdater.downloadUpdate()
})

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall()
})

// Gestionnaire IPC pour ouvrir dossier source
ipcMain.on('open-download-folder', () => {
  const { shell } = require('electron')
  shell.openPath(config.downloadPath)
})

// Gestionnaires IPC pour la configuration
ipcMain.handle('get-config', () => {
  return config
})

ipcMain.handle('save-config', (event, newConfig) => {
  config = { ...config, ...newConfig }
  saveConfig(config)
  return config
})

ipcMain.handle('select-download-folder', async () => {
  const { dialog } = require('electron')
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})