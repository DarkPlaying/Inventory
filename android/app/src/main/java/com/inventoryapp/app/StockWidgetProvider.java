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
import android.widget.RemoteViews;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
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

        String todayTasks = prefs.getString("today_tasks_text", "Aim 50 (Now 11) • All stocks on track!");

        RemoteViews views = new RemoteViews(context.getPackageName(), layoutId);

        // Bind metric values
        views.setTextViewText(R.id.widget_total_items, String.valueOf(totalItems));
        views.setTextViewText(R.id.widget_low_stock, String.valueOf(lowStock));
        views.setTextViewText(R.id.widget_out_stock, String.valueOf(outStock));
        views.setTextViewText(R.id.widget_tasks_count, String.valueOf(tasksCount));
        views.setTextViewText(R.id.widget_today_tasks, todayTasks);

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
        int activeColor = Color.parseColor("#0f172a");

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        for (int i = 0; i < periods.length; i++) {
            String p = periods[i];
            int tid = tabIds[i];
            boolean isSelected = p.equalsIgnoreCase(activePeriod);

            if (isSelected) {
                views.setInt(tid, "setBackgroundResource", R.drawable.widget_tab_active_pill);
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

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    /**
     * Dynamically renders the multi-colored circular donut ring chart matching img 2.
     * Guarantees all 4 colors (Blue, Orange, Green, Pink) are ALWAYS visibly rendered,
     * accounts for rounded cap spacing, and clearly highlights the selected category.
     */
    private static Bitmap createActivityDonutBitmap(
        Context context,
        int totalItems,
        int lowStock,
        int outStock,
        int tasksCount,
        String activeCategory,
        boolean isDark
    ) {
        int size = 260;
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        float baseStrokeWidth = 22f;
        float padding = baseStrokeWidth / 2f + 8f;
        RectF oval = new RectF(padding, padding, size - padding, size - padding);

        // Base background track ring
        Paint trackPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        trackPaint.setStyle(Paint.Style.STROKE);
        trackPaint.setStrokeWidth(baseStrokeWidth);
        trackPaint.setColor(isDark ? Color.parseColor("#334155") : Color.parseColor("#f1f5f9"));
        canvas.drawOval(oval, trackPaint);

        // Segment colors matching img 2
        int colorBlue = Color.parseColor("#0ea5e9");   // Total Item / In Stock
        int colorOrange = Color.parseColor("#f59e0b"); // Low Stock
        int colorPink = Color.parseColor("#ec4899");   // Out of Stock
        int colorGreen = Color.parseColor("#10b981");  // Tasks to do

        int[] colors = new int[]{colorBlue, colorOrange, colorPink, colorGreen};
        String[] catKeys = new String[]{"total", "low", "out", "tasks"};

        // Base proportion allocation guaranteeing all 4 colors are ALWAYS visually distinct
        float minShare = 0.14f;
        float remainingShare = 1.0f - (minShare * 4); // ~0.44 to distribute based on counts

        int valBlue = Math.max(0, totalItems - lowStock - outStock);
        int valOrange = Math.max(0, lowStock);
        int valPink = Math.max(0, outStock);
        int valGreen = Math.max(0, tasksCount);
        int totalSum = valBlue + valOrange + valPink + valGreen;

        float[] shares = new float[4];
        for (int i = 0; i < 4; i++) {
            int val = (i == 0) ? valBlue : (i == 1) ? valOrange : (i == 2) ? valPink : valGreen;
            float extra = totalSum > 0 ? ((float) val / totalSum) * remainingShare : (remainingShare / 4f);
            shares[i] = minShare + extra;
        }

        Paint arcPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        arcPaint.setStyle(Paint.Style.STROKE);
        arcPaint.setStrokeCap(Paint.Cap.ROUND);

        float currentAngle = -90f; // start at 12 o'clock
        // Gap of 18 degrees accounts for rounded stroke caps and ensures clear visible spacing between arcs
        float gap = 18f;

        for (int i = 0; i < 4; i++) {
            float sweep = shares[i] * 360f;
            boolean isThisSelected = catKeys[i].equalsIgnoreCase(activeCategory);

            // Highlight the selected segment with thicker stroke
            arcPaint.setStrokeWidth(isThisSelected ? 28f : baseStrokeWidth);
            arcPaint.setColor(colors[i]);

            if (sweep > gap + 4f) {
                canvas.drawArc(oval, currentAngle + (gap / 2f), sweep - gap, false, arcPaint);
            }
            currentAngle += sweep;
        }

        // Center Text: Show count and label for the SELECTED category with clean vertical spacing
        String centerCount;
        String centerLabel;
        int accentColor;

        if ("low".equalsIgnoreCase(activeCategory)) {
            centerCount = String.valueOf(lowStock);
            centerLabel = "Low Stock";
            accentColor = colorOrange;
        } else if ("out".equalsIgnoreCase(activeCategory)) {
            centerCount = String.valueOf(outStock);
            centerLabel = "Out of Stock";
            accentColor = colorPink;
        } else if ("tasks".equalsIgnoreCase(activeCategory)) {
            centerCount = String.valueOf(tasksCount);
            centerLabel = "Tasks to do";
            accentColor = colorGreen;
        } else {
            // "total", "none", or default
            centerCount = String.valueOf(totalItems > 0 ? totalItems : 11);
            centerLabel = "Total Items";
            accentColor = colorBlue;
        }

        // Center Number - positioned above center
        Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        textPaint.setColor(isDark ? Color.parseColor("#f8fafc") : Color.parseColor("#0f172a"));
        textPaint.setTextSize(44f);

        // Baseline placed slightly above vertical center to prevent collision with label below
        float countBaselineY = size / 2f - 4f;
        canvas.drawText(centerCount, size / 2f, countBaselineY, textPaint);

        // Center Subtitle - positioned below center with ample spacing
        Paint labelPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        labelPaint.setTextAlign(Paint.Align.CENTER);
        labelPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        labelPaint.setColor(accentColor);
        labelPaint.setTextSize(17f);

        float labelBaselineY = size / 2f + 24f;
        canvas.drawText(centerLabel, size / 2f, labelBaselineY, labelPaint);

        return bitmap;
    }

    /**
     * Directly loads the live inventory from Supabase in the background to keep widget data fresh
     */
    public static void fetchInventoryInBackground(final Context context) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection conn = null;
                try {
                    String urlStr = "https://fjsqkyapsbdwxkvsstgm.supabase.co/rest/v1/items?select=id,name,quantity,status";
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

                        int outLimit = 20;
                        int lowLimit = 30;

                        for (int i = 0; i < items.length(); i++) {
                            JSONObject item = items.getJSONObject(i);
                            int qty = item.optInt("quantity", 0);
                            String status = item.optString("status", "");

                            if (qty < outLimit || "OUT".equalsIgnoreCase(status)) {
                                outCount++;
                            } else if (qty < lowLimit) {
                                lowCount++;
                            }
                        }

                        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                        prefs.edit()
                            .putInt("total_items_count", total)
                            .putInt("low_stock_count", lowCount)
                            .putInt("out_of_stock_count", outCount)
                            .apply();

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
            for (int id : widgetIds) {
                updateAppWidget(context, manager, id);
            }
        }
    }
}
