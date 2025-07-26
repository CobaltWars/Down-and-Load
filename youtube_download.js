const { YtDlp } = require('ytdlp-nodejs');
const { default: PQueue } = require('p-queue');
const { ensureDir } = require('fs-extra');
const path = require('path');
const fs = require('fs');

const ytdlp = new YtDlp();
const downloadQueue = new PQueue({ concurrency: 3 });
const activeDownloads = new Map();

function initYouTubeDownload(ipcMain, getConfig) {
    // Gestionnaire de téléchargement vidéo
    ipcMain.on('download-video-yt', async (event, arg) => {
        const itemId = arg.itemId || 'item-' + Date.now();
        
        try {
            const metadata = await ytdlp.getInfoAsync(arg.data, {
                dumpSingleJson: true,
                noDownload: true
            });
            
            event.sender.send('metadata', {
                id: itemId,
                title: metadata.fulltitle,
                thumbnail: metadata.thumbnail,
            });
            
            downloadVideo(event, arg.data, itemId, getConfig);
        } catch (error) {
            event.sender.send('reply', {
                id: itemId,
                status: 'Erreur: ' + error.message,
                error: true
            });
        }
    });
}

async function downloadVideo(event, url, itemId, getConfig) {
    if (activeDownloads.has(itemId)) return;
    
    downloadQueue.add(() => {
        return new Promise(async (resolve) => {
            let downloadControl;
            try {
                const config = getConfig();
                downloadControl = {
                    stopped: false,
                    paused: false,
                    url: url,
                    itemId: itemId
                };
                activeDownloads.set(itemId, downloadControl);

                event.sender.send('reply', {
                    id: itemId,
                    status: 'Téléchargement en cours...'
                });

                await ensureDir(config.downloadPath);
                
                const childProcess = ytdlp.download(url, {
                    paths: { home: config.downloadPath },
                    continue: true
                });

                downloadControl.childProcess = childProcess;

                childProcess.on('progress', (progress) => {
                    if (downloadControl.stopped || downloadControl.paused) return;
                    event.sender.send('reply', {
                        id: itemId,
                        status: progress.status || 'Téléchargement en cours...',
                        percent: progress.percentage
                    });
                });

                childProcess.on('close', (code) => {
                    if (downloadControl.stopped || downloadControl.paused) {
                        activeDownloads.delete(itemId);
                        resolve();
                        return;
                    }
                    if (downloadControl.stopped) return;
                    
                    if (code === 0) {
                        event.sender.send('reply', {
                            id: itemId,
                            status: 'Téléchargement terminé',
                            completed: true
                        });
                    } else {
                        event.sender.send('reply', {
                            id: itemId,
                            status: `Erreur: code ${code}`,
                            error: true
                        });
                    }
                    activeDownloads.delete(itemId);
                    resolve();
                });

                childProcess.on('error', (error) => {
                    if (!downloadControl.stopped) {
                        event.sender.send('reply', {
                            id: itemId,
                            status: 'Erreur: ' + error.message,
                            error: true
                        });
                    }
                    activeDownloads.delete(itemId);
                    resolve();
                });

            } catch (error) {
                if (!downloadControl?.stopped) {
                    event.sender.send('reply', {
                        id: itemId,
                        status: 'Erreur: ' + error.message,
                        error: true
                    });
                }
                activeDownloads.delete(itemId);
                resolve();
            }
        });
    });
}

module.exports = { initYouTubeDownload };