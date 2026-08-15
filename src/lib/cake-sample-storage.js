/**
 * Server-only cake sample disk paths.
 */

import path from "path";

export function cakeSampleStorageDirs() {
  const cwd = process.cwd();
  return [
    path.join(cwd, "data", "cake-samples"),
    // Legacy location from earlier uploads
    path.join(cwd, "public", "uploads", "cake-samples"),
  ];
}
