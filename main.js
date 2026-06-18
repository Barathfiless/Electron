const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const express = require('express');
const os = require('os');
const qr = require('qrcode');

let mainWindow;
let localServer;
const PORT = 5500;

// Resolve the local IP address of the PC
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    const addresses = interfaces[interfaceName];
    for (const addr of addresses) {
      if (addr.family === 'IPv4' && !addr.internal) {
        // Exclude common virtual network adapters
        if (interfaceName.toLowerCase().includes('virtual') || 
            interfaceName.toLowerCase().includes('vbox') || 
            interfaceName.toLowerCase().includes('vmware') ||
            interfaceName.toLowerCase().includes('wsl')) {
          continue;
        }
        return addr.address;
      }
    }
  }
  return '127.0.0.1'; // Fallback
}

// Start the Express local server for the Mobile Companion App and local PeerJS Server
function startMobileCompanionServer() {
  const serverApp = express();
  
  // Serve the mobile directory
  serverApp.use(express.static(path.join(__dirname, 'mobile')));
  
  localServer = serverApp.listen(PORT, '0.0.0.0', () => {
    console.log(`Mobile Companion server running on http://localhost:${PORT}`);
    console.log(`Access on same Wi-Fi via: http://${getLocalIPAddress()}:${PORT}`);
  });

  const { ExpressPeerServer } = require('peer');
  const peerServer = ExpressPeerServer(localServer, {
    path: '/'
  });
  
  serverApp.use('/peerjs', peerServer);
}

function createWindow() {
  Menu.setApplicationMenu(null); // Disable default menu and shortcut bindings like Ctrl+R

  mainWindow = new BrowserWindow({
    width: 380,
    height: 740,
    minWidth: 350,
    minHeight: 700,
    frame: false, // Frameless window for premium, custom custom window controls
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message}`);
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startMobileCompanionServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Communication Handlers
ipcMain.handle('get-connection-info', async (event, peerId) => {
  const localIP = getLocalIPAddress();
  
  // Create pairing links:
  // 1. Direct local link (for Wi-Fi)
  const localUrl = `http://${localIP}:${PORT}/?peerId=${peerId}`;
  
  // 2. Public hosted link (fallback - we point it to the local url for scanning, 
  // but if the user has deployed the mobile folder, they can change the host.
  // We make the pairing link very intuitive!)
  
  try {
    // Generate QR Code as DataURL
    const qrCodeDataUrl = await qr.toDataURL(localUrl, {
      margin: 1,
      width: 256,
      color: {
        dark: '#000000', // Pure black for Vercel monochromatic style
        light: '#FFFFFF'
      }
    });
    
    return {
      localIP,
      port: PORT,
      connectionUrl: localUrl,
      qrCode: qrCodeDataUrl
    };
  } catch (err) {
    console.error('Error generating QR Code', err);
    return {
      localIP,
      port: PORT,
      connectionUrl: localUrl,
      qrCode: ''
    };
  }
});

// Window controls IPC
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('set-orientation', (event, orientation) => {
  if (!mainWindow) return;
  if (orientation === 'landscape') {
    mainWindow.setMinimumSize(650, 350);
    mainWindow.setSize(700, 390, true);
  } else {
    mainWindow.setMinimumSize(350, 700);
    mainWindow.setSize(380, 740, true);
  }
});
