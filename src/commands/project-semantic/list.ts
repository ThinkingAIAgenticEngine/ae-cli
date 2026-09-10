import {
  compactInput,
  createProjectSemanticCommand,
  optionalString,
} from "./shared.js";

export const projectSemanticList = createProjectSemanticCommand({
  resource: "",
  command: "list",
  capabilityId: "business_semantics.catalog.get",
  description:
    "List project semantics by lifecycle status; defaults to enabled semantics for consumption.",
  flags: [
    {
      name: "project-id",
      type: "number",
      required: true,
      desc: "Numeric project ID.",
      alias: "p",
      min: 1,
    },
    {
      name: "status",
      type: "string",
      desc: "Lifecycle status: active or disabled. Defaults to active.",
    },
  ],
  risk: "read",
  validate: (ctx) => {
    const status = optionalString(ctx, "status");
    if (status && !["active", "disabled"].includes(status.toLowerCase())) {
      throw new Error("--status must be active or disabled.");
    }
  },
  buildInput: (ctx) =>
    compactInput({
      project_id: ctx.num("project-id"),
      status: optionalString(ctx, "status")?.toLowerCase(),
    }),
});
