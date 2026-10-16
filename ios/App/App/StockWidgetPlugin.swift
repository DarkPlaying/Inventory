import Foundation
import Capacitor
import WidgetKit

@objc(StockWidgetPlugin)
public class StockWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StockWidgetPlugin"
    public let jsName = "StockWidgetPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateWidgetData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setWidgetTheme", returnType: CAPPluginReturnPromise)
    ]

    @objc func updateWidgetData(_ call: CAPPluginCall) {
        let totalItems = call.getInt("totalItemsCount") ?? call.getInt("totalItems") ?? 0
        let lowStock = call.getInt("lowStockCount") ?? call.getInt("lowStock") ?? 0
        let outStock = call.getInt("outOfStockCount") ?? call.getInt("outStock") ?? 0
        let tasksCount = call.getInt("tasksCount") ?? 0
        let balance = call.getInt("nominalBalance") ?? 0
        let revenue = call.getInt("nominalRevenue") ?? 0
        let todayTasks = call.getString("todayTasksText") ?? call.getString("todayTasks") ?? ""
        let tomorrowTasks = call.getString("tomorrowTasksText") ?? call.getString("tomorrowTasks") ?? ""
        let theme = call.getString("widgetTheme") ?? "light"

        let defaults = UserDefaults(suiteName: "group.com.inventoryapp.app") ?? UserDefaults.standard
        defaults.set(totalItems, forKey: "widget_total_items")
        defaults.set(lowStock, forKey: "widget_low_stock")
        defaults.set(outStock, forKey: "widget_out_stock")
        defaults.set(tasksCount, forKey: "widget_tasks_count")
        defaults.set(balance, forKey: "widget_balance")
        defaults.set(revenue, forKey: "widget_revenue")
        defaults.set(todayTasks, forKey: "widget_today_tasks")
        defaults.set(tomorrowTasks, forKey: "widget_tomorrow_tasks")
        defaults.set(theme, forKey: "widget_theme")
        defaults.synchronize()

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }

        call.resolve(["status": "success"])
    }

    @objc func setWidgetTheme(_ call: CAPPluginCall) {
        let theme = call.getString("theme") ?? call.getString("widgetTheme") ?? "light"
        let defaults = UserDefaults(suiteName: "group.com.inventoryapp.app") ?? UserDefaults.standard
        defaults.set(theme, forKey: "widget_theme")
        defaults.synchronize()

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }

        call.resolve(["status": "success", "theme": theme])
    }
}
