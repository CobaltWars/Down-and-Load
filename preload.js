const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    downloadVideo: (data) => ipcRenderer.send('download-video-yt', data),
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),
    selectDownloadFolder: () => ipcRenderer.invoke('select-download-folder'),
    onReply: (callback) => ipcRenderer.on('reply', callback),
    onMetadata: (callback) => ipcRenderer.on('metadata', callback),
    onDownloadStatus: (callback) => ipcRenderer.on('download-status', callback),
});