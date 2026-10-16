import WidgetKit
import SwiftUI

struct StockWidgetEntry: TimelineEntry {
    let date: Date
    let totalItems: Int
    let lowStock: Int
    let outStock: Int
    let todayTasks: String
    let tomorrowTasks: String
    let theme: String
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> StockWidgetEntry {
        StockWidgetEntry(
            date: Date(),
            totalItems: 11,
            lowStock: 0,
            outStock: 0,
            todayTasks: "Test: Aim 50 (Now 12)",
            tomorrowTasks: "Kurti: Aim 50 (Now 25)",
            theme: "light"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (StockWidgetEntry) -> Void) {
        completion(placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StockWidgetEntry>) -> Void) {
        let entry = loadData()
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadData() -> StockWidgetEntry {
        let defaults = UserDefaults(suiteName: "group.com.inventoryapp.app") ?? UserDefaults.standard
        let total = defaults.integer(forKey: "widget_total_items")
        let low = defaults.integer(forKey: "widget_low_stock")
        let out = defaults.integer(forKey: "widget_out_stock")
        let today = defaults.string(forKey: "widget_today_tasks") ?? "Test: Aim 50 (Now 12)"
        let tomorrow = defaults.string(forKey: "widget_tomorrow_tasks") ?? "Kurti: Aim 50 (Now 25)"
        let theme = defaults.string(forKey: "widget_theme") ?? "light"

        return StockWidgetEntry(
            date: Date(),
            totalItems: total > 0 ? total : 11,
            lowStock: low,
            outStock: out,
            todayTasks: today.isEmpty ? "No pending aim tasks today" : today,
            tomorrowTasks: tomorrow.isEmpty ? "None" : tomorrow,
            theme: theme
        )
    }
}

struct StockWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var isDark: Bool {
        entry.theme == "dark" || entry.theme == "black"
    }

    var body: some View {
        ZStack {
            if isDark {
                LinearGradient(
                    gradient: Gradient(colors: [Color(hex: "0B0F19"), Color(hex: "111827")]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            } else {
                LinearGradient(
                    gradient: Gradient(colors: [Color(hex: "FFFFFF"), Color(hex: "F8FAFC")]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }

            VStack(alignment: .leading, spacing: 6) {
                // Header
                HStack {
                    Text("📦 Stock & Aiming")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(isDark ? .white : Color(hex: "0F172A"))
                    Spacer()
                    Text("Live Sync")
                        .font(.system(size: 9, weight: .semibold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.blue.opacity(0.15))
                        .foregroundColor(.blue)
                        .cornerRadius(6)
                }

                // Stats row
                HStack(spacing: 4) {
                    statPill(label: "Items", value: "\(entry.totalItems)", color: .blue)
                    statPill(label: "Low", value: "\(entry.lowStock)", color: .orange)
                    statPill(label: "Out", value: "\(entry.outStock)", color: .red)
                }

                // Tasks Content Box
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 4) {
                        Text("🎯 TODAY:")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(isDark ? Color(hex: "38BDF8") : Color(hex: "0284C7"))
                        Text(entry.todayTasks)
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(isDark ? Color(hex: "F1F5F9") : Color(hex: "1E293B"))
                            .lineLimit(1)
                    }

                    if family != .systemSmall {
                        HStack(spacing: 4) {
                            Text("⏳ TOMORROW:")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(isDark ? Color(hex: "94A3B8") : Color(hex: "64748B"))
                            Text(entry.tomorrowTasks)
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(isDark ? Color(hex: "CBD5E1") : Color(hex: "475569"))
                                .lineLimit(1)
                        }
                    }
                }
                .padding(6)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(isDark ? Color.white.opacity(0.06) : Color.black.opacity(0.03))
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(isDark ? Color.white.opacity(0.1) : Color.black.opacity(0.06), lineWidth: 1)
                )

                if family != .systemSmall {
                    Spacer(minLength: 0)
                    // Footer Action button
                    HStack {
                        Spacer()
                        Text("Open App & Tasks ➔")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(Color.blue)
                            .cornerRadius(6)
                        Spacer()
                    }
                }
            }
            .padding(12)
        }
        .widgetURL(URL(string: "inventoryapp://stock-tasks"))
    }

    private func statPill(label: String, value: String, color: Color) -> some View {
        VStack(spacing: 1) {
            Text(label.uppercased())
                .font(.system(size: 8, weight: .semibold))
                .foregroundColor(color)
            Text(value)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(isDark ? .white : Color(hex: "0F172A"))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 3)
        .background(color.opacity(0.12))
        .cornerRadius(6)
    }
}

extension Color {
    init(hex: String) {
        let scanner = Scanner(string: hex)
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)
        let r = Double((rgbValue & 0xFF0000) >> 16) / 255.0
        let g = Double((rgbValue & 0x00FF00) >> 8) / 255.0
        let b = Double(rgbValue & 0x0000FF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}

@main
struct StockWidget: Widget {
    let kind: String = "StockWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            StockWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Stock & Aiming Reminder")
        .description("Track inventory counts and daily stock aim tasks right from your Home Screen.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
