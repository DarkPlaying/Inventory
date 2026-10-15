import { useState, useEffect } from 'react';
import supabase from '../supabase';

const formatCompanyItems = (itemsList) => {
  if (!itemsList || itemsList.length === 0) return [];
  const companyMap = {};

  itemsList.forEach(item => {
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

  return Object.values(companyMap).map((c, index) => ({
    id: index + 1,
    name: c.name,
    quantity: c.quantity,
    item: Array.from(c.items).join(', ') || 'Various',
    itemList: c.itemList,
    distinctCount: c.items.size,
    cost: `$${c.cost}`
  }));
};

const getCachedBusinessData = () => {
  try {
    const raw = localStorage.getItem('inventory_items_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return formatCompanyItems(parsed);
      }
    }
  } catch (_) {}
  return [];
};

export function useBusinessLogic() {
  const [businessData, setBusinessData] = useState(() => getCachedBusinessData());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(() => getCachedBusinessData().length === 0);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  async function fetchBusinessData() {
    try {
      const { data, error } = await supabase.from('items').select('*');
      if (data && data.length > 0) {
        const formatted = formatCompanyItems(data);
        setBusinessData(formatted);
        try {
          localStorage.setItem('inventory_items_cache', JSON.stringify(data));
        } catch (_) {}
      } else if (error) {
        console.error('Error fetching business items:', error.message);
      }
    } catch (err) {
      console.warn('Error fetching business data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBusinessData();

    const channel = supabase
      .channel('business-items-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        fetchBusinessData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredData = businessData.filter(row => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return row.name.toLowerCase().includes(q) || row.item.toLowerCase().includes(q);
  });

  return {
    businessData: filteredData,
    search,
    setSearch,
    loading,
    showStatusModal,
    setShowStatusModal,
    selectedCompany,
    setSelectedCompany
  };
}
