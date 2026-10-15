import { useState, useEffect, useRef, useCallback } from 'react';
import supabase from '../supabase';
import { sendStockChangeNotification } from './notificationService';
import Swal from 'sweetalert2';
import { Html5Qrcode } from 'html5-qrcode';

const BARCODE_MAP_KEY = 'inventory_barcode_mappings_v1';
const RECENT_SCANS_KEY = 'inventory_recent_scans_v1';

// Web Audio API beep sound generator
export const playBeep = (type = 'success') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz A5 note
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    }
  } catch (err) {
    console.warn('Audio feedback failed:', err);
  }
};

// Haptic vibration feedback
export const triggerHaptic = (pattern = [80]) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch (_) {}
};

export function useScannerLogic() {
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [activeItem, setActiveItem] = useState(null);
  const [scanMode, setScanMode] = useState('inspect'); // 'inspect' | 'increment' | 'decrement'
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [unrecognizedBarcode, setUnrecognizedBarcode] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [recentScans, setRecentScans] = useState(() => {
    try {
      const stored = localStorage.getItem(RECENT_SCANS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });

  const [barcodeMappings, setBarcodeMappings] = useState(() => {
    try {
      const stored = localStorage.getItem(BARCODE_MAP_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (_) {
      return {};
    }
  });

  const [availableCameras, setAvailableCameras] = useState([]);
  const [currentCameraId, setCurrentCameraId] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [editQty, setEditQty] = useState(0);
  const [isUpdatingDb, setIsUpdatingDb] = useState(false);
  const [scanFeedbackMsg, setScanFeedbackMsg] = useState(null);

  const html5QrCodeRef = useRef(null);
  const isProcessingScanRef = useRef(false);
  const scanModeRef = useRef(scanMode);
  scanModeRef.current = scanMode;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const mappingsRef = useRef(barcodeMappings);
  mappingsRef.current = barcodeMappings;

  // 1. Fetch Items from Supabase & Subscribe to Realtime
  const fetchItems = useCallback(async () => {
    try {
      setLoadingItems(true);
      const { data, error } = await supabase.from('items').select('*').order('id', { ascending: true });
      if (error) throw error;
      if (data) {
        setItems(data);
        // If activeItem is set, refresh its data
        setActiveItem(prev => {
          if (!prev) return null;
          const fresh = data.find(i => i.id === prev.id);
          if (fresh) {
            setEditQty(Number(fresh.quantity) || 0);
            return fresh;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Error fetching inventory items:', err);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel('scanner-items-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        fetchItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems]);

  // Persist barcode mappings
  const saveBarcodeMapping = (barcode, itemId) => {
    const updated = { ...barcodeMappings, [String(barcode).trim()]: itemId };
    setBarcodeMappings(updated);
    try {
      localStorage.setItem(BARCODE_MAP_KEY, JSON.stringify(updated));
    } catch (_) {}
  };

  // Add to Recent Scans
  const recordRecentScan = (item, oldQty, newQty, deltaText) => {
    const newEntry = {
      id: `${item.id}-${Date.now()}`,
      itemId: item.id,
      name: item.name,
      oldQty,
      newQty,
      deltaText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setRecentScans(prev => {
      const updated = [newEntry, ...prev.slice(0, 19)];
      try {
        localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  // 2. Modify Inventory Count Directly in Supabase
  const updateInventoryInDb = async (item, newQuantity, deltaDesc = null) => {
    if (!item) return false;
    const validQty = Math.max(0, parseInt(newQuantity, 10) || 0);
    const unitPrice = Number(item.price) || 0;
    const newTotalPrice = validQty * unitPrice;
    const newStatus = validQty < 20 ? 'OUT' : validQty < 30 ? 'LOW' : 'STOCKED';
    const oldQty = Number(item.quantity) || 0;

    setIsUpdatingDb(true);
    try {
      const { data, error } = await supabase
        .from('items')
        .update({
          quantity: validQty,
          total_price: newTotalPrice
        })
        .eq('id', item.id)
        .select();

      if (error) throw error;

      const updated = {
        ...item,
        quantity: validQty,
        total_price: newTotalPrice,
        status: newStatus
      };

      setActiveItem(updated);
      setEditQty(validQty);
      setItems(prev => prev.map(x => x.id === item.id ? updated : x));

      const delta = validQty - oldQty;
      const desc = deltaDesc || (delta > 0 ? `+${delta}` : `${delta}`);
      recordRecentScan(item, oldQty, validQty, desc);

      // Trigger outside-app/local notification
      sendStockChangeNotification(
        '🔄 Stock Updated via Scanner',
        `"${item.name}" quantity modified from ${oldQty} to ${validQty}.`
      );

      return true;
    } catch (err) {
      console.error('Failed to update DB inventory:', err);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.message || 'Unable to update inventory count in database.',
        toast: true,
        position: 'top',
        timer: 3000,
        showConfirmButton: false
      });
      return false;
    } finally {
      setIsUpdatingDb(false);
    }
  };

  // Find Product Match from Barcode Text
  const resolveProductFromBarcode = (decodedText) => {
    const rawCode = String(decodedText).trim();
    if (!rawCode) return null;

    const currentItems = itemsRef.current;
    const currentMappings = mappingsRef.current;

    // 1. Check custom mapped barcodes
    if (currentMappings[rawCode]) {
      const mappedId = currentMappings[rawCode];
      const found = currentItems.find(i => String(i.id) === String(mappedId));
      if (found) return found;
    }

    // 2. Check direct ID match (e.g. barcode is "1", "9", "ITEM-1", "ID: 1")
    const cleanId = rawCode.replace(/^(item|id|prod)[-_:\s]*/i, '').trim();
    const idMatch = currentItems.find(i => String(i.id) === cleanId || String(i.id) === rawCode);
    if (idMatch) return idMatch;

    // 3. Check exact or close Name match
    const lower = rawCode.toLowerCase();
    const exactNameMatch = currentItems.find(i => i.name && i.name.toLowerCase() === lower);
    if (exactNameMatch) return exactNameMatch;

    // 4. Check if barcode contains item name or item name contains barcode
    const partialMatch = currentItems.find(i => {
      if (!i.name) return false;
      const n = i.name.toLowerCase();
      return n.includes(lower) || lower.includes(n);
    });
    if (partialMatch) return partialMatch;

    return null;
  };

  // Handle a successfully scanned or entered barcode string
  const handleBarcodeDecoded = async (decodedText) => {
    if (isProcessingScanRef.current) return;
    isProcessingScanRef.current = true;

    try {
      const matchedItem = resolveProductFromBarcode(decodedText);

      if (!matchedItem) {
        playBeep('error');
        triggerHaptic([100, 50, 100]);
        setUnrecognizedBarcode(String(decodedText).trim());
        return;
      }

      playBeep('success');
      triggerHaptic([70]);

      const currentMode = scanModeRef.current;
      const currentQty = Number(matchedItem.quantity) || 0;

      if (currentMode === 'increment') {
        const nextQty = currentQty + 1;
        setScanFeedbackMsg({
          type: 'success',
          text: `+1 Stock In: "${matchedItem.name}" now ${nextQty}`
        });
        await updateInventoryInDb(matchedItem, nextQty, '+1');
      } else if (currentMode === 'decrement') {
        const nextQty = Math.max(0, currentQty - 1);
        setScanFeedbackMsg({
          type: nextQty < 20 ? 'warning' : 'success',
          text: `-1 Stock Out: "${matchedItem.name}" now ${nextQty}`
        });
        await updateInventoryInDb(matchedItem, nextQty, '-1');
      } else {
        // 'inspect' mode - open item editor
        setActiveItem(matchedItem);
        setEditQty(currentQty);
        setScanFeedbackMsg({
          type: 'info',
          text: `Scanned: "${matchedItem.name}" (Current: ${currentQty})`
        });
      }

      setTimeout(() => setScanFeedbackMsg(null), 3000);
    } finally {
      // Cooldown to prevent double scanning the exact same frame
      setTimeout(() => {
        isProcessingScanRef.current = false;
      }, 1200);
    }
  };

  // Link Unrecognized Barcode to an Existing Item
  const linkBarcodeToItem = async (itemId) => {
    if (!unrecognizedBarcode) return;
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    saveBarcodeMapping(unrecognizedBarcode, item.id);
    const code = unrecognizedBarcode;
    setUnrecognizedBarcode(null);

    Swal.fire({
      icon: 'success',
      title: 'Barcode Linked!',
      text: `Barcode "${code}" linked to "${item.name}".`,
      toast: true,
      position: 'top',
      timer: 2500,
      showConfirmButton: false
    });

    // Immediately process as scanned
    setActiveItem(item);
    setEditQty(Number(item.quantity) || 0);
  };

  // Camera Management via Html5Qrcode
  const startCamera = async (preferCameraId = null) => {
    try {
      setCameraError(null);
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('scanner-viewfinder', {
          verbose: false
        });
      }

      const scanner = html5QrCodeRef.current;
      if (scanner.isScanning) {
        await scanner.stop();
      }

      const targetCameraConfig = preferCameraId ? preferCameraId : { facingMode: 'environment' };

      const qrboxFunction = (viewfinderWidth, viewfinderHeight) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const qrboxSize = Math.floor(minEdge * 0.85);
        return {
          width: qrboxSize,
          height: Math.floor(qrboxSize * 0.65) // Wide box for retail barcodes & QR
        };
      };

      try {
        await scanner.start(
          targetCameraConfig,
          {
            fps: 15,
            qrbox: qrboxFunction,
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true
          },
          (decodedText) => {
            handleBarcodeDecoded(decodedText);
          },
          () => {}
        );
      } catch (startErr) {
        // Fallback to default camera if environment camera facingMode fails
        console.warn('Initial camera start failed, trying fallback:', startErr);
        await scanner.start(
          { facingMode: 'user' },
          {
            fps: 15,
            qrbox: qrboxFunction,
            aspectRatio: 1.0
          },
          (decodedText) => {
            handleBarcodeDecoded(decodedText);
          },
          () => {}
        );
      }

      setIsScanning(true);

      // Now query available cameras after permission is granted:
      Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length > 0) {
          setAvailableCameras(devices);
        }
      }).catch(() => {});

      // Check torch capability
      try {
        const capabilities = scanner.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setTorchSupported(true);
        } else {
          setTorchSupported(false);
        }
      } catch (_) {
        setTorchSupported(false);
      }
    } catch (err) {
      console.error('Camera starting error:', err);
      setIsScanning(false);
      setCameraError(err.message || 'Camera permission denied or camera not accessible.');
    }
  };

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
    } catch (err) {
      console.warn('Error stopping camera:', err);
    } finally {
      setIsScanning(false);
      setTorchOn(false);
    }
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !torchSupported) return;
    try {
      const nextTorch = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  const switchCamera = async () => {
    if (availableCameras.length <= 1) return;
    const currentIndex = availableCameras.findIndex(c => c.id === currentCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];
    if (nextCamera) {
      await startCamera(nextCamera.id);
    }
  };

  const handleFileUploadScan = async (file) => {
    if (!file) return;
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('scanner-viewfinder');
      }
      const scanner = html5QrCodeRef.current;
      if (scanner.isScanning) {
        await scanner.stop();
        setIsScanning(false);
      }
      const decodedText = await scanner.scanFile(file, true);
      if (decodedText) {
        handleBarcodeDecoded(decodedText);
      }
    } catch (err) {
      Swal.fire({
        icon: 'warning',
        title: 'Barcode Not Detected',
        text: 'Could not read a clear barcode or QR code from this image. Please try another photo or use manual search.',
        toast: true,
        position: 'top',
        timer: 3500,
        showConfirmButton: false
      });
    }
  };

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(() => {});
        }
        try {
          html5QrCodeRef.current.clear();
        } catch (_) {}
      }
    };
  }, []);

  return {
    items,
    loadingItems,
    activeItem,
    setActiveItem,
    scanMode,
    setScanMode,
    isScanning,
    cameraError,
    manualCode,
    setManualCode,
    unrecognizedBarcode,
    setUnrecognizedBarcode,
    showStatusModal,
    setShowStatusModal,
    recentScans,
    editQty,
    setEditQty,
    isUpdatingDb,
    scanFeedbackMsg,
    availableCameras,
    torchOn,
    torchSupported,
    startCamera,
    stopCamera,
    toggleTorch,
    switchCamera,
    handleFileUploadScan,
    handleBarcodeDecoded,
    linkBarcodeToItem,
    updateInventoryInDb,
    saveBarcodeMapping
  };
}

export default useScannerLogic;
