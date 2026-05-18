import { getUncachableRevenueCatClient } from "./revenueCatClient.js";

import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "CaptionAI";

const APP_STORE_APP_NAME = "CaptionAI iOS";
const APP_STORE_BUNDLE_ID = "com.captionai.app";
const PLAY_STORE_APP_NAME = "CaptionAI Android";
const PLAY_STORE_PACKAGE_NAME = "com.captionai.app";

const ENTITLEMENT_IDENTIFIER = "pro";
const ENTITLEMENT_DISPLAY_NAME = "Pro Access";

const OFFERING_IDENTIFIER = "default";
const OFFERING_DISPLAY_NAME = "Default Offering";

// Monthly plan — $9.99/month
const MONTHLY_PRODUCT_ID = "com.captionai.app.pro.monthly";
const MONTHLY_PLAY_STORE_ID = "com.captionai.app.pro.monthly:monthly";
const MONTHLY_DISPLAY_NAME = "CaptionAI Pro Monthly";
const MONTHLY_TITLE = "CaptionAI Pro Monthly";
const MONTHLY_DURATION = "P1M";
const MONTHLY_PACKAGE_ID = "$rc_monthly";
const MONTHLY_PACKAGE_NAME = "Monthly – $9.99";
const MONTHLY_PRICES = [
  { amount_micros: 9990000, currency: "USD" },
  { amount_micros: 8990000, currency: "EUR" },
];

// Annual plan — $49.99/year
const ANNUAL_PRODUCT_ID = "com.captionai.app.pro.yearly";
const ANNUAL_PLAY_STORE_ID = "com.captionai.app.pro.yearly:annual";
const ANNUAL_DISPLAY_NAME = "CaptionAI Pro Annual";
const ANNUAL_TITLE = "CaptionAI Pro Annual";
const ANNUAL_DURATION = "P1Y";
const ANNUAL_PACKAGE_ID = "$rc_annual";
const ANNUAL_PACKAGE_NAME = "Annual – $49.99";
const ANNUAL_PRICES = [
  { amount_micros: 49990000, currency: "USD" },
  { amount_micros: 44990000, currency: "EUR" },
];

// ── One-time credit packs (consumable IAPs) ─────────────────────────────────
// These are NOT subscriptions. They grant credits via the RevenueCat webhook
// (NON_RENEWING_PURCHASE event) and never expire on the user's balance.
// IMPORTANT: keep these identifiers in sync with:
//   - artifacts/api-server/src/routes/revenuecatWebhook.ts → CREDIT_PACK_PRODUCTS
//   - artifacts/captionai-mobile/components/Paywall.tsx    → TOP_UP_PACK_IDS
const CREDIT_PACKS = [
  {
    label: "Credits50",
    storeId: "com.captionai.app.credits.50",
    displayName: "50 Captly Credits",
    title: "50 Captly Credits",
    packageId: "credits_50",
    packageName: "50 Credits – $4.99",
    prices: [
      { amount_micros: 4990000, currency: "USD" },
      { amount_micros: 4490000, currency: "EUR" },
    ],
  },
  {
    label: "Credits200",
    storeId: "com.captionai.app.credits.200",
    displayName: "200 Captly Credits",
    title: "200 Captly Credits",
    packageId: "credits_200",
    packageName: "200 Credits – $14.99",
    prices: [
      { amount_micros: 14990000, currency: "USD" },
      { amount_micros: 13990000, currency: "EUR" },
    ],
  },
  {
    label: "Credits500",
    storeId: "com.captionai.app.credits.500",
    displayName: "500 Captly Credits",
    title: "500 Captly Credits",
    packageId: "credits_500",
    packageName: "500 Credits – $29.99",
    prices: [
      { amount_micros: 29990000, currency: "USD" },
      { amount_micros: 27990000, currency: "EUR" },
    ],
  },
] as const;

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  // ── Project ──────────────────────────────────────────────────────────────
  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });
  if (listProjectsError) throw new Error("Failed to list projects");

  const existingProject = existingProjects.items?.find((p) => p.name === PROJECT_NAME);
  if (existingProject) {
    console.log("Project already exists:", existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error } = await createProject({ client, body: { name: PROJECT_NAME } });
    if (error) throw new Error("Failed to create project");
    console.log("Created project:", newProject.id);
    project = newProject;
  }

  // ── Apps ─────────────────────────────────────────────────────────────────
  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps || apps.items.length === 0) throw new Error("No apps found");

  let testApp: App | undefined = apps.items.find((a) => a.type === "test_store");
  let appStoreApp: App | undefined = apps.items.find((a) => a.type === "app_store");
  let playStoreApp: App | undefined = apps.items.find((a) => a.type === "play_store");

  if (!testApp) throw new Error("No test store app found");
  console.log("Test store app:", testApp.id);

  if (!appStoreApp) {
    const { data, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: APP_STORE_APP_NAME, type: "app_store", app_store: { bundle_id: APP_STORE_BUNDLE_ID } },
    });
    if (error) throw new Error("Failed to create App Store app");
    appStoreApp = data;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app found:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: PLAY_STORE_APP_NAME, type: "play_store", play_store: { package_name: PLAY_STORE_PACKAGE_NAME } },
    });
    if (error) throw new Error("Failed to create Play Store app");
    playStoreApp = data;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app found:", playStoreApp.id);
  }

  // ── Products ─────────────────────────────────────────────────────────────
  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error("Failed to list products");

  const ensureProduct = async (
    targetApp: App,
    label: string,
    storeId: string,
    isTestStore: boolean,
    displayName: string,
    title: string,
    duration: string | null
  ): Promise<Product> => {
    const existing = existingProducts.items?.find(
      (p) => p.store_identifier === storeId && p.app_id === targetApp.id
    );
    if (existing) {
      console.log(`${label} product already exists:`, existing.id);
      return existing;
    }
    // duration === null → consumable (one-time IAP), otherwise subscription
    const isConsumable = duration === null;
    const body: CreateProductData["body"] = {
      store_identifier: storeId,
      app_id: targetApp.id,
      type: isConsumable ? "consumable" : "subscription",
      display_name: displayName,
    };
    if (isTestStore) {
      body.title = title;
      if (!isConsumable) {
        // duration is constrained to RC's Duration enum; existing call sites
        // pass valid ISO 8601 values ("P1M" / "P1Y") so cast is safe.
        body.subscription = { duration: duration as never };
      }
    }
    const { data: created, error } = await createProduct({ client, path: { project_id: project.id }, body });
    if (error) {
      // RC returns resource_already_exists when display_name is taken even if
      // store_identifier lookup above missed (e.g. a prior run used a slightly
      // different identifier). Re-fetch and match by display_name as fallback.
      if (typeof error === "object" && "type" in error && (error as any).type === "resource_already_exists") {
        const { data: refetched } = await listProducts({ client, path: { project_id: project.id }, query: { limit: 100 } });
        const found = refetched?.items?.find(
          (p) => p.app_id === targetApp.id && p.display_name === displayName
        );
        if (found) {
          console.log(`${label} product already exists (display_name match):`, found.id);
          return found;
        }
      }
      throw new Error(`Failed to create ${label} product: ${JSON.stringify(error)}`);
    }
    console.log(`Created ${label} product:`, created.id);
    return created;
  };

  const addTestStorePrices = async (product: Product, prices: typeof MONTHLY_PRICES) => {
    const { error } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: product.id },
      body: { prices },
    });
    if (error) {
      if (typeof error === "object" && "type" in error && error["type"] === "resource_already_exists") {
        console.log("Test store prices already exist for", product.id);
      } else {
        throw new Error("Failed to add test store prices for " + product.id);
      }
    } else {
      console.log("Added test store prices for", product.id);
    }
  };

  // Monthly products
  const monthlyTest = await ensureProduct(testApp, "Test/Monthly", MONTHLY_PRODUCT_ID, true, MONTHLY_DISPLAY_NAME, MONTHLY_TITLE, MONTHLY_DURATION);
  const monthlyAppStore = await ensureProduct(appStoreApp, "AppStore/Monthly", MONTHLY_PRODUCT_ID, false, MONTHLY_DISPLAY_NAME, MONTHLY_TITLE, MONTHLY_DURATION);
  const monthlyPlayStore = await ensureProduct(playStoreApp, "PlayStore/Monthly", MONTHLY_PLAY_STORE_ID, false, MONTHLY_DISPLAY_NAME, MONTHLY_TITLE, MONTHLY_DURATION);
  await addTestStorePrices(monthlyTest, MONTHLY_PRICES);

  // Annual products
  const annualTest = await ensureProduct(testApp, "Test/Annual", ANNUAL_PRODUCT_ID, true, ANNUAL_DISPLAY_NAME, ANNUAL_TITLE, ANNUAL_DURATION);
  const annualAppStore = await ensureProduct(appStoreApp, "AppStore/Annual", ANNUAL_PRODUCT_ID, false, ANNUAL_DISPLAY_NAME, ANNUAL_TITLE, ANNUAL_DURATION);
  const annualPlayStore = await ensureProduct(playStoreApp, "PlayStore/Annual", ANNUAL_PLAY_STORE_ID, false, ANNUAL_DISPLAY_NAME, ANNUAL_TITLE, ANNUAL_DURATION);
  await addTestStorePrices(annualTest, ANNUAL_PRICES);

  // ── Credit-pack consumables ────────────────────────────────────────────
  // Same store_identifier on all three stores so the RC webhook (which
  // receives the App Store / Play Store product id) can map deterministically.
  const creditPackProducts: { pack: typeof CREDIT_PACKS[number]; testId: string; appStoreId: string; playStoreId: string }[] = [];
  for (const pack of CREDIT_PACKS) {
    const test = await ensureProduct(testApp, `Test/${pack.label}`, pack.storeId, true, pack.displayName, pack.title, null);
    const appStore = await ensureProduct(appStoreApp, `AppStore/${pack.label}`, pack.storeId, false, pack.displayName, pack.title, null);
    const playStore = await ensureProduct(playStoreApp, `PlayStore/${pack.label}`, pack.storeId, false, pack.displayName, pack.title, null);
    await addTestStorePrices(test, pack.prices as unknown as typeof MONTHLY_PRICES);
    creditPackProducts.push({ pack, testId: test.id, appStoreId: appStore.id, playStoreId: playStore.id });
  }

  // ── Entitlement ───────────────────────────────────────────────────────────
  let entitlement: Entitlement;
  const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listEntitlementsError) throw new Error("Failed to list entitlements");

  const existingEntitlement = existingEntitlements.items?.find((e) => e.lookup_key === ENTITLEMENT_IDENTIFIER);
  if (existingEntitlement) {
    console.log("Entitlement already exists:", existingEntitlement.id);
    entitlement = existingEntitlement;
  } else {
    const { data, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: { lookup_key: ENTITLEMENT_IDENTIFIER, display_name: ENTITLEMENT_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create entitlement");
    console.log("Created entitlement:", data.id);
    entitlement = data;
  }

  const allProductIds = [
    monthlyTest.id, monthlyAppStore.id, monthlyPlayStore.id,
    annualTest.id, annualAppStore.id, annualPlayStore.id,
  ];

  const { error: attachEntitlementError } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: { product_ids: allProductIds },
  });
  if (attachEntitlementError) {
    if (attachEntitlementError.type === "unprocessable_entity_error") {
      console.log("Products already attached to entitlement");
    } else {
      throw new Error("Failed to attach products to entitlement");
    }
  } else {
    console.log("Attached all products to entitlement");
  }

  // ── Offering ──────────────────────────────────────────────────────────────
  let offering: Offering;
  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOfferingsError) throw new Error("Failed to list offerings");

  const existingOffering = existingOfferings.items?.find((o) => o.lookup_key === OFFERING_IDENTIFIER);
  if (existingOffering) {
    console.log("Offering already exists:", existingOffering.id);
    offering = existingOffering;
  } else {
    const { data, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: { lookup_key: OFFERING_IDENTIFIER, display_name: OFFERING_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create offering");
    console.log("Created offering:", data.id);
    offering = data;
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Failed to set offering as current");
    console.log("Set offering as current");
  }

  // ── Packages ──────────────────────────────────────────────────────────────
  const { data: existingPackages, error: listPackagesError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });
  if (listPackagesError) throw new Error("Failed to list packages");

  const ensurePackage = async (lookupKey: string, displayName: string): Promise<Package> => {
    const existing = existingPackages.items?.find((p) => p.lookup_key === lookupKey);
    if (existing) {
      console.log("Package already exists:", existing.id, lookupKey);
      return existing;
    }
    const { data, error } = await createPackages({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { lookup_key: lookupKey, display_name: displayName },
    });
    if (error) throw new Error("Failed to create package " + lookupKey);
    console.log("Created package:", data.id, lookupKey);
    return data;
  };

  const attachPackage = async (pkg: Package, productIds: string[]) => {
    const { error } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: {
        products: productIds.map((id) => ({ product_id: id, eligibility_criteria: "all" as const })),
      },
    });
    if (error) {
      if (error.type === "unprocessable_entity_error" && error.message?.includes("Cannot attach product")) {
        console.log("Skipping package attach (already attached):", pkg.id);
      } else {
        throw new Error("Failed to attach products to package " + pkg.id);
      }
    } else {
      console.log("Attached products to package:", pkg.id);
    }
  };

  const monthlyPkg = await ensurePackage(MONTHLY_PACKAGE_ID, MONTHLY_PACKAGE_NAME);
  await attachPackage(monthlyPkg, [monthlyTest.id, monthlyAppStore.id, monthlyPlayStore.id]);

  const annualPkg = await ensurePackage(ANNUAL_PACKAGE_ID, ANNUAL_PACKAGE_NAME);
  await attachPackage(annualPkg, [annualTest.id, annualAppStore.id, annualPlayStore.id]);

  // Credit-pack packages (one per pack). NOT attached to the `pro` entitlement —
  // these are pure consumables; the credit ledger is the source of truth.
  for (const cp of creditPackProducts) {
    const pkg = await ensurePackage(cp.pack.packageId, cp.pack.packageName);
    await attachPackage(pkg, [cp.testId, cp.appStoreId, cp.playStoreId]);
  }

  // ── API Keys ──────────────────────────────────────────────────────────────
  const { data: testKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: testApp.id } });
  const { data: iosKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: appStoreApp.id } });
  const { data: androidKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: playStoreApp.id } });

  console.log("\n====================");
  console.log("RevenueCat setup complete!");
  console.log("Project ID:", project.id);
  console.log("Test Store App ID:", testApp.id);
  console.log("App Store App ID:", appStoreApp.id);
  console.log("Play Store App ID:", playStoreApp.id);
  console.log("Entitlement:", ENTITLEMENT_IDENTIFIER);
  console.log("Public API Keys - Test Store:", testKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("Public API Keys - App Store:", iosKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("Public API Keys - Play Store:", androidKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("====================\n");
  console.log("NEXT STEPS — set these environment variables:");
  console.log("REVENUECAT_PROJECT_ID=" + project.id);
  console.log("REVENUECAT_TEST_STORE_APP_ID=" + testApp.id);
  console.log("REVENUECAT_APPLE_APP_STORE_APP_ID=" + appStoreApp.id);
  console.log("REVENUECAT_GOOGLE_PLAY_STORE_APP_ID=" + playStoreApp.id);
  console.log("EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=" + (testKeys?.items[0]?.key ?? "N/A"));
  console.log("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=" + (iosKeys?.items[0]?.key ?? "N/A"));
  console.log("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=" + (androidKeys?.items[0]?.key ?? "N/A"));
}

seedRevenueCat().catch(console.error);
