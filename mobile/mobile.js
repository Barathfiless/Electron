// ==========================================================================
// ELECTRON REMOTE CONTROL SUITE - MOBILE COMPANION LOGIC
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  
  // 1. CHOOSE DOM ELEMENTS
  const connBadge = document.getElementById('conn-badge');
  const badgeGlow = document.getElementById('badge-glow');
  const badgeText = document.getElementById('badge-text');
  const pairTargetIdLabel = document.getElementById('pair-target-id');
  const helperText = document.getElementById('helper-text');
  const btnDisconnectMobile = document.getElementById('btn-disconnect-mobile');
  
  // Guidance Tap pointers
  const tapOverlay = document.getElementById('tap-overlay');
  const tapPointer = document.getElementById('tap-pointer');
  const tapRipple = document.getElementById('tap-ripple');
  
  // Media Streaming
  const btnToggleScreen = document.getElementById('btn-toggle-screen');
  const btnToggleCamera = document.getElementById('btn-toggle-camera');
  const btnFlipCamera = document.getElementById('btn-flip-camera');
  const streamFeedback = document.getElementById('stream-feedback');
  const streamStatusText = document.getElementById('stream-status-text');
  
  // Gallery Sync
  const btnSelectPhotos = document.getElementById('btn-select-photos');
  const photoUploadInput = document.getElementById('photo-upload-input');
  const uploadProgressList = document.getElementById('upload-progress-list');
  
  // SMS Composer
  const inputSmsSender = document.getElementById('sms-sender');
  const inputSmsMessage = document.getElementById('sms-message');
  const btnSendSms = document.getElementById('btn-send-sms');
  
  // Diagnostics
  const diagBattery = document.getElementById('diag-battery');
  const diagPower = document.getElementById('diag-power');

  // 2. RETRIEVE PC PAIR TARGET ID FROM URL PARAMETERS
  const urlParams = new URLSearchParams(window.location.search);
  let targetPeerId = urlParams.get('peerId');
  
  // Get DOM elements for modal and landing screens
  const connectModal = document.getElementById('connect-modal');
  const btnAllowConnect = document.getElementById('btn-allow-connect');
  const btnDenyConnect = document.getElementById('btn-deny-connect');
  const deniedScreen = document.getElementById('denied-screen');
  
  const viewLanding = document.getElementById('view-landing');
  const btnOpenScanner = document.getElementById('btn-open-scanner');
  const btnConnectManual = document.getElementById('btn-connect-manual');
  const inputPeerCode = document.getElementById('input-peer-code');
  const qrScannerContainer = document.getElementById('qr-scanner-container');

  let pendingStream = null;
  let html5QrCodeInstance = null;

  function showConnectionPrompt(peerId) {
    targetPeerId = peerId;
    pairTargetIdLabel.textContent = targetPeerId;
    connectModal.style.display = 'flex';
  }


  // 3. SYSTEM STATE VARIABLES
  let peer = null;
  let dataConnection = null;
  let activeMediaStream = null;
  let activeMediaCall = null;
  
  let isScreenStreaming = false;
  let isCameraStreaming = false;
  let cameraFacingMode = 'environment'; // Rear camera lens default on mobile
  let batteryObj = null;
  let isManuallyDisconnected = false;

  // ==========================================================================
  // MOBILE PEERJS CLIENT & CONNECTION HANDSHAKES
  // ==========================================================================

  function initMobilePeer() {
    const mobilePeerId = 'electron-mob-' + Math.random().toString(36).substring(2, 8);
    
    // Connect to local signaling server on the same host/port as Express
    peer = new Peer(mobilePeerId, {
      host: window.location.hostname,
      port: window.location.port || 80,
      path: '/peerjs',
      debug: 1
    });

    peer.on('open', (id) => {
      console.log('Mobile Companion opened with unique ID:', id);
      connectToPC();
    });

    peer.on('error', (err) => {
      console.error('PeerJS Broker Error encountered:', err);
      updateStatusBadge(false, 'Broker Error');
    });
  }

  function connectToPC() {
    updateStatusBadge(false, 'Handshaking...');
    
    // Initiate direct P2P data connection
    dataConnection = peer.connect(targetPeerId, {
      reliable: true
    });

    setupDataChannelCallbacks(dataConnection);
  }

  function setupDataChannelCallbacks(conn) {
    conn.on('open', () => {
      console.log('WebRTC direct P2P connection to PC established successfully!');
      
      updateStatusBadge(true, 'Connected');
      enableControls(true);
      
      // Instantly capture and dispatch diagnostic battery telemetry
      initBatteryDiagnostics();
      dispatchDeviceInfo();

      // Automatically initiate screen streaming call if we have a pending stream
      if (pendingStream) {
        console.log('Initiating automated screen sharing call to PC...');
        activeMediaCall = peer.call(targetPeerId, pendingStream, {
          metadata: { type: 'screen' }
        });
        
        pendingStream.getVideoTracks()[0].addEventListener('ended', () => {
          stopMirroring();
        });
        
        pendingStream = null;
      }
    });

    conn.on('data', (data) => {
      if (!data || typeof data !== 'object') return;

      console.log('Direct command payload from PC:', data);

      switch(data.type) {
        case 'request-action':
          handleRemoteRequest(data.action, data);
          break;
          
        case 'chat-message':
          // Mock receiving messages typed on PC
          handlePCMessageReply(data.text);
          break;
          
        case 'touch-tap':
          // Remote Click Guide coordinates packet arrived!
          triggerTouchGuidancePointer(data.x, data.y);
          break;

        case 'disconnect':
          console.log('PC triggered manual disconnection.');
          isManuallyDisconnected = true;
          dataConnection.close();
          break;
          
        default:
          console.log('Unrecognized data packet arrived from PC:', data);
      }
    });

    conn.on('close', () => {
      console.warn('P2P Data Channel closed.');
      handlePCDisconnection();
      if (!isManuallyDisconnected) {
        console.warn('Attempting reconnect in 4 seconds...');
        setTimeout(connectToPC, 4000);
      } else {
        console.log('Skipping auto-reconnect due to manual disconnection.');
        viewLanding.style.display = 'flex';
        if (btnOpenScanner) btnOpenScanner.style.display = 'block';
        if (qrScannerContainer) qrScannerContainer.style.display = 'none';
        isManuallyDisconnected = false;
      }
    });

    conn.on('error', (err) => {
      console.error('Data Channel failed:', err);
      handlePCDisconnection();
    });
  }

  function handlePCDisconnection() {
    dataConnection = null;
    updateStatusBadge(false, 'Disconnected');
    enableControls(false);
    cleanupMediaStreams();
  }

  function updateStatusBadge(isConnected, customText = '') {
    if (isConnected) {
      connBadge.className = 'conn-status-badge connected';
      badgeGlow.className = 'pulse-dot green';
      badgeText.textContent = customText || 'Connected';
      helperText.textContent = 'Syncing system stats, SMS chats, and media gallery live with PC.';
      helperText.style.color = '#A0AEC0';
      if (btnDisconnectMobile) btnDisconnectMobile.style.display = 'block';
    } else {
      connBadge.className = 'conn-status-badge disconnected';
      badgeGlow.className = 'pulse-dot red';
      badgeText.textContent = customText || 'Disconnected';
      helperText.textContent = 'Establishing direct secure P2P channels. Please wait.';
      helperText.style.color = 'var(--accent-red)';
      if (btnDisconnectMobile) btnDisconnectMobile.style.display = 'none';
    }
  }

  function enableControls(isEnabled) {
    btnToggleScreen.disabled = !isEnabled;
    btnToggleCamera.disabled = !isEnabled;
    btnFlipCamera.disabled = !isEnabled || !isCameraStreaming;
    btnSelectPhotos.disabled = !isEnabled;
    btnSendSms.disabled = !isEnabled;
  }

  // ==========================================================================
  // DISPATCH TELEMETRY DIAGNOSTICS (Battery, OS info)
  // ==========================================================================

  function initBatteryDiagnostics() {
    if (navigator.getBattery) {
      navigator.getBattery().then((battery) => {
        batteryObj = battery;
        
        // Dispatch helper to PC
        sendBatteryState();
        
        // Setup state change listeners
        battery.addEventListener('levelchange', sendBatteryState);
        battery.addEventListener('chargingchange', sendBatteryState);
      });
    } else {
      diagBattery.textContent = 'N/A';
      diagPower.textContent = 'API unsupported';
    }
  }

  function sendBatteryState() {
    if (!batteryObj || !dataConnection) return;
    
    const level = batteryObj.level;
    const charging = batteryObj.charging;
    
    // Update local companion UI
    diagBattery.textContent = `${Math.round(level * 100)}%`;
    diagPower.textContent = charging ? 'Charging' : 'Discharging';
    
    // Sync telemetry to PC
    dataConnection.send({
      type: 'battery',
      level: level,
      charging: charging
    });
  }

  function dispatchDeviceInfo() {
    if (!dataConnection) return;
    
    // Resolve userAgent mock strings
    const userAgent = navigator.userAgent;
    let deviceName = 'Android Mobile';
    
    if (userAgent.match(/Android/i)) {
      const match = userAgent.match(/Android\s+([^\s;]+)/);
      deviceName = `Android ${match ? match[1] : ''} Phone`;
    }
    
    dataConnection.send({
      type: 'system-stats',
      deviceName: deviceName,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height
    });
  }

  // ==========================================================================
  // LIVE STREAM MIRRORING SERVICES
  // ==========================================================================

  async function startScreenMirroring() {
    if (isScreenStreaming || !dataConnection) return;
    
    try {
      // Trigger native Android System Screen Cast Dialogue!
      // This is supported out of the box in Chrome, Edge, and Firefox on Android!
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor', // Captures the entire Android desktop OS screen!
          logicalSurface: true
        },
        audio: false
      });
      
      activeMediaStream = stream;
      isScreenStreaming = true;
      
      // Dial media call over WebRTC, injecting screen identifiers
      activeMediaCall = peer.call(targetPeerId, stream, {
        metadata: { type: 'screen' }
      });
      
      // Configure stream closures inside Android System Cast hooks
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopMirroring();
      });

      // Update UI
      btnToggleScreen.innerHTML = 'Stop Android Screen Share';
      btnToggleScreen.className = 'btn btn-secondary';
      
      streamStatusText.textContent = 'Android Screen mirrored to PC';
      streamFeedback.style.display = 'flex';
      
      isCameraStreaming = false;
      btnToggleCamera.innerHTML = 'Stream Camera Feed';
      btnToggleCamera.className = 'btn btn-secondary';
      btnFlipCamera.disabled = true;
      
    } catch (err) {
      console.error('Failed to capture Android display stream:', err);
      alert('Screen Capture Denied or Unsupported. Please approve permission in Chrome/Android prompt.');
    }
  }

  function stopMirroring() {
    if (!isScreenStreaming) return;
    
    cleanupMediaStreams();
    
    if (dataConnection) {
      dataConnection.send({ type: 'media-ended' });
    }
    
    btnToggleScreen.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" style="margin-right:8px;"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
      Share Android Screen
    `;
    btnToggleScreen.className = 'btn btn-primary';
    streamFeedback.style.display = 'none';
    isScreenStreaming = false;
  }

  // ==========================================================================
  // REMOTE CAMERA FEED STREAMING
  // ==========================================================================

  async function startCameraStreaming() {
    if (isCameraStreaming || !dataConnection) return;
    
    try {
      // Fetch mobile camera stream
      const constraints = {
        video: {
          facingMode: cameraFacingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      activeMediaStream = stream;
      isCameraStreaming = true;
      
      // Dial P2P Media Call, injecting camera identifier
      activeMediaCall = peer.call(targetPeerId, stream, {
        metadata: { type: 'camera' }
      });
      
      // UI modifications
      btnToggleCamera.innerHTML = 'Stop Camera Feed';
      btnToggleCamera.className = 'btn btn-primary';
      btnFlipCamera.disabled = false;
      
      streamStatusText.textContent = `Live ${cameraFacingMode === 'user' ? 'Front' : 'Rear'} Camera Streaming`;
      streamFeedback.style.display = 'flex';
      
      isScreenStreaming = false;
      btnToggleScreen.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" style="margin-right:8px;"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
        Share Android Screen
      `;
      btnToggleScreen.className = 'btn btn-primary';
      
    } catch (err) {
      console.error('Camera stream access denied:', err);
      alert('Camera capture failed. Please approve browser camera permissions.');
    }
  }

  function stopCameraStreaming() {
    if (!isCameraStreaming) return;
    
    cleanupMediaStreams();
    
    if (dataConnection) {
      dataConnection.send({ type: 'media-ended' });
    }
    
    btnToggleCamera.innerHTML = 'Stream Camera Feed';
    btnToggleCamera.className = 'btn btn-secondary';
    btnFlipCamera.disabled = true;
    streamFeedback.style.display = 'none';
    isCameraStreaming = false;
  }

  async function flipCameraLens() {
    if (!isCameraStreaming) return;
    
    // Switch camera modes
    cameraFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    
    // Restart camera stream seamlessly
    cleanupMediaStreams();
    isCameraStreaming = false;
    await startCameraStreaming();
  }

  function cleanupMediaStreams() {
    if (activeMediaStream) {
      const tracks = activeMediaStream.getTracks();
      tracks.forEach(track => track.stop());
      activeMediaStream = null;
    }
    if (activeMediaCall) {
      activeMediaCall.close();
      activeMediaCall = null;
    }
  }

  // Toggle buttons
  btnToggleScreen.addEventListener('click', () => {
    if (isScreenStreaming) {
      stopMirroring();
    } else {
      startScreenMirroring();
    }
  });

  btnToggleCamera.addEventListener('click', () => {
    if (isCameraStreaming) {
      stopCameraStreaming();
    } else {
      startCameraStreaming();
    }
  });

  btnFlipCamera.addEventListener('click', flipCameraLens);

  // ==========================================================================
  // DISPATCH REMOTE GALLERY PHOTOS
  // ==========================================================================
  
  btnSelectPhotos.addEventListener('click', () => {
    photoUploadInput.click();
  });

  photoUploadInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !dataConnection) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      
      // Render simple progress card
      const progId = 'prog-' + Math.random().toString(36).substring(2, 6);
      const progCard = document.createElement('div');
      progCard.className = 'progress-item';
      progCard.id = progId;
      progCard.innerHTML = `
        <span class="name">${file.name}</span>
        <span class="status font-mono">Syncing...</span>
      `;
      uploadProgressList.appendChild(progCard);

      reader.onload = (event) => {
        const base64Data = event.target.result;
        
        // Dispatch photo over WebRTC DataChannel
        dataConnection.send({
          type: 'photo-sync',
          imgData: base64Data,
          fileName: file.name
        });

        // Update progress item
        const pCard = document.getElementById(progId);
        if (pCard) {
          pCard.querySelector('.status').className = 'status done';
          pCard.querySelector('.status').textContent = 'SYNCED';
          
          // Auto remove progress pill after 4 seconds
          setTimeout(() => pCard.remove(), 4000);
        }
      };

      reader.onerror = (err) => {
        console.error('File reading failed:', err);
        const pCard = document.getElementById(progId);
        if (pCard) pCard.querySelector('.status').textContent = 'FAILED';
      };

      // Start reading image as Base64 Data URL array
      reader.readAsDataURL(file);
    });

    // Clear input cache
    photoUploadInput.value = '';
  });

  // ==========================================================================
  // SMS SIMULATOR & P2P RECEIVERS
  // ==========================================================================

  btnSendSms.addEventListener('click', () => {
    const sender = inputSmsSender.value.trim() || 'Alexa';
    const message = inputSmsMessage.value.trim();
    
    if (!message || !dataConnection) return;

    // Send SMS packet over P2P DataChannel
    dataConnection.send({
      type: 'sms-incoming',
      contact: sender,
      message: message
    });

    // Notify uploader feedback
    inputSmsMessage.value = '';
    
    // Play custom vibration to mimic real SMS receipt
    if (navigator.vibrate) {
      navigator.vibrate(120);
    }
    
    alert('Simulated SMS packet dispatched to PC Hub!');
  });

  if (btnDisconnectMobile) {
    btnDisconnectMobile.addEventListener('click', () => {
      if (dataConnection) {
        console.log('Manually disconnecting from PC...');
        isManuallyDisconnected = true;
        dataConnection.send({ type: 'disconnect' });
        setTimeout(() => {
          dataConnection.close();
        }, 100);
      }
    });
  }

  // Handle messages written on the PC app that arrive back on the phone companion
  function handlePCMessageReply(text) {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]); // Pulse vibrate
    }
    
    // Simulate mobile alerts
    console.log(`Reply arrived from PC: "${text}"`);
    
    // Dispatch a mock notification back to PC to show loop integration
    dataConnection.send({
      type: 'notification',
      title: 'SMS Sent Confirmation',
      message: `Delivered text: "${text}" to sync network.`,
      app: 'SMS'
    });
  }

  // ==========================================================================
  // REMOTE ACTION CALLBACK HANDLERS (Called by PC clicks)
  // ==========================================================================

  function handleRemoteRequest(action, data) {
    switch(action) {
      case 'start-screen-stream':
        startScreenMirroring();
        break;
        
      case 'stop-screen-stream':
        stopMirroring();
        break;
        
      case 'sync-photos':
        // Flash notify user to select files
        alert('PC has requested photo sync. Please select photos in the next screen.');
        photoUploadInput.click();
        break;
        
      case 'change-camera-lens':
        if (data.lens && data.lens !== cameraFacingMode) {
          cameraFacingMode = data.lens;
          if (isCameraStreaming) {
            flipCameraLens();
          }
        }
        break;
        
      default:
        console.warn('Unknown Action requested by PC:', action);
    }
  }

  // ==========================================================================
  // DYNAMIC REMOTE GUIDANCE COORDINATE CLICK OVERLAY
  // ==========================================================================

  function triggerTouchGuidancePointer(xPct, yPct) {
    // Map coordinate percentages to mobile screen pixels
    const absX = xPct * window.innerWidth;
    const absY = yPct * window.innerHeight;

    console.log(`Guidance Tap coordinate captured from PC click: (${Math.round(absX)}px, ${Math.round(absY)}px)`);

    // Position pointer elements
    tapPointer.style.left = `${absX - 8}px`; // Subtract radius offsets
    tapPointer.style.top = `${absY - 8}px`;
    tapPointer.style.display = 'block';

    // Fire pulsing ripples
    tapRipple.style.left = `${absX}px`;
    tapRipple.style.top = `${absY}px`;
    tapRipple.style.display = 'block';
    tapRipple.style.animation = 'none';
    
    // Trigger layout reflow for animation reset
    void tapRipple.offsetWidth;
    tapRipple.style.animation = 'ripple-expand 0.8s ease-out';

    // Brief Android vibration on touch guide
    if (navigator.vibrate) {
      navigator.vibrate(60);
    }

    // Clear indicator after brief display
    setTimeout(() => {
      tapPointer.style.display = 'none';
      tapRipple.style.display = 'none';
    }, 2500);
  }

  // ==========================================================================
  // INITIALIZATION TRIGGER (Deferred to User Confirmation Modal)
  // ==========================================================================
  
  // Connect button listeners unconditionally
  btnAllowConnect.addEventListener('click', async () => {
    connectModal.style.display = 'none';

    // Capture stream synchronously inside the click handler to satisfy browser gesture requirements
    try {
      console.log('Attempting auto screen stream capture...');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          logicalSurface: true
        },
        audio: false
      });
      pendingStream = stream;
      activeMediaStream = stream;
      isScreenStreaming = true;

      btnToggleScreen.innerHTML = 'Stop Android Screen Share';
      btnToggleScreen.className = 'btn btn-secondary';
      streamStatusText.textContent = 'Android Screen mirrored to PC';
      streamFeedback.style.display = 'flex';
    } catch (err) {
      console.warn('Screen capture permission was declined by user or is unsupported:', err);
    }

    initMobilePeer();
  });

  btnDenyConnect.addEventListener('click', () => {
    connectModal.style.display = 'none';
    deniedScreen.style.display = 'flex';
    console.log('User denied the connection request.');
  });

  // Initialization Routing
  if (targetPeerId) {
    showConnectionPrompt(targetPeerId);
  } else {
    // Show landing screen
    viewLanding.style.display = 'flex';

    // Manual Connection click trigger
    btnConnectManual.addEventListener('click', () => {
      const code = inputPeerCode.value.trim();
      if (!code) {
        alert('Please enter a valid PC pairing code.');
        return;
      }
      viewLanding.style.display = 'none';
      showConnectionPrompt(code);
    });

    // In-app Camera QR Scanner click trigger
    btnOpenScanner.addEventListener('click', () => {
      btnOpenScanner.style.display = 'none';
      qrScannerContainer.style.display = 'block';

      // Initialize html5-qrcode
      html5QrCodeInstance = new Html5Qrcode("qr-reader");

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      html5QrCodeInstance.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          console.log(`Successfully scanned QR Code: ${decodedText}`);
          
          // Stop scanning
          html5QrCodeInstance.stop().then(() => {
            qrScannerContainer.style.display = 'none';
            viewLanding.style.display = 'none';

            // Extract peerId from QR URL
            let scannedId = decodedText;
            if (decodedText.includes('peerId=')) {
              const urlMatch = decodedText.match(/peerId=([^&]+)/);
              if (urlMatch) {
                scannedId = urlMatch[1];
              }
            }
            
            showConnectionPrompt(scannedId);
          }).catch((err) => {
            console.error("Failed to clean up scanner:", err);
            qrScannerContainer.style.display = 'none';
            viewLanding.style.display = 'none';
            showConnectionPrompt(decodedText);
          });
        },
        (errorMessage) => {
          // Frame scanner callback
        }
      ).catch((err) => {
        console.error("Camera scanner start failed:", err);
        alert("Unable to open camera. Please grant camera access permissions.");
        btnOpenScanner.style.display = 'block';
        qrScannerContainer.style.display = 'none';
      });
    });
  }
});
