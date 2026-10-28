// Natiivi tasovalikko (2026-10-28, KOKEILU, vain iOS-testikäännös).
// iOS:n oma alaikkuna (UISheetPresentationController + SwiftUI): iOS 26:ssa järjestelmä antaa
// alaikkunalle ja napeille Liquid Glass -pinnan, jota verkkonäkymässä ei voi jäljitellä.
// Sisältö (tasot, kytkimet, valinnat, tekstit) tulee JS:ltä (index.html nativeLmState()),
// napautukset palaavat JS:lle tapahtumana "action" {act, v}; sulkeminen tapahtumana "closed".
// Rekisteröidään MainViewControllerissa (paikallinen lisäosa, ei npm-pakettia).
import Foundation
import UIKit
import SwiftUI
import Capacitor

class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(LayerSheetPlugin())
    }
}

@objc(LayerSheetPlugin)
public class LayerSheetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LayerSheetPlugin"
    public let jsName = "LayerSheet"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "present", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "dismiss", returnType: CAPPluginReturnPromise)
    ]
    private let model = LayerSheetModel()
    private weak var host: UIViewController?

    @objc func present(_ call: CAPPluginCall) {
        let st = (call.getObject("state") ?? [:]) as [String: Any]
        DispatchQueue.main.async {
            self.model.load(st)
            if self.host != nil { call.resolve(); return }
            self.model.onAction = { [weak self] act, v in
                self?.notifyListeners("action", data: ["act": act, "v": v])
            }
            let vc = LayerSheetHost(rootView: LayerSheetView(model: self.model))
            vc.overrideUserInterfaceStyle = .dark
            vc.onClose = { [weak self] in
                self?.host = nil
                self?.notifyListeners("closed", data: [:])
            }
            if let sheet = vc.sheetPresentationController {
                sheet.detents = [.medium(), .large()]
                sheet.prefersGrabberVisible = true
                sheet.largestUndimmedDetentIdentifier = .medium   // kartta näkyy ja reagoi taustalla
                sheet.prefersScrollingExpandsWhenScrolledToEdge = false
            }
            self.host = vc
            guard let presenter = self.bridge?.viewController else { call.reject("no view controller"); return }
            presenter.present(vc, animated: true) { call.resolve() }
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        let st = (call.getObject("state") ?? [:]) as [String: Any]
        DispatchQueue.main.async {
            self.model.load(st)
            call.resolve()
        }
    }

    @objc func dismiss(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let h = self.host else { call.resolve(); return }
            h.dismiss(animated: true) { call.resolve() }
        }
    }
}

final class LayerSheetHost: UIHostingController<LayerSheetView> {
    var onClose: (() -> Void)?
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear   // järjestelmän lasipinta näkyy (ei läpinäkymätöntä taustaa)
    }
    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        if isBeingDismissed || presentingViewController == nil { onClose?(); onClose = nil }
    }
}

// MARK: - Tila (JSON JS:ltä)

struct LSOption: Codable, Identifiable {
    let v: String
    let label: String
    let symbol: String?
    let dim: Bool?
    let pro: Bool?
    var id: String { v }
}
struct LSGroup: Codable, Identifiable {
    let id: String
    let label: String
    let symbol: String
    let on: Bool?
    let noSwitch: Bool?
    let act: String?
    let value: String?
    let grid: Bool?
    let options: [LSOption]?
    let note: String?
}
struct LSLink: Codable, Identifiable {
    let id: String
    let label: String
    let symbol: String
}
struct LSState: Codable {
    let title: String
    let unavailable: String?
    let groups: [LSGroup]
    let links: [LSLink]
}

final class LayerSheetModel: ObservableObject {
    @Published var state = LSState(title: "", unavailable: nil, groups: [], links: [])
    var onAction: ((String, String) -> Void)?
    func load(_ obj: [String: Any]) {
        guard JSONSerialization.isValidJSONObject(obj),
              let data = try? JSONSerialization.data(withJSONObject: obj),
              let s = try? JSONDecoder().decode(LSState.self, from: data) else { return }
        state = s
    }
    func act(_ a: String, _ v: String = "") { onAction?(a, v) }
}

// MARK: - Näkymä

struct LayerSheetView: View {
    @ObservedObject var model: LayerSheetModel
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                Text(model.state.title).font(.title3.weight(.semibold)).padding(.top, 4)
                ForEach(model.state.groups) { g in
                    LSGroupView(g: g, unavailable: model.state.unavailable, model: model)
                }
                Divider().opacity(0.5)
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(model.state.links) { l in
                        Button { model.act(l.id) } label: {
                            HStack(spacing: 12) {
                                Image(systemName: l.symbol).frame(width: 28)
                                Text(l.label)
                                Spacer()
                                Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(.secondary)
                            }
                            .frame(minHeight: 44)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
    }
}

struct LSGroupView: View {
    let g: LSGroup
    let unavailable: String?
    @ObservedObject var model: LayerSheetModel
    var body: some View {
        let off = g.noSwitch != true && g.on != true
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                Image(systemName: g.symbol).font(.system(size: 18)).frame(width: 28)
                Text(g.label).font(.body.weight(.semibold))
                Spacer()
                if g.noSwitch != true {
                    Toggle("", isOn: Binding(get: { g.on == true }, set: { _ in model.act(g.id) }))
                        .labelsHidden()
                }
            }
            .frame(minHeight: 44)
            if let opts = g.options, let act = g.act {
                if g.grid == true {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
                        ForEach(opts) { o in
                            LSOptionButton(o: o, selected: o.v == g.value, groupOff: off, unavailable: unavailable) { model.act(act, o.v) }
                        }
                    }
                } else {
                    HStack(spacing: 8) {
                        ForEach(opts) { o in
                            LSOptionButton(o: o, selected: o.v == g.value, groupOff: off, unavailable: unavailable) { model.act(act, o.v) }
                        }
                    }
                }
                if let n = g.note, !n.isEmpty {
                    Text(n).font(.footnote).foregroundStyle(.secondary)
                }
            }
        }
    }
}

struct LSOptionButton: View {
    let o: LSOption
    let selected: Bool
    let groupOff: Bool
    let unavailable: String?
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            VStack(spacing: 3) {
                if let s = o.symbol { Image(systemName: s).font(.system(size: 17)) }
                HStack(spacing: 4) {
                    Text(o.label).font(.footnote.weight(.medium)).lineLimit(1).minimumScaleFactor(0.7)
                    if o.pro == true {
                        Text("PRO").font(.system(size: 9, weight: .bold))
                            .padding(.horizontal, 4).padding(.vertical, 1)
                            .background(Capsule().fill(Color(red: 0.24, green: 0.95, blue: 0.63)))
                            .foregroundColor(.black)
                    }
                }
                if o.dim == true, let u = unavailable {
                    Text(u).font(.caption2).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.7)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 40)
            .padding(.vertical, 4)
        }
        .modifier(LSGlassChoice(selected: selected))
        .opacity((o.dim == true || groupOff) ? 0.45 : 1)
    }
}

// iOS 26: lasinapit (järjestelmän Liquid Glass); vanhemmat: tavalliset reunustetut napit.
struct LSGlassChoice: ViewModifier {
    let selected: Bool
    @ViewBuilder func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            if selected {
                content.buttonStyle(.glassProminent).tint(Color(red: 0.12, green: 0.56, blue: 0.41))
            } else {
                content.buttonStyle(.glass)
            }
        } else {
            if selected {
                content.buttonStyle(.borderedProminent).tint(Color(red: 0.12, green: 0.56, blue: 0.41))
            } else {
                content.buttonStyle(.bordered)
            }
        }
    }
}
