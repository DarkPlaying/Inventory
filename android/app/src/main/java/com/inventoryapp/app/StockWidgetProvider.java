package com.inventoryapp.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

public class StockWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "stock_widget_prefs";
    public static final String ACTION_TOGGLE_THEME = "com.inventoryapp.app.TOGGLE_WIDGET_THEME";
    public static final String ACTION_SELECT_PERIOD = "com.inventoryapp.app.SELECT_WIDGET_PERIOD";
    public static final String ACTION_SELECT_CATEGORY = "com.inventoryapp.app.SELECT_WIDGET_CATEGORY";

    public static final String EXTRA_PERIOD = "extra_period";
    public static final String EXTRA_CATEGORY = "extra_category";

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent == null || intent.getAction() == null) return;

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        if (ACTION_TOGGLE_THEME.equals(intent.getAction())) {
            String current = prefs.getString("widget_theme", "light");
            String next = "dark".equalsIgnoreCase(current) ? "light" : "dark";
            prefs.edit().putString("widget_theme", next).apply();
            notifyDataChanged(context);
        } else if (ACTION_SELECT_PERIOD.equals(intent.getAction())) {
            String period = intent.getStringExtra(EXTRA_PERIOD);
            if (period != null) {
                String current = prefs.getString("widget_period", "1W");
                // Clicking the already active period toggles/deselects back to Total
                if (period.equalsIgnoreCase(current)) {
                    prefs.edit().putString("widget_period", "Total").apply();
                } else {
                    prefs.edit().putString("widget_period", period).apply();
                }
                notifyDataChanged(context);
            }
        } else if (ACTION_SELECT_CATEGORY.equals(intent.getAction())) {
            String category = intent.getStringExtra(EXTRA_CATEGORY);
            if (category != null) {
                String current = prefs.getString("widget_category", "none");
                // Clicking the already active category deselects it back to none
                if (category.equalsIgnoreCase(current)) {
                    prefs.edit().putString("widget_category", "none").apply();
                } else {
                    prefs.edit().putString("widget_category", category).apply();
                }
                notifyDataChanged(context);
            }
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // Asynchronously fetch latest live inventory from Supabase in the background
        fetchInventoryInBackground(context);

        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager, int appWidgetId, Bundle newOptions) {
        updateAppWidget(context, appWidgetManager, appWidgetId);
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions);
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        String theme = prefs.getString("widget_theme", "light");
        boolean isDark = "dark".equalsIgnoreCase(theme);

        String activePeriod = prefs.getString("widget_period", "1W");
        String activeCategory = prefs.getString("widget_category", "none");

        int layoutId = isDark
            ? R.layout.widget_stock_reminder
            : R.layout.widget_stock_reminder_light;

        int totalItems = prefs.getInt("total_items_count", 0);
        int lowStock = prefs.getInt("low_stock_count", 0);
        int outStock = prefs.getInt("out_of_stock_count", 0);
        int tasksCount = prefs.getInt("tasks_count", 0);
        int nominalBalance = prefs.getInt("nominal_balance", 26852);
        int nominalRevenue = prefs.getInt("nominal_revenue", 26852);

        String todayTasks = prefs.getString("today_tasks_text", "Aim 50 (Now 11) • All stocks on track!");

        RemoteViews views = new RemoteViews(context.getPackageName(), layoutId);

        // Bind metric values
        views.setTextViewText(R.id.widget_total_items, String.valueOf(totalItems));
        views.setTextViewText(R.id.widget_low_stock, String.valueOf(lowStock));
        views.setTextViewText(R.id.widget_out_stock, String.valueOf(outStock));
        views.setTextViewText(R.id.widget_tasks_count, String.valueOf(tasksCount));
        views.setTextViewText(R.id.widget_today_tasks, todayTasks);

        // Check widget dimensions for dynamic responsive alignment
        Bundle options = appWidgetManager.getAppWidgetOptions(appWidgetId);
        int minHeight = options != null ? options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0) : 0;
        int maxHeight = options != null ? options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0) : 0;
        int effectiveHeight = Math.max(minHeight, maxHeight);

        boolean isTiny = effectiveHeight > 0 && effectiveHeight < 80;
        boolean isShort = effectiveHeight > 0 && effectiveHeight < 140;

        views.setViewVisibility(R.id.widget_header_container, View.VISIBLE);
        views.setViewVisibility(R.id.widget_main_analytics_container, View.VISIBLE);
        views.setViewVisibility(R.id.widget_rows_container, View.VISIBLE);
        views.setViewVisibility(R.id.widget_pills_container, isTiny ? View.GONE : View.VISIBLE);
        views.setViewVisibility(R.id.widget_task_box, isTiny ? View.GONE : View.VISIBLE);
        views.setViewVisibility(R.id.widget_kpi_container, isShort ? View.GONE : View.VISIBLE);
        views.setViewVisibility(R.id.widget_btn_open, isTiny ? View.GONE : View.VISIBLE);

        // Populate 2x2 KPI cards to use free space dynamically
        views.setTextViewText(R.id.widget_kpi_balance, String.format(Locale.US, "%,d USD", nominalBalance));
        views.setTextViewText(R.id.widget_kpi_total_items, totalItems + " Items");
        views.setTextViewText(R.id.widget_kpi_revenue, String.format(Locale.US, "%,d USD", nominalRevenue));
        views.setTextViewText(R.id.widget_kpi_tasks, tasksCount + " Tasks");
        views.setTextViewText(R.id.widget_kpi_tasks_badge, tasksCount == 0 ? "✓ Clear" : "Pending");

        // Update Date Category Tabs (1W, 1M, 3W, YTD, Total)
        String[] periods = {"1W", "1M", "3W", "YTD", "Total"};
        int[] tabIds = {
            R.id.widget_tab_1w,
            R.id.widget_tab_1m,
            R.id.widget_tab_3w,
            R.id.widget_tab_ytd,
            R.id.widget_tab_total
        };

        int mutedColor = isDark ? Color.parseColor("#94a3b8") : Color.parseColor("#64748b");
        // Always dark high-contrast text on both white and cyan active pills
        int activeColor = Color.parseColor("#0f172a");
        int activePillBg = isDark ? R.drawable.widget_tab_active_pill_dark : R.drawable.widget_tab_active_pill;

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        for (int i = 0; i < periods.length; i++) {
            String p = periods[i];
            int tid = tabIds[i];
            boolean isSelected = p.equalsIgnoreCase(activePeriod);

            if (isSelected) {
                views.setInt(tid, "setBackgroundResource", activePillBg);
                views.setTextColor(tid, activeColor);
            } else {
                views.setInt(tid, "setBackgroundResource", 0);
                views.setTextColor(tid, mutedColor);
            }

            // Click intent to select / deselect this period
            Intent pIntent = new Intent(context, StockWidgetProvider.class);
            pIntent.setAction(ACTION_SELECT_PERIOD);
            pIntent.putExtra(EXTRA_PERIOD, p);
            PendingIntent pi = PendingIntent.getBroadcast(context, 200 + i, pIntent, flags);
            views.setOnClickPendingIntent(tid, pi);
        }

        // Highlight selected metric row (total, low, out, tasks) or none if deselected
        int[] rowIds = {
            R.id.widget_row_total,
            R.id.widget_row_low,
            R.id.widget_row_out,
            R.id.widget_row_tasks
        };
        String[] catKeys = {"total", "low", "out", "tasks"};
        int selectedRowBg = isDark ? R.drawable.widget_row_selected_dark_bg : R.drawable.widget_row_selected_bg;

        for (int j = 0; j < catKeys.length; j++) {
            String c = catKeys[j];
            int rid = rowIds[j];
            boolean isCatSelected = c.equalsIgnoreCase(activeCategory);

            if (isCatSelected) {
                views.setInt(rid, "setBackgroundResource", selectedRowBg);
            } else {
                views.setInt(rid, "setBackgroundResource", 0);
            }

            // Click intent to select / deselect this metric category
            Intent cIntent = new Intent(context, StockWidgetProvider.class);
            cIntent.setAction(ACTION_SELECT_CATEGORY);
            cIntent.putExtra(EXTRA_CATEGORY, c);
            PendingIntent ci = PendingIntent.getBroadcast(context, 300 + j, cIntent, flags);
            views.setOnClickPendingIntent(rid, ci);
        }

        // Generate and set the Donut Gauge Bitmap showing all 4 segments + active selection
        try {
            Bitmap gaugeBmp = createActivityDonutBitmap(
                context,
                totalItems,
                lowStock,
                outStock,
                tasksCount,
                activeCategory,
                isDark
            );
            if (gaugeBmp != null) {
                views.setImageViewBitmap(R.id.widget_gauge_img, gaugeBmp);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // PendingIntent to launch app into inventory modal/overview
        Intent appIntent = new Intent(context, MainActivity.class);
        appIntent.setAction(Intent.ACTION_MAIN);
        appIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        appIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        appIntent.putExtra("openModal", activeCategory);
        appIntent.putExtra("period", activePeriod);

        PendingIntent appPendingIntent = PendingIntent.getActivity(context, 0, appIntent, flags);
        views.setOnClickPendingIntent(R.id.widget_root, appPendingIntent);
        views.setOnClickPendingIntent(R.id.widget_btn_open, appPendingIntent);

        // PendingIntent to toggle light/dark theme directly from the widget
        Intent toggleIntent = new Intent(context, StockWidgetProvider.class);
        toggleIntent.setAction(ACTION_TOGGLE_THEME);
        PendingIntent togglePendingIntent = PendingIntent.getBroadcast(context, 101, toggleIntent, flags);
        views.setOnClickPendingIntent(R.id.widget_theme_toggle, togglePendingIntent);
        views.setTextViewText(R.id.widget_theme_toggle, isDark ? "☀️" : "🌙");

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    /**
     * Programmatically render the Dribbble-inspired Donut Gauge chart with separated arcs & text.
     */
    private static Bitmap createActivityDonutBitmap(
        Context context,
        int totalItems,
        int lowStock,
        int outStock,
        int tasksCount,
        String selectedCategory,
        boolean isDark
    ) {
        int size = 260; // crisp high-DPI bitmap
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        float stroke = 22f;
        float padding = stroke / 2f + 8f;
        RectF oval = new RectF(padding, padding, size - padding, size - padding);

        // Background track ring
        Paint trackPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        trackPaint.setStyle(Paint.Style.STROKE);
        trackPaint.setStrokeWidth(stroke);
        trackPaint.setColor(isDark ? Color.parseColor("#1e293b") : Color.parseColor("#e2e8f0"));
        canvas.drawOval(oval, trackPaint);

        // Palette definition
        int blueColor = Color.parseColor("#38bdf8");   // Total Item
        int orangeColor = Color.parseColor("#f59e0b"); // Low Stock
        int pinkColor = Color.parseColor("#ec4899");   // Out of Stock
        int greenColor = Color.parseColor("#10b981");  // Tasks to do

        // Arc sweep setup with 18 degree gaps between rounded caps to prevent collisions
        float gap = 18f;
        float startAngle = -90f;

        float sweepTotal = 130f;
        float sweepLow = 75f;
        float sweepOut = 55f;
        float sweepTasks = 28f;

        drawDonutArc(canvas, oval, startAngle, sweepTotal, stroke, blueColor, "total".equalsIgnoreCase(selectedCategory));

        startAngle += sweepTotal + gap;
        drawDonutArc(canvas, oval, startAngle, sweepLow, stroke, orangeColor, "low".equalsIgnoreCase(selectedCategory));

        startAngle += sweepLow + gap;
        drawDonutArc(canvas, oval, startAngle, sweepOut, stroke, pinkColor, "out".equalsIgnoreCase(selectedCategory));

        startAngle += sweepOut + gap;
        drawDonutArc(canvas, oval, startAngle, sweepTasks, stroke, greenColor, "tasks".equalsIgnoreCase(selectedCategory));

        // Center display logic
        String displayCount = String.valueOf(totalItems);
        String displayLabel = "Total Stock";

        if ("low".equalsIgnoreCase(selectedCategory)) {
            displayCount = String.valueOf(lowStock);
            displayLabel = "Low Stock";
        } else if ("out".equalsIgnoreCase(selectedCategory)) {
            displayCount = String.valueOf(outStock);
            displayLabel = "Out of Stock";
        } else if ("tasks".equalsIgnoreCase(selectedCategory)) {
            displayCount = String.valueOf(tasksCount);
            displayLabel = "Tasks To Do";
        }

        // Center number
        Paint numberPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        numberPaint.setColor(isDark ? Color.parseColor("#f8fafc") : Color.parseColor("#0f172a"));
        numberPaint.setTextSize(54f);
        numberPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        numberPaint.setTextAlign(Paint.Align.CENTER);

        // Center label
        Paint labelPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        labelPaint.setColor(isDark ? Color.parseColor("#94a3b8") : Color.parseColor("#64748b"));
        labelPaint.setTextSize(19f);
        labelPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.NORMAL));
        labelPaint.setTextAlign(Paint.Align.CENTER);

        Rect bounds = new Rect();
        numberPaint.getTextBounds(displayCount, 0, displayCount.length(), bounds);

        canvas.drawText(displayCount, size / 2f, size / 2f - 4f, numberPaint);
        canvas.drawText(displayLabel, size / 2f, size / 2f + 24f, labelPaint);

        return bitmap;
    }

    private static void drawDonutArc(
        Canvas canvas,
        RectF oval,
        float startAngle,
        float sweepAngle,
        float stroke,
        int color,
        boolean isSelected
    ) {
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeCap(Paint.Cap.ROUND);
        paint.setColor(color);

        if (isSelected) {
            paint.setStrokeWidth(stroke + 6f);
            paint.setAlpha(255);
        } else {
            paint.setStrokeWidth(stroke);
            paint.setAlpha(235);
        }

        canvas.drawArc(oval, startAngle, sweepAngle, false, paint);
    }

    /**
     * Background inventory fetch from Supabase to automatically populate live counts
     */
    public static void fetchInventoryInBackground(final Context context) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection conn = null;
                try {
                    String urlStr = "https://fjsqkyapsbdwxkvsstgm.supabase.co/rest/v1/items?select=id,name,quantity,price,total_price,status";
                    URL url = new URL(urlStr);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(8000);
                    conn.setRequestProperty("apikey", "sb_publishable_1YvgGKxOSf4LfRdzktOamg_xP93FKqf");
                    conn.setRequestProperty("Authorization", "Bearer sb_publishable_1YvgGKxOSf4LfRdzktOamg_xP93FKqf");

                    int responseCode = conn.getResponseCode();
                    if (responseCode == 200) {
                        BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) {
                            sb.append(line);
                        }
                        reader.close();

                        JSONArray items = new JSONArray(sb.toString());
                        int total = items.length();
                        int lowCount = 0;
                        int outCount = 0;
                        double balanceTotal = 0.0;

                        int outLimit = 20;
                        int lowLimit = 30;

                        for (int i = 0; i < items.length(); i++) {
                            JSONObject item = items.getJSONObject(i);
                            int qty = item.optInt("quantity", 0);
                            double price = item.optDouble("price", 0.0);
                            double tp = item.optDouble("total_price", 0.0);
                            String status = item.optString("status", "");

                            if (tp > 0) {
                                balanceTotal += tp;
                            } else {
                                balanceTotal += (price * qty);
                            }

                            if (qty < outLimit || "OUT".equalsIgnoreCase(status)) {
                                outCount++;
                            } else if (qty < lowLimit) {
                                lowCount++;
                            }
                        }

                        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                        SharedPreferences.Editor editor = prefs.edit()
                            .putInt("total_items_count", total)
                            .putInt("low_stock_count", lowCount)
                            .putInt("out_of_stock_count", outCount);

                        if (balanceTotal > 0) {
                            editor.putInt("nominal_balance", (int) Math.round(balanceTotal));
                            editor.putInt("nominal_revenue", (int) Math.round(balanceTotal));
                        }
                        editor.apply();

                        // Notify widget to refresh with fresh live data
                        notifyDataChanged(context);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    if (conn != null) conn.disconnect();
                }
            }
        }).start();
    }

    public static void notifyDataChanged(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName widgetComponent = new ComponentName(context, StockWidgetProvider.class);
        int[] widgetIds = manager.getAppWidgetIds(widgetComponent);
        if (widgetIds != null && widgetIds.length > 0) {
            Intent intent = new Intent(context, StockWidgetProvider.class);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds);
            context.sendBroadcast(intent);
        }
    }
}
