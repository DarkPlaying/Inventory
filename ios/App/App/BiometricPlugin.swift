import Foundation
import Capacitor
import LocalAuthentication

@objc(BiometricPlugin)
public class BiometricPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BiometricPlugin"
    public let jsName = "BiometricPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]

    @objc func isAvailable(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?

        let canAuth = context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error)

        var biometryType = "none"
        if #available(iOS 11.0, *) {
            switch context.biometryType {
            case .faceID:
                biometryType = "faceID"
            case .touchID:
                biometryType = "touchID"
            case .opticID:
                biometryType = "opticID"
            default:
                biometryType = "passcode"
            }
        }

        call.resolve([
            "isAvailable": canAuth,
            "hasBiometrics": biometryType == "faceID" || biometryType == "touchID" || biometryType == "opticID",
            "biometryType": biometryType,
            "deviceLockAvailable": canAuth,
            "error": error?.localizedDescription ?? ""
        ])
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        let context = LAContext()
        let reason = call.getString("reason") ?? call.getString("subtitle") ?? "Unlock Inventory App with Face ID, Touch ID, or Passcode"

        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            call.resolve([
                "success": false,
                "errorMessage": error?.localizedDescription ?? "Authentication policy not supported"
            ])
            return
        }

        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, authError in
            DispatchQueue.main.async {
                if success {
                    call.resolve([
                        "success": true
                    ])
                } else {
                    call.resolve([
                        "success": false,
                        "errorMessage": authError?.localizedDescription ?? "Authentication canceled or failed"
                    ])
                }
            }
        }
    }
}
