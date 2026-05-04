/**
 * withShareExtension.js
 *
 * Expo Config Plugin that:
 *  1. Adds the App Group entitlement to the main app
 *  2. Adds TokenSync native module files to the main app Xcode target
 *  3. Creates the ShareExtension target in the Xcode project
 *  4. Wires up source files, entitlements, and build settings for the extension
 */

const {
  withXcodeProject,
  withEntitlementsPlist,
  withInfoPlist,
} = require("@expo/config-plugins");
const path  = require("path");
const fs    = require("fs");

const APP_GROUP        = "group.com.captionai.app";
const EXT_NAME         = "ShareExtension";
const EXT_BUNDLE_ID    = "com.captionai.app.ShareExtension";
const DEPLOY_TARGET    = "16.0";
const PLUGIN_DIR       = __dirname;
const TARGETS_DIR      = path.join(PLUGIN_DIR, "..", "targets");

// ─── Step 1: Add App Group to main app entitlements ───────────────────────────
const withAppGroup = (config) =>
  withEntitlementsPlist(config, (c) => {
    const groups =
      c.modResults["com.apple.security.application-groups"] ?? [];
    if (!groups.includes(APP_GROUP)) groups.push(APP_GROUP);
    c.modResults["com.apple.security.application-groups"] = groups;
    return c;
  });

// ─── Step 2: Copy native files to ios dir & modify Xcode project ──────────────
const withShareExtensionXcode = (config) =>
  withXcodeProject(config, (c) => {
    const project   = c.modResults;
    const projectRoot = c.modRequest.projectRoot;
    const iosDir    = path.join(projectRoot, "ios");

    // --- 2a. Write TokenSync files into main app target dir ---
    const appName = c.modRequest.projectName ?? "captionai";
    const mainAppDir = path.join(iosDir, appName);

    for (const file of ["TokenSync.swift", "TokenSync.m"]) {
      const src  = path.join(TARGETS_DIR, "main-app", file);
      const dest = path.join(mainAppDir, file);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
      }
    }

    // Add TokenSync files to main app target
    const mainTarget = project.getFirstTarget();
    if (mainTarget) {
      for (const file of ["TokenSync.swift", "TokenSync.m"]) {
        const filePath = `${appName}/${file}`;
        const already  = project.hasFile(filePath);
        if (!already) {
          project.addSourceFile(filePath, { target: mainTarget.uuid });
        }
      }
    }

    // --- 2b. Guard: skip if extension target already exists ---
    const targets = project.pbxNativeTargetSection();
    const exists  = Object.values(targets).some((t) => t?.name === EXT_NAME);
    if (exists) return c;

    // --- 2c. Write extension source files to ios/ShareExtension ---
    const extIosDir = path.join(iosDir, EXT_NAME);
    fs.mkdirSync(extIosDir, { recursive: true });

    for (const file of [
      "ShareViewController.swift",
      "ShareView.swift",
      "Info.plist",
      "ShareExtension.entitlements",
    ]) {
      const src  = path.join(TARGETS_DIR, "ShareExtension", file);
      const dest = path.join(extIosDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      } else {
        console.warn(`[withShareExtension] Missing source file: ${src}`);
      }
    }

    // --- 2d. Create PBX group for the extension ---
    const mainGroupKey = project.getFirstProject().firstProject.mainGroup;
    const extGroupKey  = project.pbxCreateGroup(EXT_NAME, EXT_NAME);
    project.addToPbxGroup(extGroupKey, mainGroupKey);

    // --- 2e. Add the extension target ---
    const extTarget = project.addTarget(
      EXT_NAME,
      "app_extension",
      EXT_NAME,
      EXT_BUNDLE_ID
    );

    // --- 2f. Add build phases ---
    project.addBuildPhase(
      [],
      "PBXSourcesBuildPhase",
      "Sources",
      extTarget.uuid
    );
    project.addBuildPhase(
      [],
      "PBXResourcesBuildPhase",
      "Resources",
      extTarget.uuid
    );
    project.addBuildPhase(
      [],
      "PBXFrameworksBuildPhase",
      "Frameworks",
      extTarget.uuid
    );

    // --- 2g. Add Swift source files to group & target ---
    for (const file of ["ShareViewController.swift", "ShareView.swift"]) {
      project.addSourceFile(
        `${EXT_NAME}/${file}`,
        { target: extTarget.uuid },
        extGroupKey
      );
    }

    // Add Info.plist as resource
    project.addResourceFile(
      `${EXT_NAME}/Info.plist`,
      { target: extTarget.uuid },
      extGroupKey
    );

    // --- 2h. Set build settings on each configuration ---
    const configurations = project.pbxXCBuildConfigurationSection();
    const nativeTargetSection = project.pbxNativeTargetSection();
    const nativeTarget = nativeTargetSection[extTarget.uuid];
    const configListKey = nativeTarget?.buildConfigurationList;
    const configList = project.pbxXCConfigurationListSection()[configListKey];

    if (configList?.buildConfigurations) {
      for (const ref of configList.buildConfigurations) {
        const cfg = configurations[ref.value];
        if (!cfg?.buildSettings) continue;
        const bs = cfg.buildSettings;
        bs.SWIFT_VERSION                           = '"5.0"';
        bs.IPHONEOS_DEPLOYMENT_TARGET              = `"${DEPLOY_TARGET}"`;
        bs.INFOPLIST_FILE                          = `"${EXT_NAME}/Info.plist"`;
        bs.CODE_SIGN_ENTITLEMENTS                  = `"${EXT_NAME}/${EXT_NAME}.entitlements"`;
        bs.PRODUCT_BUNDLE_IDENTIFIER               = `"${EXT_BUNDLE_ID}"`;
        bs.SKIP_INSTALL                            = "YES";
        bs.ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES   = "NO";
        bs.APPLICATION_EXTENSION_API_ONLY          = "YES";
        bs.TARGETED_DEVICE_FAMILY                  = '"1"';
        bs.CODE_SIGN_STYLE                         = '"Automatic"';
      }
    }

    return c;
  });

// ─── Compose the plugin ────────────────────────────────────────────────────────
module.exports = (config) => {
  config = withAppGroup(config);
  config = withShareExtensionXcode(config);
  return config;
};
