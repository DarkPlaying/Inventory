import WidgetKit
import SwiftUI

struct StockWidgetEntry: TimelineEntry {
    let date: Date
    let totalItems: Int
    let lowStock: Int
    let outStock: Int
    let tasksCount: Int
    let nominalBalance: Int
    let nominalRevenue: Int
    let todayTasks: String
    let tomorrowTasks: String
    let theme: String
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> StockWidgetEntry {
        StockWidgetEntry(
            date: Date(),
            totalItems: 89,
            lowStock: 12,
            outStock: 9,
            tasksCount: 5,
            nominalBalance: 20852,
            nominalRevenue: 20852,
            todayTasks: "Aim 50 (Now 12)",
            tomorrowTasks: "Kurti: Aim 50",
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
        let tasks = defaults.integer(forKey: "widget_tasks_count")
        let balance = defaults.integer(forKey: "widget_balance")
        let revenue = defaults.integer(forKey: "widget_revenue")
        let today = defaults.string(forKey: "widget_today_tasks") ?? "All stock aims completed"
        let tomorrow = defaults.string(forKey: "widget_tomorrow_tasks") ?? "None"
        let theme = defaults.string(forKey: "widget_theme") ?? "light"

        return StockWidgetEntry(
            date: Date(),
            totalItems: total > 0 ? total : 89,
            lowStock: low,
            outStock: out,
            tasksCount: tasks,
            nominalBalance: balance > 0 ? balance : 20852,
            nominalRevenue: revenue > 0 ? revenue : 20852,
            todayTasks: today.isEmpty ? "All stock aims completed" : today,
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
                    gradient: Gradient(colors: [Color(hex: "0F172A"), Color(hex: "1E293B")]),
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

            switch family {
            case .systemSmall:
                smallWidgetView
            case .systemLarge:
                largeWidgetView
            default:
                mediumWidgetView
            }
        }
        .widgetURL(URL(string: "inventoryapp://stock-tasks"))
    }

    // MARK: - Small Widget (158x158)
    private var smallWidgetView: some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Circle()
                    .fill(Color(hex: "F59E0B"))
                    .frame(width: 8, height: 8)
                Text("Stock Activity")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(isDark ? .white : Color(hex: "0F172A"))
                    .lineLimit(1)
                Spacer()
            }

            // Donut Ring Gauge
            ZStack {
                Circle()
                    .stroke(Color(hex: "E2E8F0").opacity(isDark ? 0.2 : 0.8), lineWidth: 8)
                    .frame(width: 72, height: 72)

                // Blue arc: Total Items
                Circle()
                    .trim(from: 0.0, to: 0.38)
                    .stroke(Color(hex: "38BDF8"), style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .frame(width: 72, height: 72)

                // Orange arc: Low Stock
                Circle()
                    .trim(from: 0.43, to: 0.65)
                    .stroke(Color(hex: "F59E0B"), style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .frame(width: 72, height: 72)

                // Pink/Red arc: Out of Stock
                Circle()
                    .trim(from: 0.70, to: 0.88)
                    .stroke(Color(hex: "EC4899"), style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .frame(width: 72, height: 72)

                // Green arc: Tasks To Do
                Circle()
                    .trim(from: 0.92, to: 0.98)
                    .stroke(Color(hex: "10B981"), style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .frame(width: 72, height: 72)

                VStack(spacing: 0) {
                    Text("\(entry.totalItems)")
                        .font(.system(size: 14, weight: .heavy))
                        .foregroundColor(isDark ? .white : Color(hex: "0F172A"))
                    Text("Total Items")
                        .font(.system(size: 7.5, weight: .medium))
                        .foregroundColor(Color(hex: "94A3B8"))
                }
            }

            // Compact Badges
            HStack(spacing: 3) {
                miniBadge(color: Color(hex: "38BDF8"), text: "\(entry.totalItems)")
                miniBadge(color: Color(hex: "F59E0B"), text: "\(entry.lowStock)")
                miniBadge(color: Color(hex: "EC4899"), text: "\(entry.outStock)")
                miniBadge(color: Color(hex: "10B981"), text: "\(entry.tasksCount)T")
            }
        }
        .padding(10)
    }

    // MARK: - Medium Widget (338x158) - Exact UI matching user screenshot
    private var mediumWidgetView: some View {
        HStack(spacing: 12) {
            // Left: Circular Gauge with center Total Items
            VStack(spacing: 4) {
                HStack(spacing: 4) {
                    Circle()
                        .fill(Color(hex: "F59E0B"))
                        .frame(width: 8, height: 8)
                    Text("Product Activity")
                        .font(.system(size: 11.5, weight: .bold))
                        .foregroundColor(isDark ? .white : Color(hex: "0F172A"))
                }

                ZStack {
                    Circle()
                        .stroke(Color(hex: "E2E8F0").opacity(isDark ? 0.2 : 0.8), lineWidth: 10)
                        .frame(width: 84, height: 84)

                    // Blue: Total Items
                    Circle()
                        .trim(from: 0.02, to: 0.38)
                        .stroke(Color(hex: "38BDF8"), style: StrokeStyle(lineWidth: 10, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .frame(width: 84, height: 84)

                    // Orange: Low Stock
                    Circle()
                        .trim(from: 0.42, to: 0.66)
                        .stroke(Color(hex: "F59E0B"), style: StrokeStyle(lineWidth: 10, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .frame(width: 84, height: 84)

                    // Pink: Out of Stock
                    Circle()
                        .trim(from: 0.70, to: 0.86)
                        .stroke(Color(hex: "EC4899"), style: StrokeStyle(lineWidth: 10, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .frame(width: 84, height: 84)

                    // Green: Tasks
                    Circle()
                        .trim(from: 0.90, to: 0.98)
                        .stroke(Color(hex: "10B981"), style: StrokeStyle(lineWidth: 10, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .frame(width: 84, height: 84)

                    VStack(spacing: 0) {
                        Text("\(entry.totalItems)")
                            .font(.system(size: 16, weight: .heavy))
                            .foregroundColor(isDark ? .white : Color(hex: "0F172A"))
                        Text("Total Items")
                            .font(.system(size: 8, weight: .semibold))
                            .foregroundColor(Color(hex: "94A3B8"))
                    }
                }
            }
            .frame(width: 110)

            // Right: 4 rows replacing To Be Packed / Delivery with Total Item, Low, Out & Tasks
            VStack(alignment: .leading, spacing: 5) {
                legendRow(
                    bulletColor: Color(hex: "38BDF8"),
                    title: "Total Item",
                    count: "\(entry.totalItems)"
                )
                legendRow(
                    bulletColor: Color(hex: "F59E0B"),
                    title: "Low Stock",
                    count: "\(entry.lowStock)"
                )
                legendRow(
                    bulletColor: Color(hex: "EC4899"),
                    title: "Out of Stock",
                    count: "\(entry.outStock)"
                )
                legendRow(
                    bulletColor: Color(hex: "10B981"),
                    title: "Tasks To Do",
                    count: "\(entry.tasksCount)"
                )

                // Task Need to Be Done Highlight
                HStack(spacing: 4) {
                    Text("🎯")
                        .font(.system(size: 8.5))
                    Text(entry.todayTasks)
                        .font(.system(size: 9.5, weight: .semibold))
                        .foregroundColor(isDark ? Color(hex: "38BDF8") : Color(hex: "0284C7"))
                        .lineLimit(1)
                }
                .padding(.horizontal, 6)
                .padding(.vertical, 3)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(isDark ? Color.white.opacity(0.06) : Color(hex: "0284C7").opacity(0.08))
                .cornerRadius(6)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(12)
    }

    // MARK: - Large Widget (338x354)
    private var largeWidgetView: some View {
        VStack(spacing: 12) {
            mediumWidgetView

            Divider()
                .background(isDark ? Color.white.opacity(0.1) : Color.black.opacity(0.08))

            // 2x2 Metric Cards matching Dribbble reference
            VStack(spacing: 8) {
                HStack(spacing: 8) {
                    metricCard(
                        iconColor: Color(hex: "EC4899"),
                        title: "Nominal Balance",
                        amount: "\(entry.nominalBalance.formatted()) USD",
                        badge: "↑ 1.19%",
                        isPositive: true
                    )
                    metricCard(
                        iconColor: Color(hex: "38BDF8"),
                        title: "Total Stock Product",
                        amount: "\(entry.totalItems)",
                        badge: "↑ 0.29%",
                        isPositive: true
                    )
                }

                HStack(spacing: 8) {
                    metricCard(
                        iconColor: Color(hex: "10B981"),
                        title: "Nominal Revenue",
                        amount: "\(entry.nominalRevenue.formatted()) USD",
                        badge: "↑ 0.29%",
                        isPositive: true
                    )
                    metricCard(
                        iconColor: Color(hex: "8B5CF6"),
                        title: "Tasks Remaining",
                        amount: "\(entry.tasksCount) tasks",
                        badge: entry.tasksCount == 0 ? "✓ Clear" : "Pending",
                        isPositive: entry.tasksCount == 0
                    )
                }
            }
        }
        .padding(14)
    }

    private func legendRow(bulletColor: Color, title: String, count: String) -> some View {
        HStack {
            RoundedRectangle(cornerRadius: 2)
                .fill(bulletColor)
                .frame(width: 7, height: 7)
            Text(title)
                .font(.system(size: 10.5, weight: .medium))
                .foregroundColor(isDark ? Color(hex: "CBD5E1") : Color(hex: "475569"))
            Spacer()
            Text(count)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(isDark ? .white : Color(hex: "0F172A"))
        }
    }

    private func miniBadge(color: Color, text: String) -> some View {
        Text(text)
            .font(.system(size: 8.5, weight: .bold))
            .foregroundColor(color)
            .padding(.horizontal, 4)
            .padding(.vertical, 2)
            .background(color.opacity(0.12))
            .cornerRadius(4)
    }

    private func metricCard(iconColor: Color, title: String, amount: String, badge: String, isPositive: Bool) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack {
                Circle()
                    .fill(iconColor.opacity(0.18))
                    .frame(width: 14, height: 14)
                Text(title)
                    .font(.system(size: 8.5, weight: .semibold))
                    .foregroundColor(Color(hex: "64748B"))
                    .lineLimit(1)
            }
            Text(amount)
                .font(.system(size: 11.5, weight: .heavy))
                .foregroundColor(isDark ? .white : Color(hex: "0F172A"))
                .lineLimit(1)
            Text(badge)
                .font(.system(size: 7.5, weight: .bold))
                .foregroundColor(isPositive ? Color(hex: "10B981") : Color(hex: "EF4444"))
        }
        .padding(7)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(isDark ? Color.white.opacity(0.05) : Color.white)
        .cornerRadius(10)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(isDark ? Color.white.opacity(0.08) : Color(hex: "E2E8F0"), lineWidth: 1)
        )
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
        .configurationDisplayName("Stock & Task Activity")
        .description("Track Total Items, Low Stock, Out of Stock, and Tasks right on your Home Screen.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
