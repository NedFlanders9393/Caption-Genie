/**
 * withCrashDiagnostics.js
 *
 * Injects an NSException + uncaught-exception handler into AppDelegate.swift.
 * The handler logs the exception name, reason, userInfo, and full call stack to
 * NSLog (visible in TestFlight crash reports under "Last Exception Backtrace"
 * / device console) and writes a copy to Documents/captly-last-exception.txt
 * so we can recover it via Files.app or Xcode container download.
 *
 * Why: when a sync TurboModule throws an ObjC NSException, React Native's
 * RCTTurboModule converts it to a C++ exception which then std::terminates.
 * Apple's crash reporter records this as an abort() and strips the original
 * exception details. This plugin captures them BEFORE that happens.
 */

const { withAppDelegate } = require("@expo/config-plugins");

const SETUP_CALL = `CaptlyCrashDiagnostics.install()`;

const HELPER_CLASS = `

// MARK: - Captly Crash Diagnostics (added by withCrashDiagnostics.js)
@objc class CaptlyCrashDiagnostics: NSObject {
  @objc static func install() {
    NSSetUncaughtExceptionHandler { exception in
      let name = exception.name.rawValue
      let reason = exception.reason ?? "<no reason>"
      let userInfo = exception.userInfo?.description ?? "<no userInfo>"
      let symbols = exception.callStackSymbols.joined(separator: "\\n")
      let returns = exception.callStackReturnAddresses.map { String(format: "0x%llx", $0.uint64Value) }.joined(separator: " ")
      let payload = """
      ====== CAPTLY UNCAUGHT NSEXCEPTION ======
      name: \\(name)
      reason: \\(reason)
      userInfo: \\(userInfo)
      callStackReturnAddresses: \\(returns)
      callStackSymbols:
      \\(symbols)
      ==========================================
      """
      NSLog("%@", payload)
      if let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
        let url = docs.appendingPathComponent("captly-last-exception.txt")
        try? payload.write(to: url, atomically: true, encoding: .utf8)
      }
    }
  }
}
`;

function patchAppDelegate(contents) {
  if (contents.includes("CaptlyCrashDiagnostics")) return contents;

  // Insert install() call as the very first line inside didFinishLaunchingWithOptions
  let patched = contents.replace(
    /func application\(\s*_ application: UIApplication,\s*didFinishLaunchingWithOptions[^\)]*\)\s*->\s*Bool\s*\{/,
    (match) => `${match}\n    ${SETUP_CALL}`
  );

  // Append the helper class at the end of the file (outside any existing class)
  patched = patched.trimEnd() + "\n" + HELPER_CLASS + "\n";
  return patched;
}

module.exports = function withCrashDiagnostics(config) {
  return withAppDelegate(config, (c) => {
    if (c.modResults.language !== "swift") {
      console.warn("[withCrashDiagnostics] AppDelegate is not Swift, skipping");
      return c;
    }
    c.modResults.contents = patchAppDelegate(c.modResults.contents);
    return c;
  });
};
