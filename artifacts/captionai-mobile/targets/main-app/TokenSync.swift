import Foundation

@objc(TokenSync)
class TokenSync: NSObject {
  private static let appGroup = "group.com.captionai.app"
  private static let tokenKey  = "captly_auth_token"
  private static let nicheKey  = "captly_user_niche"

  @objc static func requiresMainQueueSetup() -> Bool { return false }

  @objc func setToken(_ token: String) {
    UserDefaults(suiteName: Self.appGroup)?.set(token, forKey: Self.tokenKey)
  }

  @objc func clearToken() {
    UserDefaults(suiteName: Self.appGroup)?.removeObject(forKey: Self.tokenKey)
  }

  @objc func setNiche(_ niche: String) {
    UserDefaults(suiteName: Self.appGroup)?.set(niche, forKey: Self.nicheKey)
  }
}
