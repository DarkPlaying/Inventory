package com.inventoryapp.app;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "StockWidgetPlugin")
public class StockWidgetPlugin extends Plugin {

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(StockWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            if (call.hasOption("totalItemsCount")) {
                editor.putInt("total_items_count", call.getInt("totalItemsCount", 0));
            }
            if (call.hasOption("lowStockCount")) {
                editor.putInt("low_stock_count", call.getInt("lowStockCount", 0));
            }
            if (call.hasOption("outOfStockCount")) {
                editor.putInt("out_of_stock_count", call.getInt("outOfStockCount", 0));
            }
            if (call.hasOption("todayTasksText")) {
                editor.putString("today_tasks_text", call.getString("todayTasksText", "No pending tasks today."));
            }
            if (call.hasOption("tomorrowTasksText")) {
                editor.putString("tomorrow_tasks_text", call.getString("tomorrowTasksText", "All clear for tomorrow."));
            }
            if (call.hasOption("widgetTheme")) {
                editor.putString("widget_theme", call.getString("widgetTheme", "light"));
            }

            editor.apply();

            // Refresh all active widgets immediately
            StockWidgetProvider.notifyDataChanged(context);

            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to update widget: " + e.getMessage());
        }
    }
}
