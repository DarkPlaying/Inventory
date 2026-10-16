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
            lowStock: 0,
            outStock: 0,
            tasksCount: 0,
            nominalBalance: 26852,
            nominalRevenue: 26852,
            todayTasks: "All stock aims completed",
            tomorrowTasks: "None",
            theme: "light"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (StockWidgetEntry) -> Void) {
        if context.isPreview {
            completion(placeholder(in: context))
            return
        }
        completion(loadData())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StockWidgetEntry>) -> Void) {
        fetchRealtimeData { entry in
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            completion(timeline)
        }
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
            nominalBalance: balance > 0 ? balance : 26852,
            nominalRevenue: revenue > 0 ? revenue : 26852,
            todayTasks: today.isEmpty ? "All stock aims completed" : today,
            tomorrowTasks: tomorrow.isEmpty ? "None" : tomorrow,
            theme: theme
        )
    }

    private func fetchRealtimeData(completion: @escaping (StockWidgetEntry) -> Void) {
        let cached = loadData()
        guard let url = URL(string: "https://fjsqkyapsbdwxkvsstgm.supabase.co/rest/v1/items?select=id,name,quantity,price,total_price,status") else {
            completion(cached)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 7.0
        request.setValue("sb_publishable_1YvgGKxOSf4LfRdzktOamg_xP93FKqf", forHTTPHeaderField: "apikey")
        request.setValue("Bearer sb_publishable_1YvgGKxOSf4LfRdzktOamg_xP93FKqf", forHTTPHeaderField: "Authorization")

        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data, error == nil,
                  let jsonArray = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
                completion(cached)
                return
            }

            let total = jsonArray.count
            var lowCount = 0
            var outCount = 0
            var balanceTotal: Double = 0.0

            let outLimit = 20
            let lowLimit = 30

            for item in jsonArray {
                let qty = (item["quantity"] as? Int) ?? Int((item["quantity"] as? Double) ?? 0)
                let price = (item["price"] as? Double) ?? Double((item["price"] as? Int) ?? 0)
                let tp = (item["total_price"] as? Double) ?? Double((item["total_price"] as? Int) ?? 0)
                let status = (item["status"] as? String) ?? ""

                if tp > 0 {
                    balanceTotal += tp
                } else {
                    balanceTotal += (price * Double(qty))
                }

                if qty < outLimit || status.uppercased() == "OUT" {
                    outCount += 1
                } else if qty < lowLimit {
                    lowCount += 1
                }
            }

            let defaults = UserDefaults(suiteName: "group.com.inventoryapp.app") ?? UserDefaults.standard
            defaults.set(total, forKey: "widget_total_items")
            defaults.set(lowCount, forKey: "widget_low_stock")
            defaults.set(outCount, forKey: "widget_out_stock")
            if balanceTotal > 0 {
                defaults.set(Int(balanceTotal), forKey: "widget_balance")
                defaults.set(Int(balanceTotal), forKey: "widget_revenue")
            }
            defaults.synchronize()

            let tasks = defaults.integer(forKey: "widget_tasks_count")
            let savedRevenue = defaults.integer(forKey: "widget_revenue")
            let today = defaults.string(forKey: "widget_today_tasks") ?? "All stock aims completed"
            let tomorrow = defaults.string(forKey: "widget_tomorrow_tasks") ?? "None"
            let theme = defaults.string(forKey: "widget_theme") ?? "light"

            let freshEntry = StockWidgetEntry(
                date: Date(),
                totalItems: total,
                lowStock: lowCount,
                outStock: outCount,
                tasksCount: tasks,
                nominalBalance: balanceTotal > 0 ? Int(balanceTotal) : cached.nominalBalance,
                nominalRevenue: savedRevenue > 0 ? savedRevenue : (balanceTotal > 0 ? Int(balanceTotal) : cached.nominalRevenue),
                todayTasks: today.isEmpty ? "All stock aims completed" : today,
                tomorrowTasks: tomorrow.isEmpty ? "None" : tomorrow,
                theme: theme
            )
            completion(freshEntry)
        }
        task.resume()
    }
}

struct StockWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var isDark: Bool {
        entry.theme == "dark" || entry.theme == "black"
    }

    private var backgroundGradient: some View {
        Group {
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
        }
    }

    private var widgetContent: some View {
        Group {
            switch family {
            case .systemLarge:
                largeWidgetView
            case .systemSmall:
                smallWidgetView
            default:
                mediumWidgetView
            }
        }
        .widgetURL(URL(string: "inventoryapp://stock-tasks"))
    }

    var body: some View {
        if #available(iOSApplicationExtension 17.0, *) {
            widgetContent
                .containerBackground(for: .widget) {
                    backgroundGradient
                }
        } else {
            ZStack {
                backgroundGradient
                widgetContent
            }
        }
    }

    // MARK: - Small Widget (158x158)
    private var smallWidgetView: some View {
        VStack(spacing: 5) {
            HStack(spacing: 4) {
                Circle()
                    .fill(Color(hex: "F59E0B"))
                    .frame(width: 7, height: 7)
                Text("Stock Activity")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(isDark ? .white : Color(hex: "0F172A"))
                    .lineLimit(1)
                Spacer()
            }

            donutChart(size: 72, stroke: 8)

            HStack(spacing: 3) {
                miniBadge(color: Color(hex: "38BDF8"), text: "\(entry.totalItems)")
                miniBadge(color: Color(hex: "F59E0B"), text: "\(entry.lowStock)")
                miniBadge(color: Color(hex: "EC4899"), text: "\(entry.outStock)")
                miniBadge(color: Color(hex: "10B981"), text: "\(entry.tasksCount)T")
            }
        }
        .padding(10)
    }

    // MARK: - Medium Widget (338x158)
    private var mediumWidgetView: some View {
        VStack(spacing: 6) {
            // Header Bar
            HStack(spacing: 6) {
                HStack(spacing: 6) {
                    Circle()
                        .fill(Color(hex: "F59E0B"))
                        .frame(width: 8, height: 8)
                    Text("Product Activity")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(isDark ? .white : Color(hex: "0F172A"))
                }
                Spacer()
                HStack(spacing: 3) {
                    filterPill("1W", active: false)
                    filterPill("1M", active: false)
                    filterPill("Total", active: true)
                }
                .padding(2)
                .background(isDark ? Color.white.opacity(0.08) : Color(hex: "F1F5F9"))
                .cornerRadius(5)
            }

            // Donut Ring Chart on Left + 4 Metric Rows on Right
            HStack(spacing: 14) {
                donutChart(size: 78, stroke: 9)
                    .frame(width: 88)

                VStack(spacing: 4.5) {
                    legendRow(bulletColor: Color(hex: "38BDF8"), title: "Total Item", count: "\(entry.totalItems)")
                    legendRow(bulletColor: Color(hex: "F59E0B"), title: "Low Stock", count: "\(entry.lowStock)")
                    legendRow(bulletColor: Color(hex: "EC4899"), title: "Out of Stock", count: "\(entry.outStock)")
                    legendRow(bulletColor: Color(hex: "10B981"), title: "Tasks To Do", count: "\(entry.tasksCount)")
                }
                .frame(maxWidth: .infinity)
            }

            // Task Aim Banner
            taskBanner
        }
        .padding(11)
    }

    // MARK: - Large Widget (338x354) - The "Long One"
    private var largeWidgetView: some View {
        VStack(spacing: 8) {
            // 1. Top Header with Title and Period Filter Pills
            HStack(spacing: 6) {
                HStack(spacing: 6) {
                    Circle()
                        .fill(Color(hex: "F59E0B"))
                        .frame(width: 9, height: 9)
                    Text("Product Activity")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(isDark ? .white : Color(hex: "0F172A"))
                }
                Spacer()
                filterPillsBar
            }

            // 2. Main Analytics Row: Donut Ring Chart & 4 Metric Rows
            HStack(spacing: 16) {
                donutChart(size: 92, stroke: 10)
                    .frame(width: 104)

                VStack(spacing: 6.5) {
                    legendRow(bulletColor: Color(hex: "38BDF8"), title: "Total Item", count: "\(entry.totalItems)")
                    legendRow(bulletColor: Color(hex: "F59E0B"), title: "Low Stock", count: "\(entry.lowStock)")
                    legendRow(bulletColor: Color(hex: "EC4899"), title: "Out of Stock", count: "\(entry.outStock)")
                    legendRow(bulletColor: Color(hex: "10B981"), title: "Tasks To Do", count: "\(entry.tasksCount)")
                }
                .frame(maxWidth: .infinity)
            }
            .padding(.horizontal, 2)

            // 3. Full-width Task Banner (Cleanly aligned without clipping)
            taskBanner

            // 4. Subtle Separator
            Divider()
                .background(isDark ? Color.white.opacity(0.12) : Color(hex: "E2E8F0"))
                .padding(.vertical, 1)

            // 5. Bottom 2x2 Metric Cards Grid
            VStack(spacing: 6) {
                HStack(spacing: 6) {
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
                        amount: "\(entry.totalItems) Items",
                        badge: "↑ 0.29%",
                        isPositive: true
                    )
                }

                HStack(spacing: 6) {
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
                        amount: "\(entry.tasksCount) Tasks",
                        badge: entry.tasksCount == 0 ? "✓ Clear" : "Pending",
                        isPositive: entry.tasksCount == 0
                    )
                }
            }
        }
        .padding(13)
    }

    // MARK: - Reusable Donut Chart Component
    private func donutChart(size: CGFloat, stroke: CGFloat) -> some View {
        ZStack {
            // Background ring track
            Circle()
                .stroke(Color(hex: "E2E8F0").opacity(isDark ? 0.2 : 0.8), lineWidth: stroke)
                .frame(width: size, height: size)

            // Blue arc: Total Items
            Circle()
                .trim(from: 0.02, to: 0.38)
                .stroke(Color(hex: "38BDF8"), style: StrokeStyle(lineWidth: stroke, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .frame(width: size, height: size)

            // Orange arc: Low Stock
            Circle()
                .trim(from: 0.42, to: 0.64)
                .stroke(Color(hex: "F59E0B"), style: StrokeStyle(lineWidth: stroke, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .frame(width: size, height: size)

            // Pink arc: Out of Stock
            Circle()
                .trim(from: 0.68, to: 0.86)
                .stroke(Color(hex: "EC4899"), style: StrokeStyle(lineWidth: stroke, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .frame(width: size, height: size)

            // Green arc: Tasks To Do
            Circle()
                .trim(from: 0.90, to: 0.98)
                .stroke(Color(hex: "10B981"), style: StrokeStyle(lineWidth: stroke, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .frame(width: size, height: size)

            // Center metric value & title
            VStack(spacing: 0) {
                Text("\(entry.totalItems)")
                    .font(.system(size: size > 80 ? 17 : 14, weight: .heavy))
                    .foregroundColor(isDark ? .white : Color(hex: "0F172A"))
                Text("Total Items")
                    .font(.system(size: size > 80 ? 8 : 7, weight: .semibold))
                    .foregroundColor(Color(hex: "94A3B8"))
            }
        }
    }

    // MARK: - Filter Pills Component
    private var filterPillsBar: some View {
        HStack(spacing: 2) {
            filterPill("1W", active: false)
            filterPill("1M", active: false)
            filterPill("3W", active: false)
            filterPill("YTD", active: false)
            filterPill("Total", active: true)
        }
        .padding(2)
        .background(isDark ? Color.white.opacity(0.08) : Color(hex: "F1F5F9"))
        .cornerRadius(6)
    }

    private func filterPill(_ title: String, active: Bool) -> some View {
        Text(title)
            .font(.system(size: 8.5, weight: active ? .bold : .medium))
            .foregroundColor(active ? (isDark ? .white : Color(hex: "0F172A")) : Color(hex: "94A3B8"))
            .padding(.horizontal, 5)
            .padding(.vertical, 2.5)
            .background(active ? (isDark ? Color.white.opacity(0.2) : Color.white) : Color.clear)
            .cornerRadius(4)
            .shadow(color: active ? Color.black.opacity(0.06) : Color.clear, radius: 1, x: 0, y: 1)
    }

    // MARK: - Legend Row Component
    private func legendRow(bulletColor: Color, title: String, count: String) -> some View {
        HStack(spacing: 6) {
            Circle()
                .fill(bulletColor)
                .frame(width: 6, height: 6)
            Text(title)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(isDark ? Color(hex: "CBD5E1") : Color(hex: "475569"))
            Spacer()
            Text(count)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(isDark ? .white : Color(hex: "0F172A"))
        }
    }

    // MARK: - Full Width Task Aim Banner
    private var taskBanner: some View {
        HStack(spacing: 6) {
            Text("🎯")
                .font(.system(size: 10))
            Text(entry.todayTasks)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(isDark ? Color(hex: "38BDF8") : Color(hex: "0284C7"))
                .lineLimit(1)
            Spacer()
            if entry.tomorrowTasks != "None" && !entry.tomorrowTasks.isEmpty {
                Text(entry.tomorrowTasks)
                    .font(.system(size: 8.5, weight: .medium))
                    .foregroundColor(Color(hex: "94A3B8"))
                    .lineLimit(1)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(isDark ? Color.white.opacity(0.06) : Color(hex: "0284C7").opacity(0.08))
        .cornerRadius(7)
    }

    // MARK: - Metric Card Component
    private func metricCard(iconColor: Color, title: String, amount: String, badge: String, isPositive: Bool) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Circle()
                    .fill(iconColor.opacity(0.2))
                    .frame(width: 14, height: 14)
                    .overlay(
                        Circle()
                            .fill(iconColor)
                            .frame(width: 6, height: 6)
                    )
                Text(title)
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(Color(hex: "64748B"))
                    .lineLimit(1)
                Spacer()
                Text(badge)
                    .font(.system(size: 8, weight: .bold))
                    .foregroundColor(isPositive ? Color(hex: "10B981") : Color(hex: "EF4444"))
                    .padding(.horizontal, 4)
                    .padding(.vertical, 1.5)
                    .background(
                        (isPositive ? Color(hex: "10B981") : Color(hex: "EF4444"))
                            .opacity(0.12)
                    )
                    .cornerRadius(3)
            }

            Text(amount)
                .font(.system(size: 13, weight: .heavy))
                .foregroundColor(isDark ? .white : Color(hex: "0F172A"))
                .lineLimit(1)
        }
        .padding(8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(isDark ? Color.white.opacity(0.05) : Color.white)
        .cornerRadius(10)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(isDark ? Color.white.opacity(0.08) : Color(hex: "E2E8F0"), lineWidth: 1)
        )
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
struct StockWidgetBundle: WidgetBundle {
    var body: some Widget {
        StockWidget()
    }
}

struct StockWidget: Widget {
    let kind: String = "StockWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            StockWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Stock & Task Reminder")
        .description("Track Total Items, Low Stock, Out of Stock, and Tasks right on your Home Screen.")
        .supportedFamilies([.systemLarge, .systemMedium, .systemSmall])
    }
}
