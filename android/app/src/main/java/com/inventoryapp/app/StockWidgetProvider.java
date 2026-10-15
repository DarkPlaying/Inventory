package com.inventoryapp.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.widget.RemoteViews;

public class StockWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "stock_widget_prefs";
    public static final String ACTION_TOGGLE_THEME = "com.inventoryapp.app.TOGGLE_WIDGET_THEME";

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent != null && ACTION_TOGGLE_THEME.equals(intent.getAction())) {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String current = prefs.getString("widget_theme", "light");
            String next = "dark".equalsIgnoreCase(current) ? "light" : "dark";
            prefs.edit().putString("widget_theme", next).apply();
            notifyDataChanged(context);
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        String theme = prefs.getString("widget_theme", "light");
        int layoutId = "dark".equalsIgnoreCase(theme)
            ? R.layout.widget_stock_reminder
            : R.layout.widget_stock_reminder_light;

        int totalItems = prefs.getInt("total_items_count", 0);
        int lowStock = prefs.getInt("low_stock_count", 0);
        int outStock = prefs.getInt("out_of_stock_count", 0);

        String todayTasks = prefs.getString("today_tasks_text", "No pending tasks today. All stocks on track!");
        String tomorrowTasks = prefs.getString("tomorrow_tasks_text", "All clear for tomorrow.");

        RemoteViews views = new RemoteViews(context.getPackageName(), layoutId);

        views.setTextViewText(R.id.widget_total_items, "Items: " + totalItems);
        views.setTextViewText(R.id.widget_low_stock, "Low: " + lowStock);
        views.setTextViewText(R.id.widget_out_stock, "Out: " + outStock);
        views.setTextViewText(R.id.widget_today_tasks, todayTasks);
        views.setTextViewText(R.id.widget_tomorrow_tasks, tomorrowTasks);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        // PendingIntent to launch app into tasks overview
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_MAIN);
        intent.addCategory(Intent.CATEGORY_LAUNCHER);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("route", "/tasks");

        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, flags);
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
        views.setOnClickPendingIntent(R.id.widget_btn_open, pendingIntent);

        // PendingIntent to toggle light/dark theme directly from the widget
        Intent toggleIntent = new Intent(context, StockWidgetProvider.class);
        toggleIntent.setAction(ACTION_TOGGLE_THEME);
        PendingIntent togglePendingIntent = PendingIntent.getBroadcast(context, 101, toggleIntent, flags);
        views.setOnClickPendingIntent(R.id.widget_theme_toggle, togglePendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static void notifyDataChanged(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName widgetComponent = new ComponentName(context, StockWidgetProvider.class);
        int[] widgetIds = manager.getAppWidgetIds(widgetComponent);
        if (widgetIds != null && widgetIds.length > 0) {
            for (int id : widgetIds) {
                updateAppWidget(context, manager, id);
            }
        }
    }
}
