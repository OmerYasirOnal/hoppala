import Capacitor
import GameKit

@objc(GameCenterPlugin)
public class GameCenterPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GameCenterPlugin"
    public let jsName = "GameCenter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitScore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showLeaderboard", returnType: CAPPluginReturnPromise),
    ]

    @objc func authenticate(_ call: CAPPluginCall) {
        // The handler fires more than once (first to hand us the sign-in VC,
        // again with the final outcome) and possibly after this method returns:
        // keep the call alive and resolve it exactly once, on a final firing.
        call.keepAlive = true
        var didResolve = false
        GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, _ in
            if let vc = viewController {
                DispatchQueue.main.async {
                    self?.bridge?.viewController?.present(vc, animated: true)
                }
                return // not final — wait for the completion firing
            }
            guard !didResolve else { return }
            didResolve = true
            call.resolve(["authenticated": GKLocalPlayer.local.isAuthenticated])
            self?.bridge?.releaseCall(call)
        }
    }

    @objc func submitScore(_ call: CAPPluginCall) {
        guard GKLocalPlayer.local.isAuthenticated,
              let leaderboardId = call.getString("leaderboardId"),
              let score = call.getInt("score") else {
            call.resolve(["submitted": false])
            return
        }
        GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local,
                                  leaderboardIDs: [leaderboardId]) { _ in
            call.resolve(["submitted": true])
        }
    }

    @objc func showLeaderboard(_ call: CAPPluginCall) {
        guard GKLocalPlayer.local.isAuthenticated else { call.resolve(); return }
        let id = call.getString("leaderboardId")
        DispatchQueue.main.async { [weak self] in
            let vc = id != nil
                ? GKGameCenterViewController(leaderboardID: id!, playerScope: .global, timeScope: .allTime)
                : GKGameCenterViewController(state: .leaderboards)
            vc.gameCenterDelegate = self
            self?.bridge?.viewController?.present(vc, animated: true)
            call.resolve()
        }
    }
}

extension GameCenterPlugin: GKGameCenterControllerDelegate {
    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }
}
