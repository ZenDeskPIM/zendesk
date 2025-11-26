import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const APP_NAME = 'ZenTicket';
const APP_ID = 'com.zenticket.desktop';

// Ensure the operating system displays the correct application name
app.setName(APP_NAME);
app.name = APP_NAME;
if (process.platform === 'win32') {
    app.setAppUserModelId(APP_ID);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function getIndexPath() {
    // Try multiple possible locations for the index.html file
    const possiblePaths = [
        // Development / unpacked asar
        path.join(__dirname, '..', 'electron-app', 'dist', 'index.html'),
        // Packed asar
        path.join(app.getAppPath(), 'electron-app', 'dist', 'index.html'),
        // Fallback using resourcesPath
        path.join(process.resourcesPath || '', 'app', 'electron-app', 'dist', 'index.html'),
        path.join(process.resourcesPath || '', 'app.asar', 'electron-app', 'dist', 'index.html'),
    ];

    for (const p of possiblePaths) {
        try {
            if (fs.existsSync(p)) {
                console.log('Found index.html at:', p);
                return p;
            }
        } catch {
            // Continue to next path
        }
    }

    // Return first path as default (will show error in console)
    console.error('Could not find index.html. Tried:', possiblePaths);
    return possiblePaths[0];
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        backgroundColor: '#0f1115',
        title: APP_NAME,
        icon: isDev
            ? path.join(__dirname, '..', 'build', 'icon.png')
            : path.join(process.resourcesPath || __dirname, 'icon.png'),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false, // Disable sandbox for file:// protocol to work properly
        },
        show: false,
    });

    win.once('ready-to-show', () => win.show());

    // Enable logging for debugging
    win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error('Failed to load:', validatedURL, errorCode, errorDescription);
    });

    win.webContents.on('console-message', (event, level, message) => {
        console.log('Renderer console:', message);
    });

    if (isDev) {
        win.loadURL('http://localhost:8080');
        win.webContents.openDevTools({ mode: 'detach' });
    } else {
        const indexPath = getIndexPath();
        console.log('Loading from:', indexPath);
        console.log('App path:', app.getAppPath());
        console.log('Resources path:', process.resourcesPath);

        win.loadFile(indexPath).catch((err) => {
            console.error('Failed to load index.html:', err);
            // Show error in the window
            win.loadURL(`data:text/html,<html><body style="background:#0f1115;color:white;padding:40px;font-family:system-ui;">
                <h1>Erro ao carregar a aplicação</h1>
                <p>Não foi possível encontrar o arquivo index.html</p>
                <pre>${err.message}</pre>
                <p>App Path: ${app.getAppPath()}</p>
                <p>Resources: ${process.resourcesPath}</p>
                <p>Tried: ${indexPath}</p>
            </body></html>`);
        });
    }

    // Open external links in default browser
    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        const all = BrowserWindow.getAllWindows();
        if (all.length) {
            const win = all[0];
            if (win.isMinimized()) win.restore();
            win.focus();
        }
    });

    app.whenReady().then(() => {
        createWindow();
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
