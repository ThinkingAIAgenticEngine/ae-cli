import { registerCapabilityGatewayRoute } from "../../core/capability-routing.js";
import type { Command } from "../../framework/types.js";
import { projectSemanticAssetPackageExport } from "./asset-package/export.js";
import { projectSemanticSetup } from "./setup.js";

registerCapabilityGatewayRoute("project-semantic", {
  gatewayDomain: "analysis",
  capabilityPrefixes: ["business_semantics.asset_package"],
});

const commands: Command[] = [
  projectSemanticAssetPackageExport,
  projectSemanticSetup,
];

export default commands;
