import React from 'react';
import supabase from '../supabase';
import { useState, useEffect } from 'react';
import { getAppSettings } from './settingsService';

export function useStockStatus() {
  const [statusData, setStatusData] = useState({
    total: 0,
    out: 0,
    low: 0,
    stocked: 0,
    outItems: [],
    lowItems: [],
    limits: { outLimit: 20, lowLimit: 30, stockedLimit: 30 }
  });

  async function fetchStatus() {
    const { data } = await supabase.from('items').select('*');
    const settings = getAppSettings();
    const limits = settings.stockLimits || { outLimit: 20, lowLimit: 30, stockedLimit: 30 };
    const outLimit = limits.outLimit ?? 20;
    const lowLimit = limits.lowLimit ?? 30;

    if (data) {
      let outCount = 0;
      let lowCount = 0;
      let stockedCount = 0;
      const outList = [];
      const lowList = [];

      data.forEach(item => {
        const qty = Number(item.quantity) || 0;
        if (qty < outLimit || item.status === 'OUT') {
          outCount++;
          outList.push(item.name);
        } else if (qty < lowLimit) {
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
        lowItems: lowList,
        limits
      });
    }
  }

  useEffect(() => {
    fetchStatus();

    function onSettingsChange() {
      fetchStatus();
    }
    window.addEventListener('inventory-settings-changed', onSettingsChange);

    const channelId = `stock-status-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        fetchStatus();
      })
      .subscribe();

    return () => {
      window.removeEventListener('inventory-settings-changed', onSettingsChange);
      supabase.removeChannel(channel);
    };
  }, []);

  return statusData;
}
