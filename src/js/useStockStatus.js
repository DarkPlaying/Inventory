import React from 'react';
import supabase from '../supabase';
import { useState, useEffect } from 'react';

export function useStockStatus() {
  const [statusData, setStatusData] = useState({
    total: 0,
    out: 0,
    low: 0,
    stocked: 0,
    outItems: [],
    lowItems: []
  });

  async function fetchStatus() {
    const { data } = await supabase.from('items').select('*');
    if (data) {
      let outCount = 0;
      let lowCount = 0;
      let stockedCount = 0;
      const outList = [];
      const lowList = [];

      data.forEach(item => {
        const qty = Number(item.quantity) || 0;
        if (qty < 20 || item.status === 'OUT') {
          outCount++;
          outList.push(item.name);
        } else if (qty < 30) {
          lowCount++;
          lowList.push(item.name);
        } else {
          stockedCount++;
        }
      });

      setStatusData({
        total: data.length,
        out: outCount,
        low: lowCount,
        stocked: stockedCount,
        outItems: outList,
        lowItems: lowList
      });
    }
  }

  useEffect(() => {
    fetchStatus();
    const channelId = `stock-status-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        fetchStatus();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return statusData;
}
