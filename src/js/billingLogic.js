import { useState, useEffect, useRef, useCallback } from 'react';
import supabase from '../supabase';
import { sendStockChangeNotification } from './notificationService';
import Swal from 'sweetalert2';
import { Html5Qrcode } from 'html5-qrcode';

const BARCODE_MAP_KEY = 'inventory_barcode_mappings_v1';
const BILLING_ITEMS_CACHE_KEY = 'inventory_items_cache';

const getCachedBillingItems = () => {
  try {
    const raw = localStorage.getItem(BILLING_ITEMS_CACHE_KEY);
    if (raw) return JSON.parse(raw);
    const overviewRaw = localStorage.getItem('inventory_overview_cache');
    if (overviewRaw) {
      const parsed = JSON.parse(overviewRaw);
      if (Array.isArray(parsed?.items) && parsed.items.length > 0) return parsed.items;
    }
  } catch (_) {}
  return [];
};

// Web Audio API beep
export const playBeep = (type = 'success') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(920, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    }
  } catch (_) {}
};

export const triggerHaptic = (pattern = [80]) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch (_) {}
};

export function useBillingLogic() {
  const [items, setItems] = useState(() => getCachedBillingItems());
  const [loadingItems, setLoadingItems] = useState(() => getCachedBillingItems().length === 0);
  const [cart, setCart] = useState({}); // { [itemId]: count }
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('qr'); // 'qr' | 'cash' | 'card'
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [currentCameraId, setCurrentCameraId] = useState(null);

  const html5QrCodeRef = useRef(null);
  const isScanningRef = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // 1. Fetch products from Supabase
  const fetchItems = useCallback(async () => {
    try {
      if (itemsRef.current.length === 0) setLoadingItems(true);
      const fetchPromise = supabase.from('items').select('*').order('id', { ascending: true });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Fetch timeout')), 4500)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
      if (error) throw error;
      if (data && data.length > 0) {
        setItems(data);
        try {
          localStorage.setItem(BILLING_ITEMS_CACHE_KEY, JSON.stringify(data));
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Supabase fetch issue or timeout, using cached/fallback items:', err);
      setItems(prev => {
        if (prev.length > 0) return prev;
        const cached = getCachedBillingItems();
        if (cached.length > 0) return cached;
        return [
          { id: 1, name: 'Cotton T-Shirt', quantity: 45, price: 25, category: 'Clothing', status: 'STOCKED' },
          { id: 2, name: 'Slim Fit Jeans', quantity: 30, price: 45, category: 'Clothing', status: 'STOCKED' },
          { id: 3, name: 'Wireless Headphones', quantity: 18, price: 89, category: 'Electronics', status: 'LOW' },
          { id: 4, name: 'Smart Fitness Band', quantity: 12, price: 39, category: 'Electronics', status: 'LOW' },
          { id: 5, name: 'Leather Wallet', quantity: 24, price: 30, category: 'Accessories', status: 'STOCKED' },
          { id: 6, name: 'Running Sneakers', quantity: 15, price: 65, category: 'Footwear', status: 'LOW' },
          { id: 7, name: 'Ceramic Coffee Mug', quantity: 50, price: 12, category: 'Accessories', status: 'STOCKED' }
        ];
      });
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    const channel = supabase
      .channel('billing-items-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        fetchItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems]);

  // Static notification: do not set timeout; removed only if none is added
  const showNotification = (text, type = 'success') => {
    setToastMsg({ text, type });
  };

  // Remove notification badge only if none is added (cart is empty)
  useEffect(() => {
    const totalCount = Object.values(cart).reduce((sum, q) => sum + (Number(q) || 0), 0);
    if (totalCount === 0) {
      setToastMsg(null);
    }
  }, [cart]);

  // 2. Cart Operations
  const addToCart = (item, delta = 1) => {
    if (!item) return;
    const maxAvailable = Number(item.quantity) || 0;
    const currentInCart = cart[item.id] || 0;
    const newQty = currentInCart + delta;

    if (newQty > maxAvailable) {
      Swal.fire({
        icon: 'warning',
        title: 'Max Stock Reached',
        text: `Only ${maxAvailable} units available in inventory for "${item.name}".`,
        toast: true,
        position: 'top',
        timer: 2500,
        showConfirmButton: false
      });
      return;
    }

    if (newQty <= 0) {
      removeFromCart(item.id);
      return;
    }

    setCart(prev => ({ ...prev, [item.id]: newQty }));
    playBeep('success');
    triggerHaptic([60]);
    // Set static notification without timeout
    showNotification(`"${item.name}" qty: ${newQty}`);
  };

  const updateCartCount = (itemId, countInput) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const maxAvailable = Number(item.quantity) || 0;

    // If input is deleted / blank, set to 0 and KEEP edit stepper open!
    if (countInput === '' || countInput === null || countInput === undefined) {
      setCart(prev => ({ ...prev, [itemId]: 0 }));
      return;
    }

    let valid = parseInt(countInput, 10);
    if (isNaN(valid)) valid = 0;

    if (valid > maxAvailable) {
      Swal.fire({
        icon: 'warning',
        title: 'Insufficient Stock',
        text: `Cannot add more than available stock (${maxAvailable}).`,
        toast: true,
        position: 'top',
        timer: 2500,
        showConfirmButton: false
      });
      setCart(prev => ({ ...prev, [itemId]: maxAvailable }));
      showNotification(`"${item.name}" qty: ${maxAvailable}`);
      return;
    }

    const finalQty = Math.max(0, valid);
    setCart(prev => ({ ...prev, [itemId]: finalQty }));
    if (finalQty > 0) {
      showNotification(`"${item.name}" qty: ${finalQty}`);
    }
  };

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const copy = { ...prev };
      delete copy[itemId];
      const remainingCount = Object.values(copy).reduce((sum, q) => sum + (Number(q) || 0), 0);
      if (remainingCount === 0) {
        setToastMsg(null);
      }
      return copy;
    });
  };

  const clearCart = () => {
    setCart({});
    setToastMsg(null);
  };

  // Cart Calculations - only entries with quantity > 0 are billed
  const cartItemsList = Object.entries(cart)
    .filter(([_, qty]) => Number(qty) > 0)
    .map(([id, qty]) => {
      const item = items.find(i => String(i.id) === String(id));
      const price = Number(item?.price) || 0;
      return {
        id: Number(id),
        item,
        name: item?.name || `Item #${id}`,
        price,
        quantity: Number(qty),
        total: Number(qty) * price
      };
    })
    .filter(entry => entry.item);

  const totalItemsCount = cartItemsList.reduce((acc, c) => acc + c.quantity, 0);
  const grandTotal = cartItemsList.reduce((acc, c) => acc + c.total, 0);

  // 3. Barcode Resolution for Billing
  const handleBarcodeDecoded = (decodedText) => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;

    try {
      const rawCode = String(decodedText).trim();
      if (!rawCode) return;

      const currentItems = itemsRef.current;
      const cleanId = rawCode.replace(/^(item|id|prod)[-_:\s]*/i, '').trim();

      // Check ID match
      let match = currentItems.find(i => String(i.id) === cleanId || String(i.id) === rawCode);

      // Check name match
      if (!match) {
        const lower = rawCode.toLowerCase();
        match = currentItems.find(i => i.name && (i.name.toLowerCase() === lower || i.name.toLowerCase().includes(lower)));
      }

      // Check localStorage mappings
      if (!match) {
        try {
          const raw = localStorage.getItem(BARCODE_MAP_KEY);
          if (raw) {
            const map = JSON.parse(raw);
            if (map[rawCode]) {
              match = currentItems.find(i => String(i.id) === String(map[rawCode]));
            }
          }
        } catch (_) {}
      }

      if (match) {
        addToCart(match, 1);
      } else {
        playBeep('error');
        triggerHaptic([100, 50, 100]);
        Swal.fire({
          icon: 'warning',
          title: 'Unrecognized Barcode',
          text: `Barcode "${rawCode}" does not match any current inventory product.`,
          toast: true,
          position: 'top',
          timer: 3000,
          showConfirmButton: false
        });
      }
    } finally {
      setTimeout(() => {
        isScanningRef.current = false;
      }, 1200);
    }
  };

  // 4. Camera Control
  const startCamera = async (preferCameraId = null) => {
    try {
      setCameraError(null);

      // Wait for DOM element to exist in the document
      let el = document.getElementById('billing-scanner-viewfinder');
      let attempts = 0;
      while (!el && attempts < 15) {
        await new Promise(r => setTimeout(r, 100));
        el = document.getElementById('billing-scanner-viewfinder');
        attempts++;
      }
      if (!el) {
        throw new Error('Scanner container not ready yet.');
      }

      // Check and prompt for camera permission via getUserMedia
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const testStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: preferCameraId ? undefined : 'environment' }
          });
          testStream.getTracks().forEach(t => t.stop());
        } catch (permErr) {
          console.warn('Camera permission check result:', permErr);
        }
      }

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('billing-scanner-viewfinder', { verbose: false });
      }
      const scanner = html5QrCodeRef.current;
      if (scanner.isScanning) {
        await scanner.stop();
      }

      const targetCameraConfig = preferCameraId ? preferCameraId : { facingMode: 'environment' };
      const qrboxFunction = (w, h) => {
        const minEdge = Math.min(w, h);
        const qrboxSize = Math.floor(minEdge * 0.85);
        return { width: qrboxSize, height: Math.floor(qrboxSize * 0.65) };
      };

      try {
        await scanner.start(
          targetCameraConfig,
          { fps: 15, qrbox: qrboxFunction, aspectRatio: 1.0 },
          (decoded) => handleBarcodeDecoded(decoded),
          () => {}
        );
      } catch (err) {
        console.warn('Environment camera failed, falling back to user facing camera:', err);
        await scanner.start(
          { facingMode: 'user' },
          { fps: 15, qrbox: qrboxFunction, aspectRatio: 1.0 },
          (decoded) => handleBarcodeDecoded(decoded),
          () => {}
        );
      }

      setIsScanning(true);
      setCameraError(null);

      Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length > 0) setAvailableCameras(devices);
      }).catch(() => {});

      try {
        const capabilities = scanner.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) setTorchSupported(true);
      } catch (_) {
        setTorchSupported(false);
      }
    } catch (err) {
      console.error('Camera starting error in billing:', err);
      setIsScanning(false);
      setCameraError(err.message || 'Camera permission denied or camera not accessible.');
    }
  };

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
    } catch (_) {}
    setIsScanning(false);
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !torchSupported) return;
    try {
      const next = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch (_) {}
  };

  const switchCamera = async () => {
    if (availableCameras.length <= 1) return;
    const currentIndex = availableCameras.findIndex(c => c.id === currentCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCam = availableCameras[nextIndex];
    if (nextCam) {
      setCurrentCameraId(nextCam.id);
      await startCamera(nextCam.id);
    }
  };

  const handleFileUploadScan = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'warning',
        title: 'Images Only',
        text: 'Please select an image file (.png, .jpg, .jpeg, .webp).',
        toast: true,
        position: 'top',
        timer: 3000,
        showConfirmButton: false
      });
      return;
    }
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('billing-scanner-viewfinder');
      }
      const scanner = html5QrCodeRef.current;
      if (scanner.isScanning) {
        await scanner.stop();
        setIsScanning(false);
      }
      const decoded = await scanner.scanFile(file, true);
      if (decoded) handleBarcodeDecoded(decoded);
    } catch (err) {
      Swal.fire({
        icon: 'warning',
        title: 'Barcode Not Detected',
        text: 'Could not read a clear barcode or QR code from this image. Please try another photo.',
        toast: true,
        position: 'top',
        timer: 3000,
        showConfirmButton: false
      });
    }
  };

  // Clean up camera on unmount
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

  // 5. Complete Order & Deduct Database Inventory
  const handleConfirmPaymentAndPlaceOrder = async () => {
    if (cartItemsList.length === 0) return;
    setIsProcessingPayment(true);

    try {
      // Deduct inventory count for all cart items in Supabase (only update quantity; total_price is a generated column)
      for (const entry of cartItemsList) {
        const item = entry.item;
        const currentQty = Number(item.quantity) || 0;
        const deductQty = entry.quantity;
        const newQty = Math.max(0, currentQty - deductQty);

        const { error } = await supabase
          .from('items')
          .update({
            quantity: newQty
          })
          .eq('id', item.id);

        if (error) {
          console.error(`Error updating item #${item.id}:`, error);
          throw error;
        }
      }

      // Update local state and persistent caches immediately
      setItems(prevItems => {
        const updated = prevItems.map(it => {
          const purchased = cartItemsList.find(c => String(c.id) === String(it.id));
          if (purchased) {
            const newQty = Math.max(0, (Number(it.quantity) || 0) - purchased.quantity);
            const newStatus = newQty < 20 ? 'OUT' : newQty < 30 ? 'LOW' : 'STOCKED';
            return { ...it, quantity: newQty, status: newStatus };
          }
          return it;
        });
        try {
          localStorage.setItem(BILLING_ITEMS_CACHE_KEY, JSON.stringify(updated));
          const existingOverview = localStorage.getItem('inventory_overview_cache');
          if (existingOverview) {
            const parsed = JSON.parse(existingOverview);
            parsed.items = updated;
            localStorage.setItem('inventory_overview_cache', JSON.stringify(parsed));
          }
        } catch (_) {}
        return updated;
      });

      const receiptId = `ORD-${Date.now().toString().slice(-6)}`;
      const completedOrderData = {
        receiptId,
        date: new Date().toLocaleString(),
        items: [...cartItemsList],
        totalItems: totalItemsCount,
        grandTotal,
        paymentMethod: paymentMethod === 'qr' ? 'QR Code' : paymentMethod === 'cash' ? 'Cash' : 'Card'
      };

      setPaymentSuccessData(completedOrderData);
      clearCart();
      setShowPaymentModal(false);

      // Trigger outside-app notification for stock change
      sendStockChangeNotification(
        '🛒 Order Completed',
        `Order ${receiptId} placed! Total: $${grandTotal}. Stock updated in database.`
      );

      playBeep('success');
      triggerHaptic([50, 50, 100]);

      // Re-fetch fresh items in background
      fetchItems();
    } catch (err) {
      console.error('Order placement error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Order Placement Error',
        text: err.message || 'Could not complete order and update stock.',
        toast: true,
        position: 'top',
        timer: 3500,
        showConfirmButton: false
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Filter items for search & category
  const filteredProducts = items.filter(item => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || (
      item.name?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q) ||
      String(item.id).includes(q)
    );
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categories = ['All', ...new Set(items.map(i => i.category?.trim()).filter(Boolean))];

  return {
    items,
    loadingItems,
    cart,
    addToCart,
    updateCartCount,
    removeFromCart,
    clearCart,
    cartItemsList,
    totalItemsCount,
    grandTotal,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    filteredProducts,
    isScannerOpen,
    setIsScannerOpen,
    isScanning,
    cameraError,
    startCamera,
    stopCamera,
    toggleTorch,
    torchOn,
    torchSupported,
    switchCamera,
    availableCameras,
    handleFileUploadScan,
    handleBarcodeDecoded,
    showPaymentModal,
    setShowPaymentModal,
    paymentMethod,
    setPaymentMethod,
    isProcessingPayment,
    handleConfirmPaymentAndPlaceOrder,
    paymentSuccessData,
    setPaymentSuccessData,
    toastMsg,
    setToastMsg
  };
}

export default useBillingLogic;
