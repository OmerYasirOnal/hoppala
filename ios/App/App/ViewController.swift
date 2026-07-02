import Capacitor

/// Custom bridge view controller so app-local (non-npm) Capacitor plugins can be
/// registered. Capacitor's `CapacitorBridge.registerPlugins()` only auto-registers
/// its own built-in plugins plus whatever is listed under `packageClassList` in
/// `capacitor.config.json` (populated by `cap sync` for npm-installed plugins).
/// Plugins that live directly in the app target (like GameCenterPlugin) are not
/// npm packages, so `cap sync` never lists them there — they must be registered
/// manually. `capacitorDidLoad()` is the documented open extension point for this,
/// called once the bridge has finished its own setup
/// (see CAPBridgeViewController.swift: `viewDidLoad()` -> `capacitorDidLoad()`).
///
/// NOTE: `bridge?.registerPluginType(_:)` is NOT the right call here — it early-returns
/// as a no-op whenever `autoRegisterPlugins` is true (the default), see
/// `CapacitorBridge.registerPluginType(_:)`: `if autoRegisterPlugins { return }`.
/// `registerPluginInstance(_:)` has no such guard, so it's the correct API for adding
/// one extra local plugin on top of the normal auto-registered set.
class ViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(GameCenterPlugin())
    }
}
