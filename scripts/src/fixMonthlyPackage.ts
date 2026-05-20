import { getUncachableRevenueCatClient } from "./revenueCatClient.js";
import { detachProductsFromPackage, attachProductsToPackage } from "@replit/revenuecat-sdk";

const PROJECT_ID = "projafe0b89d";
const PACKAGE_ID = "pkgead65f2a6b4";
const OLD_PRODUCT_ID = "prod87de01387c";
const NEW_PRODUCT_ID = "prod7ac1d1c951";

async function fix() {
  const client = await getUncachableRevenueCatClient();

  console.log("Detaching old product from $rc_monthly...");
  const { error: detachError } = await detachProductsFromPackage({
    client,
    path: { project_id: PROJECT_ID, package_id: PACKAGE_ID },
    body: { product_ids: [OLD_PRODUCT_ID] },
  });
  if (detachError) {
    console.error("Detach error:", JSON.stringify(detachError));
  } else {
    console.log("Detached old product successfully");
  }

  console.log("Attaching new product to $rc_monthly...");
  const { error: attachError } = await attachProductsToPackage({
    client,
    path: { project_id: PROJECT_ID, package_id: PACKAGE_ID },
    body: { products: [{ product_id: NEW_PRODUCT_ID, eligibility_criteria: "all" }] },
  });
  if (attachError) {
    console.error("Attach error:", JSON.stringify(attachError));
  } else {
    console.log("Attached new product successfully");
  }
}

fix().catch(console.error);
