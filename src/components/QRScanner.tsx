import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import '../styles/QRScanner.css';

interface QRScannerProps {
  onScan: (tableNumber: number) => void;
}

export default function QRScanner({ onScan }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualTable, setManualTable] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader';

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.log('Scanner cleanup:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setCameraStarting(false);
  };

  const startScanning = async () => {
    setError(null);
    setCameraStarting(true);

    try {
      // Create scanner instance
      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;

      // Get available cameras
      const cameras = await Html5Qrcode.getCameras();
      console.log('📷 Available cameras:', cameras);

      if (!cameras || cameras.length === 0) {
        throw new Error('No cameras found');
      }

      // Prefer back camera for QR scanning
      let cameraId = cameras[0].id;
      const backCamera = cameras.find(cam => 
        cam.label.toLowerCase().includes('back') || 
        cam.label.toLowerCase().includes('rear') ||
        cam.label.toLowerCase().includes('environment')
      );
      if (backCamera) {
        cameraId = backCamera.id;
      }

      setIsScanning(true);
      setCameraStarting(false);

      // Start scanning
      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          console.log('✅ QR Scanned:', decodedText);
          handleQRResult(decodedText);
        },
        () => {
          // QR code not found in frame - ignore
        }
      );

      console.log('📷 Camera started successfully');

    } catch (err: any) {
      console.error('❌ Camera error:', err);
      setCameraStarting(false);
      setIsScanning(false);
      
      let errorMessage = 'Unable to access camera.';
      
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (err.name === 'NotFoundError' || err.message?.includes('No cameras')) {
        errorMessage = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another app.';
      } else if (err.message?.includes('SSL') || err.message?.includes('secure')) {
        errorMessage = 'Camera requires HTTPS. Please use secure connection.';
      }
      
      setError(errorMessage);
      setShowManual(true);
    }
  };

  const handleQRResult = async (result: string) => {
    await stopScanning();
    
    console.log('🔍 Parsing QR result:', result);
    
    let tableNumber: number | null = null;
    
    // Parse different QR formats
    if (result.includes('FOODFRIEND-TABLE-')) {
      tableNumber = parseInt(result.split('FOODFRIEND-TABLE-')[1], 10);
    } else if (result.includes('TABLE-')) {
      tableNumber = parseInt(result.split('TABLE-')[1], 10);
    } else if (result.includes('table=')) {
      tableNumber = parseInt(result.split('table=')[1], 10);
    } else {
      // Try parsing as plain number
      tableNumber = parseInt(result.trim(), 10);
    }

    console.log('📋 Extracted table number:', tableNumber);

    if (tableNumber && !isNaN(tableNumber) && tableNumber > 0 && tableNumber <= 100) {
      onScan(tableNumber);
    } else {
      setError('Invalid QR code format. Please scan a valid table QR code.');
      setShowManual(true);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tableNum = parseInt(manualTable, 10);
    
    if (tableNum && tableNum > 0 && tableNum <= 100) {
      onScan(tableNum);
    } else {
      setError('Please enter a valid table number (1-100)');
    }
  };

  return (
    <div className="qr-scanner-container">
      <div className="qr-scanner-header">
        <div className="logo-icon">🍕</div>
        <h1>Food Friend</h1>
        <p>Scan the QR code on your table to start ordering</p>
      </div>

      <div className="scanner-area">
        {/* QR Reader Container - Always present for html5-qrcode */}
        <div 
          id={scannerContainerId} 
          className="qr-reader"
          style={{ display: isScanning ? 'block' : 'none' }}
        ></div>

        {/* Initial State - Show Scan Button */}
        {!isScanning && !showManual && !cameraStarting && (
          <div className="scanner-placeholder">
            <div className="scan-icon">📷</div>
            
            <button className="scan-button" onClick={startScanning}>
              <span className="button-icon">📱</span>
              Scan Table QR Code
            </button>
            
            <button className="manual-button" onClick={() => setShowManual(true)}>
              Enter Table Number Manually
            </button>
          </div>
        )}

        {/* Camera Starting State */}
        {cameraStarting && (
          <div className="scanner-placeholder">
            <div className="loading-camera">
              <div className="camera-spinner"></div>
              <p>Starting camera...</p>
              <p className="camera-hint">Please allow camera access when prompted</p>
            </div>
          </div>
        )}

        {/* Scanning State - Show overlay */}
        {isScanning && (
          <div className="scanner-active">
            <div className="scanner-overlay">
              <div className="scanner-frame">
                <div className="corner top-left"></div>
                <div className="corner top-right"></div>
                <div className="corner bottom-left"></div>
                <div className="corner bottom-right"></div>
                <div className="scan-line"></div>
              </div>
            </div>
            <p className="scan-instruction">Point camera at table QR code</p>
            <button className="cancel-button" onClick={stopScanning}>
              Cancel
            </button>
          </div>
        )}

        {/* Manual Entry State */}
        {showManual && !isScanning && !cameraStarting && (
          <div className="manual-entry">
            <div className="manual-icon">🔢</div>
            <h3>Enter Table Number</h3>
            <form onSubmit={handleManualSubmit}>
              <input
                type="number"
                min="1"
                max="100"
                value={manualTable}
                onChange={(e) => setManualTable(e.target.value)}
                placeholder="Table Number (1-100)"
                className="table-input"
                autoFocus
              />
              <button type="submit" className="submit-button">
                Start Ordering
              </button>
            </form>
            <button 
              className="back-to-scan" 
              onClick={() => {
                setShowManual(false);
                setError(null);
              }}
            >
              ← Back to Scanner
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}
      </div>

      <div className="qr-scanner-footer">
        <p>🔒 Secure ordering • No app download required</p>
      </div>
    </div>
  );
}
