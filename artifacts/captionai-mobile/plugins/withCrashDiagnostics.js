/**
 * withCrashDiagnostics.js
 *
 * Two-layer crash diagnostics:
 *
 *   1. Swift NSSetUncaughtExceptionHandler in AppDelegate — catches ObjC
 *      NSExceptions that propagate to the top of the thread.
 *
 *   2. C++ std::set_terminate handler in CaptlyTerminateHandler.mm — catches
 *      C++ exceptions that std::terminate (which is the path RN takes when
 *      a sync TurboModule throws an NSException — it converts it to a C++
 *      exception that the dispatch_async block doesn't catch).
 *
 *   3. UIFileSharingEnabled / LSSupportsOpeningDocumentsInPlace in Info.plist
 *      so the diagnostic file written to Documents/captly-last-exception.txt
 *      is accessible via the Files app on the device.
 *
 *   4. Adds the .mm file to the main app's Xcode target.
 */

const {
  withAppDelegate,
  withInfoPlist,
  withXcodeProject,
} = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

const TARGETS_DIR = path.join(__dirname, "..", "targets");
const NATIVE_FILE = "CaptlyTerminateHandler.mm";

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
      let payload = """
      ====== CAPTLY UNCAUGHT NSEXCEPTION ======
      name: \\(name)
      reason: \\(reason)
      userInfo: \\(userInfo)
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

  let patched = contents.replace(
    /func application\(\s*_ application: UIApplication,\s*didFinishLaunchingWithOptions[^)]*\)\s*->\s*Bool\s*\{/,
    (match) => `${match}\n    ${SETUP_CALL}`
  );

  patched = patched.trimEnd() + "\n" + HELPER_CLASS + "\n";
  return patched;
}

const withSwiftHandler = (config) =>
  withAppDelegate(config, (c) => {
    if (c.modResults.language !== "swift") {
      console.warn("[withCrashDiagnostics] AppDelegate is not Swift, skipping");
      return c;
    }
    c.modResults.contents = patchAppDelegate(c.modResults.contents);
    return c;
  });

const withFileSharing = (config) =>
  withInfoPlist(config, (c) => {
    c.modResults.UIFileSharingEnabled = true;
    c.modResults.LSSupportsOpeningDocumentsInPlace = true;
    return c;
  });

const withTerminateHandlerMM = (config) =>
  withXcodeProject(config, (c) => {
    const project = c.modResults;
    const projectRoot = c.modRequest.projectRoot;
    const iosDir = path.join(projectRoot, "ios");
    const appName = c.modRequest.projectName ?? "captionai";
    const mainAppDir = path.join(iosDir, appName);

    const src = path.join(TARGETS_DIR, "main-app", NATIVE_FILE);
    const dest = path.join(mainAppDir, NATIVE_FILE);
    if (!fs.existsSync(src)) {
      console.warn(`[withCrashDiagnostics] Source missing: ${src}`);
      return c;
    }
    if (!fs.existsSync(dest) || fs.readFileSync(src, "utf8") !== fs.readFileSync(dest, "utf8")) {
      fs.copyFileSync(src, dest);
    }

    const mainTarget = project.getFirstTarget();
    if (!mainTarget) return c;

    const filePath = `${appName}/${NATIVE_FILE}`;
    if (project.hasFile(filePath)) return c;

    // Find the existing PBXGroup whose path == appName so we can attach the
    // .mm file to it. Without an explicit group, xcode@3.0.1's addSourceFile
    // crashes on .mm files with: "Cannot read properties of null (reading 'path')".
    const pbxGroups = project.hash.project.objects.PBXGroup || {};
    let appGroupKey = null;
    for (const [k, v] of Object.entries(pbxGroups)) {
      if (k.endsWith("_comment")) continue;
      if (v && (v.path === appName || v.path === `"${appName}"` || v.name === appName)) {
        appGroupKey = k;
        break;
      }
    }
    if (!appGroupKey) {
      console.warn(`[withCrashDiagnostics] Could not find PBXGroup for ${appName}`);
      return c;
    }

    project.addSourceFile(filePath, { target: mainTarget.uuid }, appGroupKey);
    return c;
  });

module.exports = function withCrashDiagnostics(config) {
  config = withSwiftHandler(config);
  config = withFileSharing(config);
  config = withTerminateHandlerMM(config);
  return config;
};
