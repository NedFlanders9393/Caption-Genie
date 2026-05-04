import UIKit
import SwiftUI

class ShareViewController: UIViewController {

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = UIColor.black.withAlphaComponent(0.001)

    let detectedPlatform = detectSourceApp()
    let extCtx = extensionContext

    let rootView = ShareView(
      detectedPlatform: detectedPlatform,
      openURL: { url in
        extCtx?.open(url, completionHandler: nil)
      },
      onComplete: {
        extCtx?.completeRequest(returningItems: nil, completionHandler: nil)
      }
    )

    let hosting = UIHostingController(rootView: rootView)
    hosting.view.backgroundColor = .clear

    addChild(hosting)
    view.addSubview(hosting.view)
    hosting.view.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      hosting.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      hosting.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      hosting.view.topAnchor.constraint(equalTo: view.topAnchor),
      hosting.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
    ])
    hosting.didMove(toParent: self)
  }

  private func detectSourceApp() -> String {
    let host = extensionContext?.value(forKeyPath: "_hostBundleIdentifier") as? String ?? ""
    switch true {
    case host.contains("instagram"):            return "Instagram"
    case host.contains("com.facebook"):         return "Facebook"
    case host.contains("tiktok"):               return "TikTok"
    case host.contains("linkedin"):             return "LinkedIn"
    case host.contains("twitter"), host.contains("tweetie"): return "Twitter/X"
    default:                                    return "Instagram"
    }
  }
}
