const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    downloadVideo: (data) => ipcRenderer.send('download-video-yt', data),
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),
    selectDownloadFolder: () => ipcRenderer.invoke('select-download-folder'),
    onReply: (callback) => ipcRenderer.on('reply', callback),
    onMetadata: (callback) => ipcRenderer.on('metadata', callback),
    onDownloadStatus: (callback) => ipcRenderer.on('download-status', callback),
    onUpdateAvailable: (callback) => ipcRenderer.on('update_available', callback),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update_downloaded', callback),
    onUpdateError: (callback) => ipcRenderer.on('update_error', callback),
    startDownloadUpdate: () => ipcRenderer.send('start-download'),
    installUpdate: () => ipcRenderer.send('install-update')
})