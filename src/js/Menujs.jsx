import { useState, useEffect } from "react";
import supabase from "../supabase";
import Swal from "sweetalert2";

export function useMenuLogic() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    name: '',
    quantity: '',
    price: '',
    dealer_name: 'ABC company',
    category: 'Clothes'
  });

  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  async function getItems() {
    const { data, error } = await supabase.from('items').select('*');
    if (data) {
      const formatted = data.map(x => ({
        id: x.id,
        name: x.name,
        count: Number(x.quantity) || 0,
        status: (Number(x.quantity) < 20 || x.status === 'OUT')
          ? 'OUT'
          : Number(x.quantity) < 30
            ? 'LOW'
            : 'STOCKED',
        price: x.price,
        dealer_name: x.dealer_name || 'ABC company',
        category: x.category || 'Clothes'
      }));
      setItems(formatted);
    } else if (error) {
      console.error("error in fetch Menu data:", error.message);
      showToast(error.message, "error");
    }
  }

  useEffect(() => {
    getItems();

    const channel = supabase
      .channel('menu-realtime-items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        getItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update item count with + / - stepper
  const updateCount = async (id, delta) => {
    const currentItem = items.find(item => item.id === id);
    if (!currentItem) return;

    const newCount = Math.max(0, currentItem.count + delta);
    const status = newCount < 20 ? 'OUT' : newCount < 30 ? 'LOW' : 'STOCKED';

    setItems(prev => prev.map(item => item.id === id ? { ...item, count: newCount, status } : item));

    const { error } = await supabase.from('items').update({ quantity: newCount }).eq('id', id);
    if (error) showToast('Error updating item: ' + error.message, 'error');
  };

  // Delete item with SweetAlert confirm dialog
  const handleDeleteItem = async (id, name) => {
    const result = await Swal.fire({
      title: 'Delete Item?',
      text: `Are you sure you want to delete "${name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: `"${name}" was deleted.`,
          timer: 1500,
          showConfirmButton: false
        });
      }
    }
  };

  // Add Item via Form with SweetAlert
  const handleAddItem = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!form.name || !form.quantity || !form.price) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: 'Please provide name, quantity, and price.'
      });
      return;
    }

    if (isCustomCategory && !customCategoryInput.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Custom Category Required',
        text: 'Please enter a name for your custom category or switch back to list.'
      });
      return;
    }

    const finalCategory = (isCustomCategory && customCategoryInput.trim())
      ? customCategoryInput.trim()
      : (form.category || 'Clothes');

    const { error } = await supabase.from('items').insert([{
      name: form.name,
      quantity: Number(form.quantity),
      price: Number(form.price),
      dealer_name: form.dealer_name || 'ABC company',
      category: finalCategory
    }]);

    if (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Item Added!',
        text: `"${form.name}" in category "${finalCategory}" was added successfully!`,
        timer: 2000,
        showConfirmButton: false
      });
      setShowAddModal(false);
      setForm({ name: '', quantity: '', price: '', dealer_name: 'ABC company', category: 'Clothes' });
      setIsCustomCategory(false);
      setCustomCategoryInput('');
    }
  };

  // Excel File Upload Handler with SweetAlert
  const handleExcelUpload = async (file) => {
    if (!file) return;

    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Empty File',
          text: 'No data rows found in the selected Excel file.'
        });
        return;
      }

      // Map rows (supports various header naming styles)
      const rows = jsonData.map(row => ({
        name: String(row.name || row.Name || row['Item Name'] || 'Item'),
        quantity: Number(row.quantity || row.Quantity || row.Qty || row.count || 0),
        price: Number(row.price || row.Price || 0),
        dealer_name: String(row.dealer_name || row['Dealer Name'] || row.dealer || row.Dealer || 'ABC company'),
        category: String(row.category || row.Category || 'Clothes')
      }));

      // Insert into Supabase
      const { error } = await supabase.from('items').insert(rows);

      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Upload Failed',
          text: error.message
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Excel Upload Success!',
          text: `Successfully added ${rows.length} items from Excel!`,
          confirmButtonColor: '#000000'
        });
        setShowExcelModal(false);
        setShowAddModal(false);
      }
    } catch (err) {
      console.error('Excel parse error:', err);
      Swal.fire({
        icon: 'error',
        title: 'File Read Error',
        text: 'Failed to process Excel file: ' + err.message
      });
    }
  };

  // Direct Download sample Excel template (Single trigger with debounce)
  let isDownloadingExcel = false;
  const downloadSampleExcel = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isDownloadingExcel) return;
    isDownloadingExcel = true;
    setTimeout(() => { isDownloadingExcel = false; }, 2000);

    try {
      const fileUrl = `${window.location.origin}/sample_inventory_template.xlsx`;

      // Single anchor download trigger
      const anchor = document.createElement('a');
      anchor.href = fileUrl;
      anchor.download = 'sample_inventory_template.xlsx';
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => {
        document.body.removeChild(anchor);
      }, 300);

      // Clean, non-blocking toast at the top
      Swal.fire({
        toast: true,
        position: 'top',
        icon: 'success',
        title: 'Downloading Sample Excel...',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      console.error("Failed to download sample Excel:", err);
      Swal.fire({
        toast: true,
        position: 'top',
        icon: 'error',
        title: 'Download failed: ' + err.message,
        showConfirmButton: false,
        timer: 3000
      });
    }
  };

  // Stock categories
  const outItems = items.filter(x => x.count < 20 || x.status === 'OUT');
  const lowItems = items.filter(x => x.count >= 20 && x.count < 30 && x.status !== 'OUT');
  const stockedItems = items.filter(x => x.count >= 30);

  // Available categories strictly based on current items in database
  const availableCategories = ['All', ...Array.from(new Set(items.map(x => x.category).filter(Boolean)))];

  // Filter items by category or out of stock AND by search query
  const displayedItems = items.filter(item => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = item.name.toLowerCase().includes(q);
      const matchCat = item.category?.toLowerCase().includes(q);
      if (!matchName && !matchCat) return false;
    }

    if (filter === 'OUT') return item.count < 20 || item.status === 'OUT';
    if (filter === 'All' || filter === 'ALL') return true;
    return item.category?.toLowerCase() === filter.toLowerCase();
  });

  // Category options for dropdown combining defaults and existing categories
  const categoryOptions = Array.from(new Set([
    'Clothes', 'T-Shirt', 'Jeans', 'Hoodie', 'Jacket',
    ...items.map(x => x.category).filter(Boolean)
  ]));

  return {
    items, setItems,
    filter, setFilter,
    searchQuery, setSearchQuery,
    availableCategories,
    categoryOptions,
    displayedItems,
    outItems, lowItems, stockedItems,
    showAddModal, setShowAddModal,
    showExcelModal, setShowExcelModal,
    showStatusModal, setShowStatusModal,
    form, setForm,
    isCustomCategory, setIsCustomCategory,
    customCategoryInput, setCustomCategoryInput,
    handleAddItem,
    handleExcelUpload,
    downloadSampleExcel,
    handleDeleteItem,
    updateCount,
    toast, setToast, showToast
  };
}

export const useGetItems = useMenuLogic;
export default useMenuLogic;