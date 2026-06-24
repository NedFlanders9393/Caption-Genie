/**
 * withGoogleModularHeaders.js
 *
 * Fixes the iOS pod install failure:
 *
 *   [!] The following Swift pods cannot yet be integrated as static libraries:
 *   The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and
 *   `RecaptchaInterop`, which do not define modules.
 *
 * @clerk/expo ships a native Google Sign-In module (ClerkGoogleSignIn.podspec →
 * `GoogleSignIn ~> 9.0`), which transitively pulls in AppCheckCore and a chain of
 * Google Obj-C pods. Those Obj-C pods don't define Clang modules, so the Swift
 * Google pods can't `import` them when everything links as static libraries.
 *
 * The CocoaPods error message itself recommends the fix: declare the offending
 * Obj-C pods with `:modular_headers => true`. We do exactly that (only for the
 * Google Obj-C pods) so React Native / Hermes / Reanimated linkage is untouched.
 */

const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "# added by withGoogleModularHeaders";

// Only the Obj-C Google pods that lack Clang modules. The Swift pods
// (GoogleSignIn, AppCheckCore) must NOT be listed — modular_headers is an
// Obj-C concept and they already define modules.
const POD_LINES = [
  "pod 'GoogleUtilities', :modular_headers => true",
  "pod 'RecaptchaInterop', :modular_headers => true",
  "pod 'GTMSessionFetcher', :modular_headers => true",
  "pod 'GTMAppAuth', :modular_headers => true",
  "pod 'AppAuth', :modular_headers => true",
];

module.exports = function withGoogleModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        "Podfile"
      );

      if (!fs.existsSync(podfilePath)) {
        console.warn("[withGoogleModularHeaders] Podfile not found, skipping");
        return cfg;
      }

      let contents = fs.readFileSync(podfilePath, "utf8");
      if (contents.includes(MARKER)) return cfg;

      const injection = `\n  ${MARKER}\n  ${POD_LINES.join("\n  ")}\n`;

      if (contents.includes("use_expo_modules!")) {
        contents = contents.replace(
          "use_expo_modules!",
          `use_expo_modules!${injection}`
        );
      } else {
        // Fallback: insert right after the first target block opener.
        contents = contents.replace(
          /(target\s+['"][^'"]+['"]\s+do[^\n]*\n)/,
          `$1${injection}`
        );
      }

      fs.writeFileSync(podfilePath, contents);
      console.log("[withGoogleModularHeaders] Added modular_headers for Google Obj-C pods");
      return cfg;
    },
  ]);
};
