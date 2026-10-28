// Tasovalikko iPhonessa natiivina alaikkunana (2026-10-28, käyttäjän päätös: valikot alaikkunoina).
// UISheetPresentationController + SwiftUI: iOS 26+ järjestelmän Liquid Glass (alaikkuna ja lasinapit),
// vanhemmissa tavallinen alaikkuna. Korkeudet puolikas / koko näyttö (veto), alas pyyhkäisy sulkee.
// Sisältö tulee JS:ltä (index.html nativeLmState(): tasomalli layerModel, omat kuvakkeet PNG:nä,
// Asetukset/Tietoja/Tietoa tasoista luettuna HTML-näkymistä); napautukset palaavat JS:lle tapahtumana
// "action" {act, v}, sulkeminen tapahtumana "closed". Rekisteröinti MainViewControllerissa.
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
        CAPPluginMethod(name: "dismiss", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "demo", returnType: CAPPluginReturnPromise)
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
            self.model.view = .main
            let vc = LayerSheetHost(rootView: LayerSheetView(model: self.model))
            self.model.onClose = { [weak vc] in vc?.dismiss(animated: true) }
            vc.overrideUserInterfaceStyle = .dark
            vc.onClose = { [weak self] in
                self?.host = nil
                self?.notifyListeners("closed", data: [:])
            }
            if let sheet = vc.sheetPresentationController {
                sheet.detents = [.medium(), .large()]
                sheet.prefersGrabberVisible = true
                sheet.largestUndimmedDetentIdentifier = .medium   // kartta näkyy ja reagoi taustalla
                sheet.prefersScrollingExpandsWhenScrolledToEdge = true
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

    // Simulaattoridemo (APP_DEMO-käännös): näkymä ja korkeus ohjelmallisesti videotallennetta varten.
    @objc func demo(_ call: CAPPluginCall) {
        let v = call.getString("view"), large = call.getBool("large")
        DispatchQueue.main.async {
            switch v {
            case "settings": self.model.view = .settings
            case "about": self.model.view = .about
            case "info": self.model.view = .info
            case "main": self.model.view = .main
            default: break
            }
            if let l = large, let sheet = self.host?.sheetPresentationController {
                sheet.animateChanges { sheet.selectedDetentIdentifier = l ? .large : .medium }
            }
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
        // iOS 26+: järjestelmän lasipinta näkyy (ei läpinäkymätöntä taustaa); vanhemmat: tavallinen tausta.
        if #available(iOS 26.0, *) { view.backgroundColor = .clear } else { view.backgroundColor = .systemBackground }
    }
    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        if isBeingDismissed || presentingViewController == nil { onClose?(); onClose = nil }
    }
}

// MARK: - Tila (JSON JS:ltä)

struct LSIcon: Codable { let png: String; let template: Bool; let w: Double; let h: Double }
struct LSOption: Codable, Identifiable {
    let v: String
    let label: String
    let icon: String?
    let dim: Bool?
    let pro: Bool?
    let sub: String?
    var id: String { v }
}
struct LSGroup: Codable, Identifiable {
    let id: String
    let label: String
    let icon: String
    let on: Bool?
    let noSwitch: Bool?
    let act: String?
    let value: String?
    let layout: String?
    let options: [LSOption]?
    let note: String?
}
struct LSLink: Codable, Identifiable { let id: String; let label: String; let icon: String }
struct LSLabels: Codable { let back: String; let close: String; let settings: String; let about: String; let info: String }
struct LSSetOpt: Codable, Identifiable { let v: String; let label: String; var id: String { v } }
struct LSSetRow: Codable { let type: String; let id: String?; let label: String; let on: Bool?; let value: String?; let options: [LSSetOpt]? }
struct LSAboutLine: Codable { let text: String; let url: String }
struct LSAboutItem: Codable { let title: String; let url: String; let text: String }
struct LSAbout: Codable { let lines: [LSAboutLine]; let items: [LSAboutItem] }
struct LSBlock: Codable { let type: String; let text: String }
struct LSInfoSec: Codable { let icon: String; let title: String; let blocks: [LSBlock] }
struct LSState: Codable {
    let title: String
    let unavailable: String?
    let icons: [String: LSIcon]?
    let groups: [LSGroup]
    let links: [LSLink]
    let labels: LSLabels?
    let settings: [LSSetRow]?
    let about: LSAbout?
    let info: [LSInfoSec]?
}

enum LSView { case main, settings, about, info }

final class LayerSheetModel: ObservableObject {
    @Published var state = LSState(title: "", unavailable: nil, icons: nil, groups: [], links: [], labels: nil, settings: nil, about: nil, info: nil)
    @Published var view: LSView = .main
    var images: [String: UIImage] = [:]
    private var imageSrc: [String: Int] = [:]
    var onAction: ((String, String) -> Void)?
    var onClose: (() -> Void)?
    func load(_ obj: [String: Any]) {
        guard JSONSerialization.isValidJSONObject(obj),
              let data = try? JSONSerialization.data(withJSONObject: obj),
              let s = try? JSONDecoder().decode(LSState.self, from: data) else { return }
        for (k, ic) in s.icons ?? [:] where !ic.png.isEmpty && imageSrc[k] != ic.png.hashValue {
            if let d = Data(base64Encoded: ic.png), let img = UIImage(data: d, scale: 3) { images[k] = img; imageSrc[k] = ic.png.hashValue }
        }
        state = s
    }
    func act(_ a: String, _ v: String = "") { onAction?(a, v) }
    func label(_ f: (LSLabels) -> String, _ d: String) -> String { state.labels.map(f) ?? d }
}

// MARK: - Näkymät

struct LSIconView: View {
    let key: String
    @ObservedObject var model: LayerSheetModel
    var body: some View {
        let spec = model.state.icons?[key]
        if let img = model.images[key] {
            let im = Image(uiImage: img).renderingMode(spec?.template == false ? .original : .template)
                .resizable().scaledToFit().frame(width: CGFloat(spec?.w ?? 22), height: CGFloat(spec?.h ?? 22))
            if key.hasPrefix("style:") {
                im.clipShape(Circle()).overlay(Circle().stroke(Color.white.opacity(0.25), lineWidth: 1))
            } else { im }
        } else {
            Image(systemName: "circle").frame(width: 22, height: 22).opacity(0)
        }
    }
}

struct LayerSheetView: View {
    @ObservedObject var model: LayerSheetModel
    var body: some View {
        VStack(spacing: 0) {
            header
            ScrollView {
                Group {
                    switch model.view {
                    case .main: LSMainView(model: model)
                    case .settings: LSSettingsView(model: model)
                    case .about: LSAboutView(model: model)
                    case .info: LSInfoView(model: model)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
        }
        .padding(.top, 14)
        .animation(.default, value: model.view)
    }
    private var title: String {
        switch model.view {
        case .main: return model.state.title
        case .settings: return model.label({ $0.settings }, "")
        case .about: return model.label({ $0.about }, "")
        case .info: return model.label({ $0.info }, "")
        }
    }
    private var header: some View {
        ZStack {
            if model.view == .main {
                HStack(spacing: 4) {
                    Text(title).font(.title3.weight(.semibold))
                    Button { model.view = .info } label: {
                        LSIconView(key: "info", model: model).foregroundColor(.secondary).frame(width: 44, height: 44)
                    }.accessibilityLabel(model.label({ $0.info }, "Info"))
                    Spacer()
                }
            } else {
                Text(title).font(.headline)
                HStack {
                    Button { model.view = .main } label: {
                        HStack(spacing: 2) { Image(systemName: "chevron.left").font(.body.weight(.semibold)); Text(model.label({ $0.back }, "")) }
                            .frame(minHeight: 44)
                    }
                    Spacer()
                }
            }
            HStack {
                Spacer()
                Button { model.onClose?() } label: {
                    Image(systemName: "xmark").font(.system(size: 15, weight: .semibold)).frame(width: 44, height: 44)
                }
                .modifier(LSCloseStyle())
                .accessibilityLabel(model.label({ $0.close }, "Close"))
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 6)
    }
}

struct LSCloseStyle: ViewModifier {
    @ViewBuilder func body(content: Content) -> some View {
        if #available(iOS 26.0, *) { content.buttonStyle(.glass).buttonBorderShape(.circle) }
        else { content.buttonStyle(.plain).foregroundColor(.secondary) }
    }
}

struct LSMainView: View {
    @ObservedObject var model: LayerSheetModel
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            ForEach(model.state.groups) { g in LSGroupView(g: g, model: model) }
            Divider().opacity(0.5)
            VStack(alignment: .leading, spacing: 2) {
                ForEach(model.state.links) { l in
                    Button { model.view = (l.id == "settings") ? .settings : .about } label: {
                        HStack(spacing: 12) {
                            LSIconView(key: l.icon, model: model).frame(width: 28)
                            Text(l.label)
                            Spacer()
                            Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundColor(.secondary)
                        }
                        .frame(minHeight: 44).contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

struct LSGroupView: View {
    let g: LSGroup
    @ObservedObject var model: LayerSheetModel
    var body: some View {
        let off = g.noSwitch != true && g.on != true
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                LSIconView(key: g.icon, model: model).frame(width: 28)
                Text(g.label).font(.body.weight(.semibold))
                Spacer()
                if g.noSwitch != true {
                    Toggle("", isOn: Binding(get: { g.on == true }, set: { _ in model.act(g.id) }))
                        .labelsHidden()
                        .tint(Color(red: 0.24, green: 0.95, blue: 0.63))
                }
            }
            .frame(minHeight: 44)
            if let opts = g.options, let act = g.act {
                if g.layout == "grid" {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
                        ForEach(opts) { o in
                            LSOptionButton(o: o, selected: o.v == g.value, groupOff: off, vertical: true, model: model) { model.act(act, o.v) }
                        }
                    }
                } else {
                    HStack(spacing: 8) {
                        ForEach(opts) { o in
                            LSOptionButton(o: o, selected: o.v == g.value, groupOff: off, vertical: false, model: model) { model.act(act, o.v) }
                        }
                    }
                }
                if let n = g.note, !n.isEmpty {
                    Text(n).font(.footnote).foregroundColor(.secondary)
                }
            }
        }
    }
}

struct LSProBadge: View {
    var body: some View {
        Text("PRO").font(.system(size: 9, weight: .bold))
            .padding(.horizontal, 4).padding(.vertical, 1)
            .background(Capsule().fill(Color(red: 0.24, green: 0.95, blue: 0.63)))
            .foregroundColor(.black)
    }
}

struct LSOptionButton: View {
    let o: LSOption
    let selected: Bool
    let groupOff: Bool
    let vertical: Bool
    @ObservedObject var model: LayerSheetModel
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Group {
                if vertical {
                    VStack(spacing: 3) {
                        if let ic = o.icon { LSIconView(key: ic, model: model) }
                        Text(o.label).font(.footnote.weight(.medium)).lineLimit(1).minimumScaleFactor(0.7)
                        if let sub = o.sub, !sub.isEmpty {
                            Text(sub).font(.caption2).foregroundColor(.secondary).lineLimit(1).minimumScaleFactor(0.7)
                        }
                    }
                } else {
                    HStack(spacing: 6) {
                        if let ic = o.icon { LSIconView(key: ic, model: model) }
                        Text(o.label).font(.footnote.weight(.medium)).lineLimit(1).minimumScaleFactor(0.7)
                    }
                }
            }
            .frame(maxWidth: .infinity, minHeight: 40)
            .padding(.vertical, 4)
            .overlay(alignment: .topTrailing) { if o.pro == true { LSProBadge().offset(x: 4, y: -6) } }
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

// Asetukset: rivit HTML-asetusnäkymästä (otsikko, valinta, kielivalikko, kytkin).
struct LSSettingsView: View {
    @ObservedObject var model: LayerSheetModel
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(Array((model.state.settings ?? []).enumerated()), id: \.offset) { _, r in row(r) }
        }
    }
    @ViewBuilder private func row(_ r: LSSetRow) -> some View {
        switch r.type {
        case "header":
            Text(r.label.uppercased()).font(.caption.weight(.semibold)).foregroundColor(.secondary).padding(.top, 8)
        case "switch":
            Toggle(r.label, isOn: Binding(get: { r.on == true }, set: { _ in model.act("switch", r.id ?? "") }))
                .tint(Color(red: 0.24, green: 0.95, blue: 0.63)).frame(minHeight: 44)
        case "pick":
            HStack {
                Text(r.label)
                Spacer()
                Picker(r.label, selection: Binding(get: { r.value ?? "" }, set: { model.act("lang", $0) })) {
                    ForEach(r.options ?? []) { o in Text(o.label).tag(o.v) }
                }
                .pickerStyle(.menu)
            }
            .frame(minHeight: 44)
        default:   // "seg"
            HStack(spacing: 12) {
                Text(r.label)
                Spacer(minLength: 8)
                Picker(r.label, selection: Binding(get: { r.value ?? "" }, set: { model.act("seg", (r.id ?? "") + ":" + $0) })) {
                    ForEach(r.options ?? []) { o in Text(o.label).tag(o.v) }
                }
                .pickerStyle(.segmented)
                .fixedSize()
            }
            .frame(minHeight: 44)
        }
    }
}

struct LSAboutView: View {
    @ObservedObject var model: LayerSheetModel
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                ForEach(Array((model.state.about?.lines ?? []).enumerated()), id: \.offset) { _, l in
                    if let u = URL(string: l.url), !l.url.isEmpty { Link(l.text, destination: u).font(.footnote) }
                    else { Text(l.text).font(.footnote).foregroundColor(.secondary) }
                }
            }
            ForEach(Array((model.state.about?.items ?? []).enumerated()), id: \.offset) { _, it in
                VStack(alignment: .leading, spacing: 2) {
                    if let u = URL(string: it.url), !it.url.isEmpty { Link(it.title, destination: u).font(.subheadline.weight(.semibold)) }
                    else { Text(it.title).font(.subheadline.weight(.semibold)) }
                    Text(it.text).font(.footnote).foregroundColor(.secondary)
                }
            }
        }
    }
}

struct LSInfoView: View {
    @ObservedObject var model: LayerSheetModel
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(Array((model.state.info ?? []).enumerated()), id: \.offset) { _, s in
                HStack(spacing: 8) {
                    if !s.icon.isEmpty { LSIconView(key: s.icon, model: model) }
                    Text(s.title).font(.headline)
                }
                .padding(.top, 10)
                ForEach(Array(s.blocks.enumerated()), id: \.offset) { _, b in
                    if b.type == "h" { Text(b.text).font(.subheadline.weight(.semibold)).padding(.top, 4) }
                    else { Text(b.text).font(.footnote).foregroundColor(.secondary).fixedSize(horizontal: false, vertical: true) }
                }
            }
        }
    }
}
