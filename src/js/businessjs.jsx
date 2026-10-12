import { useState, useEffect } from 'react';
import supabase from '../supabase';

export function useBusinessLogic() {
  const [businessData, setBusinessData] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  async function fetchBusinessData() {
    setLoading(true);
    const { data, error } = await supabase.from('items').select('*');

    if (data) {
      // Group items by company / dealer name
      const companyMap = {};

      data.forEach(item => {
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

      const formatted = Object.values(companyMap).map((c, index) => ({
        id: index + 1,
        name: c.name,
        quantity: c.quantity,
        item: Array.from(c.items).join(', ') || 'Various',
        itemList: c.itemList,
        distinctCount: c.items.size,
        cost: `$${c.cost}`
      }));

      setBusinessData(formatted);
    } else if (error) {
      console.error('Error fetching business items:', error.message);
    }
    setLoading(false);
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
