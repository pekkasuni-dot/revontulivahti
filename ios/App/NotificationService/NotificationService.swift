// Päätös 61 (18.11.2026), vaihe 2: paikan nimi hälytysilmoituksen otsikkoon iOS:llä.
// Notification Service Extension: palvelin lähettää hälytykseen aps.mutable-content = 1 ja datakentän `cell`
// (alerts/fcm.js), ei nimiä (päätökset 14 ja 15). Sovellus kirjoittaa taulun ruutu -> nimet App Groupiin
// (index.html alertNamesSync -> AlertActionsPlugin.setAlertNames), tämä lukee sen ja lisää nimet otsikon alkuun.
// Muoto SAMA kuin AuroraCore.alertTitleWithNames ja Androidin AlertMessagingService.titleWithNames:
// "A: otsikko", "A, B: otsikko", "A + n: otsikko"; ei nimiä -> ennallaan. Virhe tai aikaraja -> alkuperäinen ilmoitus.
import Foundation
import UserNotifications

class NotificationService: UNNotificationServiceExtension {
    static let namesKey = "rv-alert-names"
    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var original: UNNotificationContent?

    override func didReceive(_ request: UNNotificationRequest,
                             withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.contentHandler = contentHandler
        self.original = request.content
        guard let content = request.content.mutableCopy() as? UNMutableNotificationContent else {
            finish(request.content)
            return
        }
        let names = NotificationService.names(cell: request.content.userInfo["cell"] as? String)
        content.title = NotificationService.titleWithNames(content.title, names)
        finish(content)
    }

    // Aikaraja (~30 s): alkuperäinen ilmoitus sellaisenaan.
    override func serviceExtensionTimeWillExpire() {
        if let o = original { finish(o) }
    }

    private func finish(_ content: UNNotificationContent) {
        guard let handler = contentHandler else { return }
        contentHandler = nil
        handler(content)
    }

    static func titleWithNames(_ title: String, _ names: [String]) -> String {
        if names.isEmpty { return title }
        let pre: String
        switch names.count {
        case 1: pre = names[0]
        case 2: pre = names[0] + ", " + names[1]
        default: pre = names[0] + " + " + String(names.count - 1)
        }
        return pre + ": " + title
    }

    // Nimet ruudulle App Groupin taulusta {"v":1,"cells":{"318_200":["Kilpisjärvi"]}}. Mikä tahansa virhe -> [].
    static func names(cell: String?) -> [String] {
        guard let cell = cell, !cell.isEmpty,
              let group = Bundle.main.object(forInfoDictionaryKey: "RVAppGroup") as? String, !group.isEmpty,
              let defaults = UserDefaults(suiteName: group),
              let raw = defaults.string(forKey: namesKey),
              let data = raw.data(using: .utf8),
              let obj = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let cells = obj["cells"] as? [String: Any],
              let list = cells[cell] as? [Any] else { return [] }
        var out: [String] = []
        for item in list {
            guard let s = item as? String else { continue }
            let n = s.trimmingCharacters(in: .whitespacesAndNewlines)
            if !n.isEmpty && !out.contains(n) { out.append(n) }
        }
        return out
    }
}
