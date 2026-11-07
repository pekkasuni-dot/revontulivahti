// Revontulihälytysten palautepainikkeet iOS:ssä (päätös 36, 7.11.2026).
// Rekisteröi ilmoituskategorian RV_FEEDBACK kolmella painikkeella (Näkyi / Ei näkynyt / Pilvessä). Otsikot tulevat
// JS:ltä sovelluksen kielellä (kielistys laitteessa, index.html fbSyncNative) ja päivittyvät kielen vaihtuessa.
// Palvelin lähettää hälytykseen aps.category = RV_FEEDBACK (alerts/fcm.js). Painike avaa sovelluksen (.foreground):
// Firebase-lisäosa välittää valinnan JS:lle (notificationActionPerformed, actionId seen/notSeen/cloudy), joka lähettää
// vastauksen vastaanotto-Workerille. Rekisteröinti MainViewControllerissa (LayerSheetPlugin.swift).
import Foundation
import UserNotifications
import Capacitor

@objc(AlertActionsPlugin)
public class AlertActionsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AlertActionsPlugin"
    public let jsName = "AlertActions"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setCategory", returnType: CAPPluginReturnPromise)
    ]
    static let categoryId = "RV_FEEDBACK"

    @objc func setCategory(_ call: CAPPluginCall) {
        let seen = call.getString("seen") ?? "Seen"
        let notSeen = call.getString("notSeen") ?? "Not seen"
        let cloudy = call.getString("cloudy") ?? "Cloudy"
        let actions = [
            UNNotificationAction(identifier: "seen", title: seen, options: [.foreground]),
            UNNotificationAction(identifier: "notSeen", title: notSeen, options: [.foreground]),
            UNNotificationAction(identifier: "cloudy", title: cloudy, options: [.foreground])
        ]
        let category = UNNotificationCategory(identifier: AlertActionsPlugin.categoryId, actions: actions,
                                              intentIdentifiers: [], options: [])
        let center = UNUserNotificationCenter.current()
        // Säilytä mahdolliset muut kategoriat, korvaa vain oma.
        center.getNotificationCategories { existing in
            var all = existing.filter { $0.identifier != AlertActionsPlugin.categoryId }
            all.insert(category)
            center.setNotificationCategories(all)
            call.resolve()
        }
    }
}
