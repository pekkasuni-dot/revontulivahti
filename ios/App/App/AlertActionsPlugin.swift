// Päätös 61 (18.11.2026): setAlertNames kirjoittaa nimitaulun ruutu -> nimet App Groupiin (Info.plist RVAppGroup),
// josta Notification Service Extension (ios/App/NotificationService) lukee sen ja lisää paikan nimen otsikkoon.
// setCategory on käyttämätön päätöksestä 58 lähtien (ilmoituksessa ei painikkeita), jätetty vanhojen versioiden vuoksi.
// Revontulihälytysten palautepainikkeet iOS:ssä (päätös 36, 7.11.2026).
// Rekisteröi ilmoituskategorian RV_FEEDBACK kolmella painikkeella (Näkyi / Ei näkynyt / En katsonut, päätös 41). Otsikot tulevat
// JS:ltä sovelluksen kielellä (kielistys laitteessa, index.html fbSyncNative) ja päivittyvät kielen vaihtuessa.
// Palvelin lähettää hälytykseen aps.category = RV_FEEDBACK (alerts/fcm.js). Painike avaa sovelluksen (.foreground):
// Firebase-lisäosa välittää valinnan JS:lle (notificationActionPerformed, actionId seen/notSeen/ei_katsonut), joka lähettää
// vastauksen vastaanotto-Workerille. Rekisteröinti MainViewControllerissa (LayerSheetPlugin.swift).
import Foundation
import UserNotifications
import Capacitor

@objc(AlertActionsPlugin)
public class AlertActionsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AlertActionsPlugin"
    public let jsName = "AlertActions"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setCategory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setAlertNames", returnType: CAPPluginReturnPromise)
    ]

    @objc func setAlertNames(_ call: CAPPluginCall) {
        guard let group = Bundle.main.object(forInfoDictionaryKey: "RVAppGroup") as? String, !group.isEmpty,
              let defaults = UserDefaults(suiteName: group) else {
            call.reject("App Group puuttuu")
            return
        }
        defaults.set(call.getString("json") ?? "{\"v\":1,\"cells\":{}}", forKey: "rv-alert-names")
        call.resolve()
    }
    static let categoryId = "RV_FEEDBACK"

    @objc func setCategory(_ call: CAPPluginCall) {
        let seen = call.getString("seen") ?? "Seen"
        let notSeen = call.getString("notSeen") ?? "Not seen"
        let notLooked = call.getString("ei_katsonut") ?? "Didn't look"
        let actions = [
            UNNotificationAction(identifier: "seen", title: seen, options: [.foreground]),
            UNNotificationAction(identifier: "notSeen", title: notSeen, options: [.foreground]),
            UNNotificationAction(identifier: "ei_katsonut", title: notLooked, options: [.foreground])
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
