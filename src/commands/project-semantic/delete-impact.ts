import { createProjectSemanticCommand } from "./shared.js";

export const projectSemanticDeleteImpact = createProjectSemanticCommand({
  resource: "",
  command: "delete-impact",
  capabilityId: "business_semantics.entry.delete_impact",
  description:
    "Preview rows affected by physically deleting one disabled project semantic.",
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
      name: "semantic-id",
      type: "string",
      required: true,
      desc: "Exact semantic ID to inspect.",
    },
  ],
  risk: "read",
  buildInput: (ctx) => ({
    project_id: ctx.num("project-id"),
    semantic_id: ctx.str("semantic-id"),
  }),
});
