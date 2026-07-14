### 6.0.29
**Date:** 2026-07-13

**Changes:**

* Add capability gateway discovery commands (`capability list/search/inspect/dry-run/run`) with `ae-capability` skill and command-admission docs for long-tail capabilities
* Migrate project-space and folder create/delete/share/members mutations to L3 capability flows; remove curated L2 commands
* Align CLI risk levels with lark-cli three-tier model (`read` / `write` / `high-risk-write`) and tighten delete confirmation behavior
* Route data-management capabilities to `analysis-meta` domain; fix metric, virtual-property, and super-metadata import CLI input contracts
* Sync analysis and audience CLI contracts: ten ad-hoc QP builders, cluster-definition top-level params, drilldown pagination, and report version fields
* Fix ID cluster update/delete routing to `te_analysis_extend` MCP service
* Document `SqlDatatableDef` qp shape and examples for `metadata data-table sql-write`

### 6.0.28
**Date:** 2026-07-10

**Changes:**

* Add 47 analysis data-management capability commands (event, property, virtual-event, virtual-property, metric, asset, exchange, datatable, super-metadata)
* Align super-metadata export with async XLSX artifact workflow (`request-id`, `timeout-seconds`, run inspect + artifact download)
* Add BI panel version get/publish commands; clarify released vs draft panel contracts, daily-report send flags, and dashboard report filter usage
* Improve tracking-plan and tracking-code skills (snippet delivery and plan workflow docs)

### 6.0.27
**Date:** 2026-07-09

**Changes:**

* Expand te-agent with sandbox/agent CRUD for agents, MCPs, skills, and models
* Add analysis artifact download and run inspect commands; refine dashboard export contracts
* Migrate DataOps API calls to cli-token and support taskInstanceId in task instance detail
* Improve CLI token handling with daily renew, clearer 403 errors, and host URL normalization
* Adapt engage save_flow protocol and support tracking-plan file upload in sandbox workspace

### 6.0.24
**Date:** 2026-07-08

**Changes:**

* Fix auth bugs
* Add 40+ commands across dashboard and project space domains

### 6.0.22
**Date:** 2026-07-07

**Changes:**

* Refactor auth
* Update tracking CLI commands
* Add new metadata domain commands

### 6.0.20
**Date:** 2026-07-02

**Changes:**

* Enhance stability

### 6.0.18
**Date:** 2026-06-27

**Changes:**

* Enhance stability

### 6.0.16
**Date:** 2026-06-25

**Changes:**

* Supports tracking command

### 1.0.30
**Date:** 2026-06-23

**Changes:**

* Enhance stability

### 1.0.29
**Date:** 2026-06-23

**Changes:**

* Enhance stability

### 1.0.28
**Date:** 2026-06-22

**Changes:**

* Enhance the security of use

### 1.0.27
**Date:** 2026-06-18

**Changes:**

* Support customer workspace

### 1.0.24
**Date:** 2026-06-05

**Changes:**

* Add knowledge base (KB) commands

### 1.0.20
**Date:** 2026-05-27

**Changes:**

* Add analysis guided QP builder command and dry-run regression verification

### 1.0.19
**Date:** 2026-05-21

**Changes:**

* Improve skills

### 1.0.17
**Date:** 2026-05-07

**Changes:**

* Improve login flow

### 1.0.16
**Date:** 2026-04-30

**Changes:**

* Initial release of the ae-cli terminal tool
