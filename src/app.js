// ==========================================================================
// ELECTRON REMOTE CONTROL SUITE - PC RENDERER PROCESS LOGIC
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  
  // 1. SELECT DOM ELEMENTS
  
  // Window controls
  const btnMinimize = document.getElementById('win-minimize');
  const btnMaximize = document.getElementById('win-maximize');
  const btnClose = document.getElementById('win-close');

  // Sidebar and Tabs
  const navItems = document.querySelectorAll('.nav-item');
  const tabModules = document.querySelectorAll('.tab-module');
  const statusGlow = document.getElementById('status-glow');
  const connectionStatusText = document.getElementById('connection-status-text');

  // Pairing Elements
  const qrCodeImg = document.getElementById('qr-code-img');
  const pcPeerIdLabel = document.getElementById('pc-peer-id');
  const btnOpenDemoMobile = document.getElementById('btn-open-demo-mobile');
  const btnDisconnectDevice = document.getElementById('btn-disconnect-device');
  
  // Phone screens and navbar
  const viewPairing = document.getElementById('view-pairing');
  const viewLiveMirror = document.getElementById('view-live-mirror');
  const viewVirtualLauncher = document.getElementById('view-virtual-launcher');
  const phoneStatusBar = document.getElementById('phone-status-bar');
  const phoneNavBar = document.getElementById('phone-nav-bar');
  const phoneHomeBtn = document.getElementById('phone-home-btn');
  const phoneBackBtn = document.getElementById('phone-back-btn');
  const phoneRecentsBtn = document.getElementById('phone-recents-btn');
  const screenTimeLabel = document.getElementById('screen-time');
  const launcherClockTime = document.getElementById('launcher-clock-time');
  const launcherClockDate = document.getElementById('launcher-clock-date');

  // System Diagnostics (Dashboard Widget)
  const heroConnectionStatus = document.getElementById('hero-connection-status');
  const heroStatusDot = document.getElementById('hero-status-dot');
  const connectedPeerSub = document.getElementById('connected-peer-sub');
  
  const batteryProgressRing = document.getElementById('battery-progress-ring');
  const batteryPercentageValue = document.getElementById('battery-percentage-value');
  const batteryTemp = document.getElementById('battery-temp');
  const batteryChargingText = document.getElementById('battery-charging-text');
  
  const statusBarBatteryText = document.getElementById('status-bar-battery-text');
  const statusBarBatteryFill = document.getElementById('status-bar-battery-fill');
  const launcherBatteryText = document.getElementById('launcher-battery-text');
  
  const notificationFeed = document.getElementById('dashboard-notification-feed');
  const btnClearNotifications = document.getElementById('btn-clear-notifications');

  // Screen Mirror Tab Elements
  const mirrorVideo = document.getElementById('mirror-video');
  const mirrorTouchOverlay = document.getElementById('mirror-touch-overlay');
  const mirrorPlaceholder = document.getElementById('mirror-placeholder');
  const btnRequestMirror = document.getElementById('btn-request-mirror');
  const btnStopMirror = document.getElementById('btn-stop-mirror');
  const chkTouchIndicator = document.getElementById('chk-touch-indicator');
  const selectMirrorQuality = document.getElementById('mirror-quality');

  // Camera Tab Elements
  const cameraVideo = document.getElementById('camera-stream-video');
  const cameraPlaceholder = document.getElementById('camera-stream-placeholder');
  const selectCameraLens = document.getElementById('camera-lens-select');
  const filterPills = document.querySelectorAll('.filter-pill');
  const btnSnapshot = document.getElementById('btn-camera-snapshot');
  const btnToggleCameraGrid = document.getElementById('btn-toggle-camera-grid');

  // Gallery Tab Elements
  const desktopGalleryGrid = document.getElementById('desktop-gallery-grid');
  const galleryEmpty = document.getElementById('gallery-empty');
  const btnSyncGalleryPrompt = document.getElementById('btn-sync-gallery-prompt');
  
  // Lightbox Modal
  const photoLightbox = document.getElementById('photo-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('btn-lightbox-close');
  const lightboxDownload = document.getElementById('btn-lightbox-download');

  // Messages Tab Elements
  const chatMessagesContainer = document.getElementById('chat-messages-container');
  const chatMessageInput = document.getElementById('chat-message-input');
  const btnSendMessage = document.getElementById('btn-send-message');
  const chatThreads = document.querySelectorAll('.thread-item');

  // Launcher wall-papers configuration
  const wpPills = document.querySelectorAll('.wp-pill');
  const phoneScreenContainer = document.getElementById('phone-screen-container');

  // 2. STATE VARIABLES
  let peer = null;
  let activePeerId = '';
  let activeConnection = null; // WebRTC P2P DataChannel
  let activeMediaCall = null;  // WebRTC Screen/Camera Call
  let connectionInfo = null;   // Stored QR code/port info
  let notificationCount = 0;

  // Mock static gallery database to display visually stunning cards on initial load
  const initialPhotos = [];

  // ==========================================================================
  // WINDOW MANAGEMENT INTERACTION
  // ==========================================================================
  if (btnMinimize && btnMaximize && btnClose) {
    btnMinimize.addEventListener('click', () => window.electronAPI.minimize());
    btnMaximize.addEventListener('click', () => window.electronAPI.maximize());
    btnClose.addEventListener('click', () => window.electronAPI.close());
  }

  // Rotate phone orientation controls
  const btnRotatePhone = document.getElementById('btn-rotate-phone');
  let isLandscape = false;
  if (btnRotatePhone) {
    btnRotatePhone.addEventListener('click', () => {
      isLandscape = !isLandscape;
      if (isLandscape) {
        document.body.classList.add('landscape');
        window.electronAPI.setOrientation('landscape');
      } else {
        document.body.classList.remove('landscape');
        window.electronAPI.setOrientation('portrait');
      }
    });

    // Add Ctrl+R keyboard shortcut to trigger rotation
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        btnRotatePhone.click();
      }
    });
  }

  // ==========================================================================
  // TOP CONTROLS: THEME SWITCHING & REFRESH HANDLERS
  // ==========================================================================
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeIconDark = document.getElementById('theme-icon-dark');
  const themeIconLight = document.getElementById('theme-icon-light');
  const btnAppRefresh = document.getElementById('btn-app-refresh');

  if (btnThemeToggle && themeIconDark && themeIconLight) {
    // Sync default or stored preference
    const storedTheme = localStorage.getItem('app-theme') || 'dark';
    if (storedTheme === 'light') {
      document.body.classList.add('light-theme');
      themeIconDark.style.display = 'none';
      themeIconLight.style.display = 'block';
    }

    btnThemeToggle.addEventListener('click', () => {
      if (document.body.classList.contains('light-theme')) {
        document.body.classList.remove('light-theme');
        themeIconDark.style.display = 'block';
        themeIconLight.style.display = 'none';
        localStorage.setItem('app-theme', 'dark');
      } else {
        document.body.classList.add('light-theme');
        themeIconDark.style.display = 'none';
        themeIconLight.style.display = 'block';
        localStorage.setItem('app-theme', 'light');
      }
    });
  }
  if (btnAppRefresh) {
    btnAppRefresh.addEventListener('click', () => {
      // Reload renderer process
      window.location.reload();
    });
  }

  if (btnDisconnectDevice) {
    btnDisconnectDevice.addEventListener('click', () => {
      if (activeConnection) {
        console.log('Manually closing P2P connection to mobile...');
        activeConnection.send({ type: 'disconnect' });
        setTimeout(() => {
          activeConnection.close();
        }, 100);
      }
    });
  }

  // ==========================================================================
  // SIDEBAR NAVIGATION & THEME SWITCHERS
  // ==========================================================================
  
  function switchTab(tabId) {
    // Update navigation menu active state
    navItems.forEach(item => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Toggle showing standard modules
    tabModules.forEach(module => {
      if (module.id === `module-${tabId}`) {
        module.classList.add('active');
      } else {
        module.classList.remove('active');
      }
    });

    // Update Simulated Phone Display view based on active tab
    if (peer && activeConnection) {
      if (tabId === 'mirror') {
        showScreenView('view-live-mirror');
      } else if (tabId === 'camera') {
        showScreenView('view-live-mirror'); // Custom overlay can route camera feeds inside the smartphone bezel!
        if (cameraVideo.srcObject) {
          mirrorVideo.srcObject = cameraVideo.srcObject;
          mirrorPlaceholder.style.display = 'none';
        }
      } else {
        showScreenView('view-virtual-launcher');
      }
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Handle click on Virtual Phone apps to synchronize switching tabs on the PC
  document.querySelectorAll('.launcher-app').forEach(app => {
    app.addEventListener('click', () => {
      const targetTab = app.getAttribute('data-target');
      switchTab(targetTab);
    });
  });

  function showScreenView(viewId) {
    const views = ['view-pairing', 'view-live-mirror', 'view-virtual-launcher'];
    views.forEach(v => {
      const el = document.getElementById(v);
      if (v === viewId) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  // Handle Home Button inside Phone Screen Bezel
  if (phoneHomeBtn) {
    phoneHomeBtn.addEventListener('click', () => {
      if (activeConnection) {
        showScreenView('view-virtual-launcher');
        switchTab('dashboard');
      }
    });
  }

  // Sync virtual wallpapers
  wpPills.forEach(pill => {
    pill.addEventListener('click', () => {
      wpPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      
      const themeName = pill.getAttribute('data-wp');
      if (themeName === 'wp-neon') {
        phoneScreenContainer.style.background = 'var(--wp-neon)';
      } else if (themeName === 'wp-dark') {
        phoneScreenContainer.style.background = 'var(--wp-dark)';
      } else if (themeName === 'wp-glass') {
        phoneScreenContainer.style.background = 'var(--wp-glass)';
      }
    });
  });

  // Update clocks every second
  function updateClocks() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // key '0' to '12'
    const formattedHours = String(hours).padStart(2, '0');
    
    const timeStr = `${formattedHours}:${minutes}`;
    
    if (screenTimeLabel) screenTimeLabel.textContent = timeStr;
    if (launcherClockTime) launcherClockTime.textContent = timeStr;
    if (launcherClockTime) launcherClockTime.innerHTML = `${formattedHours}:${minutes}<span class="widget-clock-ampm">${ampm}</span>`;
    
    // Formatting date
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', options);
    if (launcherClockDate) launcherClockDate.textContent = dateStr;
  }
  
  setInterval(updateClocks, 1000);
  updateClocks();

  // ==========================================================================
  // WEBRTC CONNECTION - INITIALIZE PEERJS CLIENT
  // ==========================================================================
  
  function initPeerJS() {
    // Generate a secure, readable unique Peer ID for this PC receiver instance
    const uniqueId = 'electron-pc-' + Math.random().toString(36).substring(2, 8);
    activePeerId = uniqueId;
    
    // Connect to PeerJS public secure signaling cloud
    // This provides automatic NAT traversal, allowing connections over different internet bands
    peer = new Peer(uniqueId, {
      host: 'localhost',
      port: 5500,
      path: '/peerjs',
      debug: 1 // Print warnings and errors only
    });

    peer.on('open', (id) => {
      console.log('PeerJS client opened with unique ID:', id);
      pcPeerIdLabel.textContent = id;
      
      // Query local network adapter configurations and pairing codes from main process
      window.electronAPI.getConnectionInfo(id).then(info => {
        connectionInfo = info;
        qrCodeImg.src = info.qrCode;
        
        // Setup direct click button for seamless desktop testing
        btnOpenDemoMobile.onclick = () => {
          // Open URL in external browser
          window.open(info.connectionUrl);
        };
      });
    });

    // Handle Peer Server Disconnections
    peer.on('disconnected', () => {
      console.warn('Disconnected from PeerJS Cloud Signaling. Reconnecting...');
      peer.reconnect();
    });

    peer.on('error', (err) => {
      console.error('PeerJS client error encountered:', err);
      statusGlow.className = 'pulse-dot red';
      connectionStatusText.textContent = 'Broker Error';
    });

    // 1. DATA CHANNEL PAIRING HANDSHAKE (Receive Text, Synced diagnostics, battery, files)
    peer.on('connection', (conn) => {
      console.log('Incoming direct peer connection established:', conn.peer);
      
      activeConnection = conn;
      setupDataChannelCallbacks(conn);
    });

    // 2. MEDIA STREAM TRANSRECEIVER (Receive Video Screen Mirrs / Camera feeds)
    peer.on('call', (call) => {
      console.log('Incoming media track stream call registered:', call.peer);
      activeMediaCall = call;
      
      // Auto-answer the call with empty video tracks, as PC is only a viewer/receiver
      call.answer();
      
      call.on('stream', (remoteStream) => {
        console.log('Attaching active WebRTC media feed to viewports.');
        
        // Determine whether this stream belongs to Screen Mirroring or Live Camera
        // We look at the metadata details injected during call establishment, or routing variables
        const streamType = call.metadata && call.metadata.type ? call.metadata.type : 'screen';
        
        if (streamType === 'camera') {
          cameraVideo.srcObject = remoteStream;
          cameraPlaceholder.style.display = 'none';
          
          // Switch PC tab to camera to demonstrate feed
          switchTab('camera');
        } else {
          mirrorVideo.srcObject = remoteStream;
          mirrorPlaceholder.style.display = 'none';
          btnStopMirror.disabled = false;
          btnRequestMirror.disabled = true;
          
          // Switch PC tab to mirroring view
          switchTab('mirror');
        }
      });

      call.on('close', () => {
        cleanupMediaStreams();
      });
      
      call.on('error', (err) => {
        console.error('Active media track crashed:', err);
        cleanupMediaStreams();
      });
    });
  }

  function setupDataChannelCallbacks(conn) {
    conn.on('open', () => {
      console.log('WebRTC P2P Data channel fully opened and synced!');
      
      // Update general app status indicators
      statusGlow.className = 'pulse-dot green';
      connectionStatusText.textContent = 'Connected';
      
      heroStatusDot.className = 'pulse-dot green';
      heroConnectionStatus.textContent = 'Connected';
      connectedPeerSub.textContent = `P2P ID: ${conn.peer}`;
      
      // Hide Pairing QR screen, slide in Simulated Launcher screen!
      showScreenView('view-virtual-launcher');
      phoneStatusBar.style.display = 'flex';
      phoneNavBar.style.display = 'flex';
      if (btnDisconnectDevice) btnDisconnectDevice.style.display = 'inline-flex';
      
      // Trigger a desktop notification using native APIs
      new Notification('Electron Connected', {
        body: 'Mobile companion has successfully paired over P2P WebRTC!',
        silent: false
      });
      
      // Clear recent notifications drawer
      notificationFeed.innerHTML = '';
      notificationCount = 0;
    });

    conn.on('data', (data) => {
      // Decode data packets
      if (!data || typeof data !== 'object') return;

      switch(data.type) {
        case 'battery':
          updateBatteryUI(data.level, data.charging);
          break;
          
        case 'system-stats':
          // Update device brand/storage details
          if (data.deviceName) {
            document.querySelector('.device-brand').textContent = data.deviceName;
          }
          break;
          
        case 'sms-incoming':
          handleIncomingSMS(data.contact, data.message);
          break;
          
        case 'notification':
          addNotificationToDrawer(data.title, data.message, data.app);
          break;
          
        case 'photo-sync':
          addPhotoToGallery(data.imgData, data.fileName || 'synced_photo.jpg');
          break;

        case 'media-ended':
          console.log('Mobile triggered camera/screen stream shutdown.');
          cleanupMediaStreams();
          break;

        case 'disconnect':
          console.log('Mobile triggered manual disconnection.');
          activeConnection.close();
          break;
          
        default:
          console.log('Unknown P2P Data Packet arrived:', data);
      }
    });

    conn.on('close', () => {
      console.log('P2P connection was closed by the remote peer.');
      handlePeerDisconnection();
    });
    
    conn.on('error', (err) => {
      console.error('Data Channel failed:', err);
      handlePeerDisconnection();
    });
  }

  function handlePeerDisconnection() {
    activeConnection = null;
    statusGlow.className = 'pulse-dot red';
    connectionStatusText.textContent = 'Offline';
    
    heroStatusDot.className = 'pulse-dot red';
    heroConnectionStatus.textContent = 'Disconnected';
    connectedPeerSub.textContent = 'ID: Disconnected';
    
    // Switch phone screen back to scanner code
    showScreenView('view-pairing');
    phoneStatusBar.style.display = 'none';
    phoneNavBar.style.display = 'none';
    if (btnDisconnectDevice) btnDisconnectDevice.style.display = 'none';
    
    cleanupMediaStreams();
    switchTab('dashboard');
  }

  function cleanupMediaStreams() {
    if (mirrorVideo.srcObject) {
      const tracks = mirrorVideo.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      mirrorVideo.srcObject = null;
    }
    if (cameraVideo.srcObject) {
      const tracks = cameraVideo.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      cameraVideo.srcObject = null;
    }
    
    mirrorPlaceholder.style.display = 'flex';
    cameraPlaceholder.style.display = 'flex';
    btnStopMirror.disabled = true;
    btnRequestMirror.disabled = false;
    
    if (activeMediaCall) {
      activeMediaCall.close();
      activeMediaCall = null;
    }
  }

  // ==========================================================================
  // CORE UI DATA DISPATCHERS & RECEIVERS
  // ==========================================================================

  // Update battery percentage rings & texts
  function updateBatteryUI(level, charging) {
    const pct = Math.round(level * 100);
    
    // Text overlays
    if (batteryPercentageValue) batteryPercentageValue.textContent = `${pct}%`;
    if (statusBarBatteryText) statusBarBatteryText.textContent = `${pct}%`;
    if (launcherBatteryText) launcherBatteryText.textContent = `${pct}%`;
    
    // Battery fills
    if (statusBarBatteryFill) {
      statusBarBatteryFill.style.width = `${pct}%`;
      statusBarBatteryFill.style.backgroundColor = pct <= 20 ? 'var(--accent-red)' : 'var(--accent-green)';
    }
    
    // Battery circular ring animations
    if (batteryProgressRing) {
      // Circumference = 2 * pi * r = 2 * 3.1415 * 40 = 251.2
      const strokeOffset = 251.2 - (251.2 * pct) / 100;
      batteryProgressRing.style.strokeDashoffset = strokeOffset;
      
      // Color shifts
      if (pct <= 20) {
        batteryProgressRing.style.stroke = 'var(--accent-red)';
      } else if (pct <= 50) {
        batteryProgressRing.style.stroke = 'var(--accent-orange)';
      } else {
        batteryProgressRing.style.stroke = 'var(--accent-green)';
      }
    }

    if (batteryChargingText) {
      batteryChargingText.textContent = charging ? 'Charging' : 'Discharging';
      batteryChargingText.style.color = charging ? 'var(--accent-green)' : 'var(--text-muted)';
    }
  }

  // Renders a high-fidelity synced photo block into the Media Gallery
  function addPhotoToGallery(imgData, fileName) {
    // Hide empty gallery illustration
    if (galleryEmpty) galleryEmpty.style.display = 'none';
    if (desktopGalleryGrid) desktopGalleryGrid.style.display = 'grid';
    
    // Create masonry gallery card
    const card = document.createElement('div');
    card.className = 'gallery-card';
    
    card.innerHTML = `
      <img src="${imgData}" alt="${fileName}">
      <div class="gallery-card-overlay">
        <span>${fileName.substring(0, 16)}...</span>
        <div class="gallery-download-icon">↓</div>
      </div>
    `;
    
    // Click photo to show gorgeous fullscreen viewer Modal (Lightbox)
    card.addEventListener('click', () => {
      lightboxImg.src = imgData;
      lightboxDownload.href = imgData;
      lightboxDownload.download = fileName;
      photoLightbox.style.display = 'flex';
    });
    
    // Append to start of grid
    desktopGalleryGrid.insertBefore(card, desktopGalleryGrid.firstChild);
    
    // Also inject a dynamic notification card to notify the user in recent items
    addNotificationToDrawer('New Photo Synced', `Received gallery file "${fileName}"`, 'Gallery');
  }

  // Lightbox closure hooks
  if (lightboxClose && photoLightbox) {
    lightboxClose.addEventListener('click', () => {
      photoLightbox.style.display = 'none';
    });
  }

  // Sync Gallery trigger button
  if (btnSyncGalleryPrompt) {
    btnSyncGalleryPrompt.addEventListener('click', () => {
      if (activeConnection) {
        activeConnection.send({
          type: 'request-action',
          action: 'sync-photos'
        });
      } else {
        alert('Please connect a device first.');
      }
    });
  }

  // Renders custom alert toasts and feeds from the Phone
  function addNotificationToDrawer(title, message, appName = 'System') {
    notificationCount++;
    
    // Remove placeholder
    const emptyPlc = document.querySelector('.empty-feed-placeholder');
    if (emptyPlc) emptyPlc.remove();
    
    const card = document.createElement('div');
    card.className = 'notification-card';
    
    // Accent colors based on App Syncs
    let appColor = 'var(--grad-primary)';
    if (appName.toLowerCase().includes('gallery')) appColor = 'var(--grad-green)';
    if (appName.toLowerCase().includes('sms') || appName.toLowerCase().includes('message')) appColor = 'var(--grad-indigo)';
    if (appName.toLowerCase().includes('camera')) appColor = 'var(--grad-pink)';

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    card.innerHTML = `
      <div class="notification-app-icon" style="background: ${appColor}">${appName.substring(0,2).toUpperCase()}</div>
      <div class="notification-body">
        <div class="notification-title-row">
          <span class="notification-title">${title}</span>
          <span class="notification-time">${timeStr}</span>
        </div>
        <span class="notification-text">${message}</span>
      </div>
    `;

    // Prepend to feed
    notificationFeed.insertBefore(card, notificationFeed.firstChild);

    // If notifications tab isn't open, push a window notification
    if (peer && activeConnection) {
      new Notification(title, {
        body: `${appName}: ${message}`,
        silent: true
      });
    }
  }

  if (btnClearNotifications) {
    btnClearNotifications.addEventListener('click', () => {
      notificationFeed.innerHTML = `
        <div class="empty-feed-placeholder">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <p>No new notifications</p>
          <span>Incoming notifications from your phone will show here in real-time.</span>
        </div>
      `;
      notificationCount = 0;
    });
  }

  // ==========================================================================
  // CHAT MESSAGING CONTROLS
  // ==========================================================================
  
  function sendMessage() {
    const text = chatMessageInput.value.trim();
    if (!text) return;

    // 1. Render message locally immediately as 'sent' bubble
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble sent';
    bubble.innerHTML = `<p>${text}</p><span class="time">${timeStr}</span>`;
    
    chatMessagesContainer.appendChild(bubble);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    
    // Clear Input
    chatMessageInput.value = '';

    // 2. Dispatch the text packet over WebRTC P2P to the mobile companion
    if (activeConnection) {
      activeConnection.send({
        type: 'chat-message',
        text: text,
        time: timeStr
      });
    } else {
      // Simulated response if offline
      setTimeout(() => {
        const replyBubble = document.createElement('div');
        replyBubble.className = 'msg-bubble received';
        replyBubble.innerHTML = `<p>Message queued. Connect a physical Android phone via P2P QR Code to transmit actual SMS text packets.</p><span class="time">${timeStr}</span>`;
        chatMessagesContainer.appendChild(replyBubble);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
      }, 800);
    }
  }

  if (btnSendMessage) {
    btnSendMessage.addEventListener('click', sendMessage);
  }
  
  if (chatMessageInput) {
    chatMessageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  // Handle incoming P2P chat threads
  function handleIncomingSMS(contact, messageText) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble received';
    bubble.innerHTML = `<p>${messageText}</p><span class="time">${timeStr}</span>`;
    
    chatMessagesContainer.appendChild(bubble);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    
    // Update thread preview item
    const AlexaThread = document.querySelector('.thread-item[data-contact="Alexa"]');
    if (AlexaThread) {
      AlexaThread.querySelector('.preview-text').textContent = messageText;
      AlexaThread.querySelector('.time').textContent = 'Just Now';
    }

    addNotificationToDrawer(`Message from ${contact}`, messageText, 'SMS');
  }

  // ==========================================================================
  // DIRECT TOUCH GUIDE REMOTE COORDINATE CLICK TRANSCEIVER
  // ==========================================================================
  
  if (mirrorTouchOverlay) {
    mirrorTouchOverlay.addEventListener('click', (e) => {
      if (!activeConnection || !chkTouchIndicator.checked) return;

      // Extract client margins
      const rect = mirrorTouchOverlay.getBoundingClientRect();
      const xPx = e.clientX - rect.left;
      const yPx = e.clientY - rect.top;

      // Convert to percentages (0.0 to 1.0) so it translates identically regardless of device screen scale
      const xPct = xPx / rect.width;
      const yPct = yPx / rect.height;

      console.log(`Sending click coordinates back to Mobile Phone: (${Math.round(xPct*100)}%, ${Math.round(yPct*100)}%)`);

      // Dispatch WebRTC Touch packets
      activeConnection.send({
        type: 'touch-tap',
        x: xPct,
        y: yPct
      });
    });
  }

  // ==========================================================================
  // LIVE STREAM MIRROR CONTROLS
  // ==========================================================================
  
  if (btnRequestMirror) {
    btnRequestMirror.addEventListener('click', () => {
      if (activeConnection) {
        // Send a request to the mobile device to start screen sharing
        activeConnection.send({
          type: 'request-action',
          action: 'start-screen-stream'
        });
      } else {
        alert('Please connect your Android phone first using the QR Code.');
      }
    });
  }

  if (btnStopMirror) {
    btnStopMirror.addEventListener('click', () => {
      if (activeConnection) {
        activeConnection.send({
          type: 'request-action',
          action: 'stop-screen-stream'
        });
      }
      cleanupMediaStreams();
    });
  }

  // Camera lens changer
  if (selectCameraLens) {
    selectCameraLens.addEventListener('change', () => {
      if (activeConnection) {
        activeConnection.send({
          type: 'request-action',
          action: 'change-camera-lens',
          lens: selectCameraLens.value
        });
      }
    });
  }

  // Camera filters toggle
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const filterName = pill.getAttribute('data-filter');
      cameraVideo.className = '';
      if (filterName !== 'none') {
        cameraVideo.classList.add(filterName);
      }
    });
  });

  // Take Camera snapshot
  if (btnSnapshot) {
    btnSnapshot.addEventListener('click', () => {
      if (!cameraVideo.srcObject) {
        alert('No camera feed available. Please start the camera stream in the companion app.');
        return;
      }

      // Create a capture canvas
      const canvas = document.createElement('canvas');
      canvas.width = cameraVideo.videoWidth || 640;
      canvas.height = cameraVideo.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      
      // Apply filters if checked
      const activeFilter = document.querySelector('.filter-pill.active').getAttribute('data-filter');
      if (activeFilter === 'grayscale') {
        ctx.filter = 'grayscale(100%)';
      } else if (activeFilter === 'sepia') {
        ctx.filter = 'sepia(85%)';
      } else if (activeFilter === 'hue') {
        ctx.filter = 'hue-rotate(90deg) saturate(150%)';
      }

      ctx.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64 Data URL and add to gallery!
      const imgDataUrl = canvas.toDataURL('image/jpeg');
      const stamp = new Date().getTime();
      
      addPhotoToGallery(imgDataUrl, `snapshot_${stamp}.jpg`);
      
      // Open gallery tab automatically
      switchTab('gallery');
    });
  }

  // Grid Lines overlay on camera view
  let isGridVisible = false;
  if (btnToggleCameraGrid) {
    btnToggleCameraGrid.addEventListener('click', () => {
      isGridVisible = !isGridVisible;
      
      let gridOverlay = document.getElementById('camera-grid-overlay');
      if (isGridVisible) {
        if (!gridOverlay) {
          gridOverlay = document.createElement('div');
          gridOverlay.id = 'camera-grid-overlay';
          gridOverlay.style.position = 'absolute';
          gridOverlay.style.top = '0';
          gridOverlay.style.left = '0';
          gridOverlay.style.width = '100%';
          gridOverlay.style.height = '100%';
          gridOverlay.style.pointerEvents = 'none';
          gridOverlay.style.display = 'grid';
          gridOverlay.style.gridTemplateColumns = 'repeat(3, 1fr)';
          gridOverlay.style.gridTemplateRows = 'repeat(3, 1fr)';
          gridOverlay.style.border = '1px solid rgba(255, 255, 255, 0.1)';
          
          for (let i = 0; i < 9; i++) {
            const gridCell = document.createElement('div');
            gridCell.style.border = '1px dashed rgba(255, 255, 255, 0.15)';
            gridOverlay.appendChild(gridCell);
          }
          cameraVideo.parentNode.appendChild(gridOverlay);
        } else {
          gridOverlay.style.display = 'grid';
        }
        btnToggleCameraGrid.classList.add('active');
        btnToggleCameraGrid.style.backgroundColor = 'var(--accent-indigo)';
      } else {
        if (gridOverlay) gridOverlay.style.display = 'none';
        btnToggleCameraGrid.classList.remove('active');
        btnToggleCameraGrid.style.backgroundColor = '';
      }
    });
  }

  // ==========================================================================
  // INITIALIZATION TRIGGER
  // ==========================================================================
  initPeerJS();
});
