import { registerCapabilityGatewayRoute } from "../../core/capability-routing.js";
import type { Command } from "../../framework/types.js";
import { projectSemanticList } from "./list.js";
import { projectSemanticGet } from "./get.js";
import { projectSemanticEnable } from "./enable.js";
import { projectSemanticDisable } from "./disable.js";
import { projectSemanticDelete } from "./delete.js";
import { projectSemanticDeleteImpact } from "./delete-impact.js";
import { projectSemanticAssetPackageExport } from "./asset-package/export.js";
import { projectSemanticCandidateSubmit } from "./candidate/submit.js";
import { projectSemanticCandidateEnable } from "./candidate/enable.js";
import { projectSemanticCandidateValidate } from "./candidate/validate.js";
import { projectSemanticCandidateList } from "./candidate/list.js";
import { projectSemanticCandidateGet } from "./candidate/get.js";
import { projectSemanticCandidateEdit } from "./candidate/edit.js";
import { projectSemanticReleaseList } from "./release/list.js";
import { projectSemanticReleasePublish } from "./release/publish.js";

registerCapabilityGatewayRoute("project-semantic", {
  gatewayDomain: "analysis",
});

const commands: Command[] = [
  projectSemanticList,
  projectSemanticGet,
  projectSemanticEnable,
  projectSemanticDisable,
  projectSemanticDeleteImpact,
  projectSemanticDelete,
  projectSemanticAssetPackageExport,
  projectSemanticCandidateValidate,
  projectSemanticCandidateSubmit,
  projectSemanticCandidateEnable,
  projectSemanticCandidateList,
  projectSemanticCandidateGet,
  projectSemanticCandidateEdit,
  projectSemanticReleaseList,
  projectSemanticReleasePublish,
];

export default commands;
