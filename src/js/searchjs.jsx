import { useState, useEffect } from 'react';
import supabase from '../supabase';

export function useSearchLogic() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'items' | 'business'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase.from('items').select('*');
    if (data) {
      setItems(data);
    } else if (error) {
      console.error('Error fetching search data:', error.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('search-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update item quantity directly
  const handleQuantityChange = async (id, delta) => {
    const item = items.find(x => x.id === id);
    if (!item) return;
    const currentQty = Number(item.quantity) || 0;
    const newQty = Math.max(0, currentQty + delta);
    const newStatus = newQty < 20 ? 'OUT' : 'STOCKED';

    const { error } = await supabase
      .from('items')
      .update({ quantity: newQty, status: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Error updating quantity:', error.message);
    } else {
      setItems(prev => prev.map(x => x.id === id ? { ...x, quantity: newQty, status: newStatus } : x));
    }
  };

  const q = query.trim().toLowerCase();

  // Filter Items
  const filteredItems = items.filter(item => {
    if (!q) return true;
    const nameMatch = item.name?.toLowerCase().includes(q);
    const catMatch = item.category?.toLowerCase().includes(q);
    const dealerMatch = item.dealer_name?.toLowerCase().includes(q);
    return nameMatch || catMatch || dealerMatch;
  });

  // Group items by company
  const companyMap = {};
  items.forEach(item => {
    const companyName = item.dealer_name ? item.dealer_name.trim() : 'ABC company';
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const total = item.total_price !== undefined && item.total_price !== null
      ? Number(item.total_price)
      : (qty * price);

    if (!companyMap[companyName]) {
      companyMap[companyName] = {
        name: companyName,
        quantity: 0,
        items: new Set(),
        itemList: [],
        cost: 0
      };
    }

    companyMap[companyName].quantity += qty;
    if (item.name) companyMap[companyName].items.add(item.name);
    companyMap[companyName].itemList.push({
      id: item.id,
      name: item.name || 'Unnamed Item',
      quantity: qty,
      price: price,
      total: total,
      category: item.category || 'General',
      status: item.status || (qty < 20 ? 'OUT' : qty < 30 ? 'LOW' : 'STOCKED')
    });
    companyMap[companyName].cost += total;
  });

  const businessData = Object.values(companyMap).map((c, index) => ({
    id: index + 1,
    name: c.name,
    quantity: c.quantity,
    itemList: c.itemList,
    distinctCount: c.items.size,
    cost: `$${c.cost}`
  }));

  // Filter Business Companies
  const filteredBusiness = businessData.filter(company => {
    if (!q) return true;
    const companyMatch = company.name.toLowerCase().includes(q);
    const itemMatch = company.itemList.some(item =>
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
    return companyMatch || itemMatch;
  });

  return {
    query,
    setQuery,
    activeTab,
    setActiveTab,
    filteredItems,
    filteredBusiness,
    loading,
    showStatusModal,
    setShowStatusModal,
    selectedCompany,
    setSelectedCompany,
    handleQuantityChange
  };
}

export default useSearchLogic;
