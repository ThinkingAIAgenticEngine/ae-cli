# TE Tracking Feasibility Analyzer

Systematically evaluate how well a customer's tracking plan matches their analysis requirements, determine the feasibility of each analysis requirement in the TE system, and generate a feasibility assessment report in Excel format.

---

## 🎯 Core Workflow

### Phase 1: Data Preparation and Parsing

#### 1.1 Receive Customer Data

The customer must provide the following data (format can be Excel spreadsheet, CSV, Markdown table, or structured text):

**Tracking plan data**:
- Event data table
- User property table
- Common event property table (if available)

**Analysis requirement list**:
The customer must provide an analysis requirement list, which can be in the following formats:
- Numbered list (e.g., 1. View daily new users)
- Categorized list (e.g., I. New user category: 1. Daily new users 2. New users by channel)
- Free-form description (e.g., I want to see retention, payment conversion, etc.)

#### 1.2 Data Structuring and Standardization

**Step 1: Parse the customer's tracking plan**

Convert the customer's tracking plan into an internal structure:

```json
{
  "events": [
    {
      "name_en": "app_start_up",
      "name_display": "Game Launch",
      "properties": [
        {"name_en": "start_time", "name_display": "Start Time", "type": "datetime"}
      ]
    }
  ],
  "user_properties": [
    {"name_en": "total_payment_amount", "name_display": "Total Payment Amount", "type": "number"}
  ],
  "common_properties": [
    {"name_en": "device_id", "name_display": "Device ID", "type": "string"}
  ]
}
```

**Step 2: Field name translation and standardization**

For tracking that only has English field names, automatically translate them into display names.

**Translation rules**:
- Exact match first: look up exact matches in the translation table
- Inference rules as supplement: infer by keyword when no match is found (e.g., contains "amount" → "Amount")
- Keep original: field names that cannot be inferred keep their original English names

> 📖 **Translation reference table**: see `references/te-field-translations.md`, which contains bilingual mappings for 300+ common event names and property names in the gaming industry.

**Step 3: Generate standard tracking format tables**

Convert the customer's tracking plan into the standard TE tracking format:

| Table name | Required columns | Optional columns |
|:-----|:-------|:-------|
| #Event Data | Event Name, Property Name, Property Type | Event Display Name, Property Display Name, Description |
| #User Data | Property Name, Property Type | Property Display Name, Description |
| #Common Event Properties | Property Name, Property Type | Property Display Name, Description |

> ⚠️ **Important: complete output requirement**
> - **You must completely convert all tracking data provided by the customer into standard format output, without omitting any event or property**
> - Each property of each event gets its own row; the event name can repeat
> - Events without properties also need one row, with the property columns left blank
> - User properties and common event properties also require complete output

---

### Phase 2: Per-requirement Feasibility Assessment

#### 2.0 Requirement Decomposition Rules (important)

Before starting feasibility assessment, you must first decompose the customer's analysis requirements to ensure each requirement is atomic and independently assessable.

---

**✅ Cases that need decomposition**:

| Decomposition type | Description | Example |
|:---------|:-----|:-----|
| **Multiple resources/currency types** | Different resources need different events to support | "View daily diamonds and coins produced" → split into ① View daily diamonds produced ② View daily coins produced |
| **Multiple metric types** | Different metrics need different configurations | "View payment amount and payment count" → split into ① View payment amount ② View payment count |
| **Multiple analysis scenarios** | Different scenarios need different models | "View paying user LTV and retention" → split into ① View paying user LTV ② View paying user retention |

---

**❌ Cases that do NOT need decomposition**:

| Non-decomposition type | Description | Example |
|:-----------|:-----|:-----|
| **Multiple time granularities** | Same metric at different time granularities | "View new users by day, week, and month" → treat as one requirement |
| **Multiple time periods** | D1/D3/D7/D14/D30 etc. periods | "Per-user rewarded ad count at D1, D3, D7 after registration" → treat as one requirement |
| **Multiple value ranges** | Different ranges of the same metric | "Proportion of users with payment amounts in ranges $[1-5), $[5-10), $[10-20)" → treat as one requirement |
| **Multiple grouping dimensions** | Same metric grouped by multiple dimensions | "View new users by channel and country" → treat as one requirement |
| **Multiple same-type objects** | Multiple levels/products etc. | "Entry count per level" → treat as one requirement (group by level_id) |

---

**Decomposition checklist**:

1. ✅ **Multiple resource types?** (diamonds, coins, stamina, etc. → decompose)
2. ✅ **Multiple metric types?** (amount, count, number of users, etc. → decompose)
3. ✅ **Multiple analysis scenarios?** (LTV, retention, distribution, etc. → decompose)
4. ❌ **Multiple time granularities/periods?** (D1/D3/D7, day/week/month → do not decompose)
5. ❌ **Multiple value ranges?** ($[1-5), $[5-10), etc. → do not decompose)
6. ❌ **Multiple grouping dimensions?** (channel, country, etc. → do not decompose)

#### 2.1 Model Determination (using decision tree)

Based on the requirement description, determine the TE model to use according to the following decision tree:

**Model determination decision tree (from highest to lowest priority)**:

```
Step 1: Does the user explicitly mention a model name?
  → User says "funnel analysis" → FUNNEL
  → User says "retention analysis" → RETENTION
  → User says "interval analysis" → INTERVAL
  → User says "distribution analysis" → DISTRIBUTION
  → User says "path analysis" → PATH
  → User says "composition analysis" → COMPOSITION
  → User says "attribution analysis" → ATTRIBUTION
  (Explicit model names have the highest priority and are used directly)

Step 2: Contains the "interval" (time interval) keyword?
  → YES → INTERVAL

Step 3: Contains the "funnel" keyword, or an explicit multi-step conversion description?
  Determine: contains "funnel", "conversion of A then B then C", or "A→B→C"
  → YES → If it also contains "retention" → RETENTION
          → Otherwise → FUNNEL

Step 4: Contains "retention" / "LTV" / "churn"?
  → YES → RETENTION

Step 5: Contains "ROI"?
  → YES → RETENTION (ROI is a derived metric of the retention model in TE)

Step 6: Contains "distribution"?
  → YES → Is the analysis object a static user property (level, region, age, and other inherent properties)?
          → YES → COMPOSITION (composition analysis)
          → NO → DISTRIBUTION (distribution analysis)

Step 7: Contains "TOP" / "ranking" / "which is the highest"?
  → YES → Is the ranking object an analysis dimension (game/channel/product, etc.)?
          → YES → RANK
          → Is the ranking object about finding specific users?
          → YES → OTHER

Step 8: Contains "path" / "behavior trace" / "Sankey diagram" / "what did they do"?
  → YES → PATH

Step 9: Contains "attribution" / "touchpoint contribution" / "channel contribution"?
  → YES → ATTRIBUTION

Step 10: Contains "heatmap" / "hot spot area" / "coordinate distribution"?
  → YES → HEATMAP

Step 11: User filtering/export/list requirement? Or prediction type? Or unclassifiable?
  → YES → OTHER / SQL

Step 12: None of the above matches?
  → EVENT (event analysis is the default model)
```

---

**Edge cases and ambiguity resolution rules (must be strictly followed)**:

| # | Scenario | Correct determination | Reason |
|:---|:------|:----------|:------|
| 1 | "Payment rate" appears alone | event | A single calculated metric, not a multi-step conversion |
| 2 | "First-day payment rate" | event | Although "rate" implies conversion, it is a single metric |
| 3 | "Penetration rate" | funnel | Implies an A-to-B conversion process |
| 4 | "Payment amount trend" | event | Time-series aggregation |
| 5 | "Payment amount distribution" | distribution | User-level distribution |
| 6 | "Daily XX distribution" | distribution | "distribution" has priority over "daily" |
| 7 | "Users with the highest recharge" | other | Finding specific users, not a leaderboard |
| 8 | "Game with the highest recharge" | rank | Game is an analysis dimension |
| 9 | "First A then B" + no model keyword | funnel | Sequential actions imply conversion |
| 10 | "First A then B" + "retention" | retention | Explicit model keyword takes priority |
| 11 | LTV (any form) | retention | 100% rule, no exceptions |
| 12 | Churn (any form) | retention | Churn is the opposite of retention |
| 13 | ROI (any form) | retention | TE calculates ROI through the retention model |
| 14 | User list/filter/cluster requirement | other | Not within the scope of analysis models |
| 15 | Prediction-type requirement | other | TE does not support predictive analysis |
| 16 | "Count distribution" / "user count distribution" | distribution | Determined by the "distribution" keyword |
| 17 | "Daily distribution of login user count" | distribution | "distribution" > "daily" |
| 18 | Simply asking the user count/count of a certain event | event | The most basic event analysis |

**Core determination rules (must be followed)**:
- "Payment rate" alone → EVENT (single calculated metric)
- "Penetration rate" → FUNNEL (implies a conversion process)
- "Payment amount trend" → EVENT (time series)
- "Payment amount distribution" → DISTRIBUTION (user-level distribution)
- LTV/churn/ROI (any form) → RETENTION (100% rule)
- Need to find specific users → SQL (not a leaderboard)
- Prediction-type requirement → SQL (TE does not support prediction)

#### 2.2 Field Mapping and Coverage Check

**Step A: Extract the events and properties required by the requirement**

Based on the requirement semantics and the selected model, extract the required:
- Events (e.g., a "new users" requirement needs a register event)
- Event properties (e.g., a "payment amount" requirement needs a pay_amount property)
- User properties (e.g., a "user profile" requirement needs user properties such as VIP level)
- Common event properties (e.g., grouping by channel needs #channel)

**Step B: Match against the customer's tracking plan**

Match the extracted required fields against the customer's tracking plan:

1. **✅ Existing fields**: fields explicitly defined in the customer's tracking plan
2. **❌ Missing fields**: fields that do not exist in the customer's tracking plan

> ⚠️ **Important: field existence check**
> - You must verify one by one whether the required events and properties exist in the customer's tracking plan
> - Pay attention to distinguishing events from user properties: fields in the user property table cannot substitute for events
> - Example: the user property table has golden_coin (held coins), but there is no spend_coin or obtain_coin event, so the "view coin consumption/production" requirement should be determined as cannot be implemented
> - Common mistakes: mistaking a user property for an event, or misusing an event with a similar name (e.g., mistaking view_coin_ad for a coin production event)

#### 2.3 Feasibility Determination Rules

**Determined as "can be implemented"**:
- All required fields already exist in the customer's tracking plan
- Although the requirement logic is complex and standard models cannot support it, it can be implemented via SQL

**Determined as "partially implementable"**:
- Some required fields are missing, but can be implemented through alternative solutions
- Or the requirement can be approximately implemented by modifying the statistical basis

**Determined as "cannot be implemented"**:
- Core required fields are completely missing with no alternative solution
- The requirement exceeds the capability boundary of the selected TE model

---

### Phase 3: Generate the Excel Report

> ⚠️ **Important: must generate all 5 sheets**
> The Excel report must contain all of the following 5 sheets, none may be omitted:
> 1. TE Model Feasibility Assessment
> 2. Summary Statistics
> 3. #Event Data
> 4. #User Data
> 5. #Common Event Properties

#### 3.1 Excel File Structure

Generate an Excel file containing 5 sheets:

**Sheet 1: TE Model Feasibility Assessment**

| Column name | Description |
|:-----|:-----|
| No. | Requirement number |
| Requirement category | Category the requirement belongs to |
| Specific analysis requirement | Detailed description of the requirement |
| Recommended TE model | Recommended TE model |
| Implementable | Yes/Partially/No |
| ✅ Events/properties already in xlsx | Fields already in the customer's plan |
| ❌ Completely missing events/properties | Completely missing fields |
| Reason for No/Partial | Reason explanation |
| Alternative solution/suggestion | Specific suggestions, e.g., add XX tracking |

**Sheet 2: Summary Statistics**

Contains:
- I. Assessment result summary (count and proportion of Yes/Partially/No)
- II. Events/properties completely missing from the xlsx tracking plan

**Sheet 3: #Event Data**

Standard tracking format, including:
- Event Name (required)
- Event Display Name
- Event Description
- Property Name (required)
- Property Display Name
- Property Type (required)
- Property Description

**Sheet 4: #User Data**

Standard user property format, including:
- Property Name (required)
- Property Display Name
- Property Type (required)
- Property Description

**Sheet 5: #Common Event Properties**

Standard common property format, including:
- Property Name (required)
- Property Display Name
- Property Type (required)
- Property Description

#### 3.2 Implementation for Generating the Excel File

Use a Python script to generate the Excel file:

```python
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils.dataframe import dataframe_to_rows

def generate_excel_report(results, summary, standard_tracking):
    """Generate the feasibility assessment report in Excel format"""

    # Create the Excel writer
    with pd.ExcelWriter('TE_Model_Feasibility_Assessment.xlsx', engine='openpyxl') as writer:

        # Sheet 1: TE Model Feasibility Assessment
        df_evaluation = pd.DataFrame(results)
        df_evaluation.to_excel(writer, sheet_name='TE Model Feasibility Assessment', index=False)

        # Sheet 2: Summary Statistics
        wb = writer.book
        ws_summary = wb.create_sheet('Summary Statistics')
        # Write the summary statistics data...

        # Sheet 3: #Event Data
        df_events = pd.DataFrame(standard_tracking['events'])
        df_events.to_excel(writer, sheet_name='#Event Data', index=False)

        # Sheet 4: #User Data
        df_users = pd.DataFrame(standard_tracking['user_properties'])
        df_users.to_excel(writer, sheet_name='#User Data', index=False)

        # Sheet 5: #Common Event Properties
        df_common = pd.DataFrame(standard_tracking['common_properties'])
        df_common.to_excel(writer, sheet_name='#Common Event Properties', index=False)

    return 'TE_Model_Feasibility_Assessment.xlsx'
```

#### 3.3 Output Checklist

After generating the Excel report, check the following items one by one:

**Sheet completeness check**:
- [ ] Sheet 1: TE Model Feasibility Assessment (contains all decomposed requirements)
- [ ] Sheet 2: Summary Statistics (assessment result summary + missing field list)
- [ ] Sheet 3: #Event Data (complete standard format of all customer events)
- [ ] Sheet 4: #User Data (complete standard format of all customer user properties)
- [ ] Sheet 5: #Common Event Properties (complete standard format of all customer common properties)

**Data completeness check**:
- [ ] Does #Event Data include all events provided by the customer?
- [ ] Does #Event Data include all properties of each event?
- [ ] Does #User Data include all user properties provided by the customer?
- [ ] Does #Common Event Properties include all common properties provided by the customer?

---

## 📊 TE Analysis Model System Quick Reference

The following quick-reference table helps quickly identify the TE model a requirement should use, including each model's strong-signal keywords and typical questions.

### 1. Event Analysis (event) — default / most commonly used model

| Item | Content |
|:-----|:-----|
| **Core positioning** | Performs metric statistics and trend observation on a single behavior event; the most basic and core analysis model. When no clear signal points to another model, event analysis is used by default. |
| **Supported aggregation metrics** | Total count, triggering user count (DAU/MAU), per-user count, cumulative value (e.g., total revenue), maximum/minimum, distinct count, average per user, average, formula metrics |
| **Strong-signal keywords** | DAU, MAU, user count, count, amount, revenue, quantity, sum, total, statistics, query, calculation, trend, report, analysis board, payment rate (when appearing alone), first-day payment rate, active, new, registration, login, recharge, revenue, ARPU, ARPPU, per-user |
| **Typical questions** | DAU in the last 7 days / query revenue in the last 30 days / paying user count by channel / ARPU analysis / generate an analysis board of registrations, logins, and payment amount in the last 7 days |

---

### 2. Retention Analysis (retention) — second most commonly used model

| Item | Content |
|:-----|:-----|
| **Core positioning** | Analyzes the return behavior of users who completed an initial event within a subsequent time period. Quantifies user retention and churn and measures product health. Also the calculation carrier for LTV and ROI. |
| **Core concepts** | Initial event (the user's "starting point" behavior), return event (the user's "return" behavior), retention rate (proportion of initial users who return on day/week/month N) |
| **Strong-signal keywords** | retention, retention rate, LTV, lifetime value, ROI (N-day ROI / calculate ROI), churn, churn rate, churned users, churned user count, next-day retention, N-day retention, return, decay, day-2 retention, day-3 retention, day-7 retention |
| **⚠️ Core rule** | **LTV is always retention, churn is always retention, ROI defaults to retention (100% rule, no exceptions)** |
| **Typical questions** | Query this month's user retention / LTV in the last 7 days / 7-day ROI in the last 10 days / 7-day churned users / 30-day retention of paying users |

---

### 3. Funnel Analysis (funnel)

| Item | Content |
|:-----|:-----|
| **Core positioning** | Analyzes the conversion and churn at each step of a multi-step process and finds optimization directions. |
| **Core configuration** | Supports up to 30 steps, window period from 1 minute to 180 days, supports ordered/unordered funnels. |
| **Strong-signal keywords** | funnel, funnel analysis, conversion (multi-step context), first...then.../and then..., A→B→C, penetration rate, conversion rate (multi-step) |
| **⚠️ Key distinction** | "Payment rate" alone → event (single metric); "first-day payment rate" → event (single calculated metric); "penetration rate" → funnel (implies an A-to-B conversion process); "first A then B" + no other model keyword → funnel; "first A then B" + "retention" → retention (explicit model keyword takes priority) |
| **Typical questions** | Funnel conversion of login → card draw → payment / generate the registration → login → payment conversion by channel / first-day payment penetration rate of new users |

---

### 4. Interval Analysis (interval)

| Item | Content |
|:-----|:-----|
| **Core positioning** | Analyzes the time-interval distribution between two causally related events completed by users. Answers "how long it takes users to complete two things". |
| **Core metrics** | Median, average, percentiles (P75/P90), duration distribution |
| **Strong-signal keywords** | interval, interval analysis, interval time, interval distribution ("interval" is the strongest signal, nearly 100% hit) |
| **⚠️ Distinction from funnel** | Funnel focuses on "how many people converted"; interval analysis focuses on "how long the conversion took". |
| **Typical questions** | First-payment interval distribution / interval from upgrade to payment / login interval in the last month |

---

### 5. Distribution Analysis (distribution)

| Item | Content |
|:-----|:-----|
| **Core positioning** | Divides metric values into intervals and obtains the user count and proportion within each interval. Analyzes the depth of user engagement and stickiness for a specific feature. |
| **Distribution dimensions** | Distribution by count, distribution by days, distribution by numeric property |
| **Strong-signal keywords** | distribution, distribution situation, distribution analysis, user distribution ("distribution" is almost a decisive signal) |
| **⚠️ Distinction from event analysis** | "Payment amount trend" → event (time-series aggregation); "payment amount distribution" → distribution (user-level distribution); "daily XX distribution" → distribution ("distribution" has priority over "daily") |
| **Typical questions** | User login count distribution / payment amount distribution / active days distribution / payment count distribution trend |

---

### 6. Path Analysis (path)

| Item | Content |
|:-----|:-----|
| **Core positioning** | Explores user behavior traces and generates a Sankey diagram to intuitively show behavior inflow and outflow. Suitable for discovering "unexpected behavior patterns". |
| **Analysis directions** | Forward path (what happened after a certain event), backward path (what happened before a certain event), full path |
| **Strong-signal keywords** | path, path analysis, behavior trace, Sankey diagram, inflow/outflow, user path, what did they do |
| **Typical questions** | What users do after entering the game / behavior of churned users before leaving / behavior path before payment |

---

### 7. Composition Analysis (composition)

| Item | Content |
|:-----|:-----|
| **Core positioning** | Performs profile analysis based on user properties (rather than behavior events), supports two-dimensional cross analysis and crowd comparison. Answers "who the users are / what users look like". |
| **Strong-signal keywords** | composition analysis, user profile, property distribution (when the analysis object is static user properties rather than behavior metrics) |
| **⚠️ Distinction from distribution analysis** | **Composition analysis**: analyzes the distribution of static user properties (level, region, device type); **distribution analysis**: analyzes the distribution of behavior metrics (payment count, login count, payment amount) among users. |
| **Typical questions** | User region distribution / age group and device brand distribution of paying users / profile differences between VIP users and regular users |

---

### 8. Attribution Analysis (attribution)

| Item | Content |
|:-----|:-----|
| **Core positioning** | Evaluates the contribution of multiple touchpoints/channels to a conversion goal. Supports attribution models such as last-touch, first-touch, linear, position decay, and time decay. |
| **Strong-signal keywords** | attribution, attribution analysis, touchpoint contribution, channel contribution, contribution degree, which touchpoint, which ad slot contributes the most |
| **⚠️ Distinction from funnel analysis** | Funnel looks at the conversion rate of a fixed process; attribution analysis looks at the contribution of each touchpoint across multiple paths. |
| **Typical questions** | Which ad slot contributes the most to payment conversion / promotion channel contribution assessment / impact of multiple pop-ups on conversion |

---

### 9. Rank (rank)

| Item | Content |
|:-----|:-----|
| **Core positioning** | Ranks dimensions by metric value, displays a Top N leaderboard, and can track rank changes. |
| **Strong-signal keywords** | TOP, Top N, ranking, leaderboard, which is the highest (+ analysis dimension) |
| **⚠️ Key distinction** | "Which game has the highest recharge" → rank (the ranking object is the game, which can be a grouping dimension); "the user with the highest recharge" → other (finding a specific user requires user clustering or SQL) |
| **Typical questions** | Top 5 games by payment in the last 7 days / top 10 channels by revenue / top 20 servers by activity |

---

### 10. Heatmap (heatmap)

| Item | Content |
|:-----|:-----|
| **Core positioning** | Flexibly displays the heat distribution of users in each area on a game map or application interface; a gaming-industry-specific requirement. |
| **Strong-signal keywords** | heatmap, heat map, hot spot area, coordinate distribution, location distribution, map heat |
| **Typical questions** | Hot spot areas where players gather/fight/die in a game map / player distribution density across different map areas |

---

### 11. SQL Query (sql) — the universal fallback

| Item | Content |
|:-----|:-----|
| **Core positioning** | Directly queries underlying data via SQL; the "universal fallback" of the analysis system, satisfying custom requirements that the above models cannot cover. |
| **Applicable scenarios** | Cross-model complex calculations, special statistical bases, temporary data exploration and verification, analyses requiring JOIN of multiple tables, user filtering/export/list requirements, prediction-type requirements |
| **⚠️ Syntax requirements** | Must be based on Trino syntax; field names containing special symbols (such as $ or #) must use double quotes `""`, string values must use single quotes `''` |
| **Typical questions** | Query users with balance greater than 1000 / cross-model complex calculations / metrics requiring special statistical bases |

---

## 🔍 Field Matching Rules in Detail

### Event Matching Rules

**Exact match**:
- The event name in the customer's tracking plan is exactly the same as the event name required by the requirement
- Example: the requirement needs the "payment completed" event, and the plan has purchase_complete (payment completed) → match succeeds

**Semantic match**:
- Infer the event to use based on requirement semantics
- Example: the requirement "view active users", and the plan has app_start_up (game launch) → can serve as an active indicator

**Missing event identification**:
- Events required by the requirement do not exist in the customer's plan at all
- Example: the requirement "view coin consumption distribution", and the plan has no spend_gold_coins event → missing

---

### Property Matching Rules

**Event property match**:
- Check whether a specific event contains the property required by the requirement
- Example: the requirement "total payment amount", check whether the purchase_complete event has a pay_amount property

**User property match**:
- Check whether the user property table contains the user property required by the requirement
- Example: the requirement "group by VIP level", check whether the user property table has vip_level

**Common event property match**:
- Check whether the common event property table contains the common property required by the requirement
- Common properties can be used for filtering and grouping of all events
- Example: the requirement "group by channel", check whether the common property table or user property table has #channel

---

### Type Compatibility Check

Check whether the property type supports the calculation method required by the requirement:

**Numeric properties**:
- Supported: sum, average, average per user, median, maximum, minimum, variance, standard deviation, percentile
- Not supported: distinct count (can be used but semantically incorrect)

**Text properties**:
- Supported: distinct count, equals/not equals/contains filtering, grouping
- Not supported: sum, average, and other numeric calculations

**Boolean properties**:
- Supported: true count, false count, empty count, non-empty count, distinct count
- Not supported: sum, average, etc.

**Time properties**:
- Supported: distinct count, range/relative time filtering
- Not supported: sum, etc.

**Examples**:
- Requirement "total payment amount" → purchase_complete's pay_amount must be numeric
- Requirement "distinct paying users" → the purchase_complete event itself suffices, no pay_amount needed
- Requirement "group by channel" → #channel can be a text property or a user property

---

## ⚠️ TE Model Capability Boundary Determination

### Capability Boundaries of Each Model

**Event Analysis (event)**:
- ❌ Cannot support: complex window functions (such as returning-user determination), custom time-interval statistics across events
- ✅ Can support: aggregation statistics of a single event or formula combination, trend analysis, group comparison

**Retention Analysis (retention)**:
- ❌ Cannot support: hour-granularity retention, retention with custom non-standard periods
- ⚠️ Property constraint: when grouping, only event properties of the initial event can be used, not properties of the return event
- ✅ Can support: N-day/week/month retention, LTV, ROI, churn analysis

**Funnel Analysis (funnel)**:
- ❌ Cannot support: funnels with more than 30 steps, window periods longer than 180 days
- ⚠️ Property constraint: when grouping, only event properties of step 1 can be used
- ✅ Can support: up to 30 steps, ordered/unordered funnels, related property matching

**Interval Analysis (interval)**:
- ❌ Cannot support: interval upper limit exceeding 180 days
- ⚠️ Property constraint: when grouping, only event properties of the start event can be used
- ⚠️ Calculation logic: different events use the shortest interval, the same events use adjacent intervals
- ✅ Can support: time-interval distribution between two events

**Distribution Analysis (distribution)**:
- ❌ Cannot support: sum/average on text properties
- ⚠️ Data constraint: the data type of the aggregation property must match the calculation basis
- ✅ Can support: user distribution by count/days/numeric property

**Path Analysis (path)**:
- ❌ Cannot support: event-level filtering (selected participating events cannot have any filter conditions attached)
- ⚠️ Constraint: global filtering can only use user properties/user tags/user clusters, not event properties
- ✅ Can support: forward/backward path exploration, Sankey diagram, session segmentation

**Composition Analysis (composition)**:
- ❌ Absolutely prohibited: using any event or event property! Only user table data can be analyzed
- ⚠️ Constraint: user tags are forcibly calculated using the latest version, with no timezone concept
- ✅ Can support: user property distribution, two-dimensional cross analysis, crowd comparison

**Attribution Analysis (attribution)**:
- ❌ Constraint: the aggregation of the target event can only be "total count" or the "sum" of a numeric property
- ⚠️ Constraint: when grouping, the grouping objects of the target event and the attribution event are isolated
- ✅ Can support: multiple attribution models (first/last/linear/position decay/time decay)

**Rank (rank)**:
- ❌ Constraint: the event used as the ranking metric must contain the property field corresponding to the leaderboard subject
- ⚠️ Constraint: the three sort logics for handling ties must be accurately selected
- ✅ Can support: ranking by dimension, rank change tracking, additional metrics

**Heatmap (heatmap)**:
- ❌ Rigid dependency: the heat event must have numeric properties for X-axis and Y-axis coordinates
- ⚠️ Constraint: first/last filtering is a dimensionality reduction against "each user"
- ✅ Can support: coordinate distribution of spatial interaction events, multi-group comparison

**SQL Query (sql)**:
- ✅ Can support: all complex requirements that standard models cannot cover
- ⚠️ Note: must be based on Trino syntax; field names containing special symbols need double quotes

---

### Strict Red Lines of Each Model (pre-configuration constraints)

The following are strict red lines that must be followed when configuring each model; violations will lead to configuration failure or data errors:

**🔴 Event Analysis red lines**:
- The levels of filter conditions must be correctly distinguished: global filter (applies to all metrics) vs metric-level filter (applies only to the current metric) vs event-level filter (applies only to a certain event in the formula)
- Only events in formula metrics can use event-level filters

**🔴 Retention Analysis red lines**:
- Initial event and return event: must be mapped to real events (Event)
- **Grouping property constraint**: if grouping by event property, only event properties of the "initial event" (or common event properties / user properties) can and must be used. **Absolutely never use return-event properties for outer grouping!**

**🔴 Funnel Analysis red lines**:
- Multi-step event mapping: every step of the funnel must be mapped to a real event (Event)
- Vertical funnel of a single event: if the business requirement is "step-by-step conversion of the same behavior" (e.g., level 1 → level 2 → level 3), use the same event and apply independent event-property filters within each step
- **Grouping property constraint**: only event properties of "step 1" (or common event properties / user properties) can be used for grouping

**🔴 Interval Analysis red lines**:
- Underlying calculation mechanism: different events (A→B) use the shortest-interval principle; the same event (A→A) uses the adjacent-interval principle
- **Grouping property constraint**: if the grouping item selects an event property, only event properties of the "start event" can and must be used. **Absolutely never use end-event properties for global breakdown!**

**🔴 Distribution Analysis red lines**:
- **Data type constraint of the aggregation property**: if aggregating by event property, text properties only support "distinct count"; numeric properties support "sum/average/median/extreme values/percentiles/variance, etc." **Absolutely never apply sum or average to text properties!**
- Multi-level filtering: event-level filter (attached to a specific event) vs metric-level filter (attached outside the entire metric or formula) must be strictly distinguished

**🔴 Path Analysis red lines**:
- **Event-level filtering is absolutely prohibited**: selected participating events cannot have any filter conditions attached (e.g., you cannot look only at payment with pay_amount>0; you can only pull in the entire payment)
- **Dimensionality reduction of filter dimensions**: this model's global filter is called "user filter" and only accepts fields from the user table (user properties/clusters/tags). **Absolutely never use any event property (including common event properties) for filtering!**

**🔴 Composition Analysis red lines**:
- **Absolute forbidden zone**: **strictly forbidden to use any "event" or "event property/common event property"**! This model can only query data in the user dictionary (user properties, user tags, user clusters)
- Timezone and version independence: user properties have no timezone concept; user tags are forcibly calculated using the system's latest version
- Strong dependence on aggregation type: when analyzed as a metric, the calculation formula is strictly limited by the data type of the user property

**🔴 Attribution Analysis red lines**:
- **Aggregation restriction of the target event**: the conversion value can only be one of two bases: the "total count" of the event, or the "sum" of a numeric property of that event. **Absolutely never use distinct count, average, or similar logic!**
- Isolation mechanism of grouping objects: the grouping of the target event (breaking down the overall conversion total) vs the grouping of the attribution event (breaking down touchpoints) are isolated from each other

**🔴 Rank red lines**:
- **Iron law of data association**: events used as the "ranking metric" and "additional metric" must contain the property field corresponding to the selected "leaderboard subject"! Otherwise data aggregation cannot be performed
- SQL mapping of rank handling: must accurately map the three underlying sort logics (rank, dense_rank, row_number) according to the business's tolerance for "ties"

**🔴 Heatmap red lines**:
- **Rigid dependency on coordinate properties**: the selected heat event (or the users associated with that event) must have numeric properties representing the X-axis and Y-axis coordinates, **otherwise the map absolutely cannot be generated!**
- "Single user" principle of extreme-value/first-last filtering: first/last filtering is a dimensionality reduction against "each #user_id", ensuring each player contributes only 1 record within the selected window period

---

## 🔄 Multi-model Combination Suggestions

In practice, complex analysis scenarios often require combining multiple models. The following are common combined analysis plans:

### Example — analyzing "next-day retention rate decline"

| Step | Model used | Purpose |
|:-----|:---------|:-----|
| 1 | **Retention Analysis** | First confirm the magnitude and time point of the next-day retention rate decline |
| 2 | **Event Analysis** | Compare differences in key behavior metrics between retained and churned users |
| 3 | **Funnel Analysis** | Check whether the new-user tutorial conversion rate has declined |
| 4 | **Path Analysis** | Explore the behavior path of churned users before leaving |
| 5 | **Distribution Analysis** | View the online duration / usage count distribution of churned users |

### Example — analyzing "payment conversion optimization"

| Step | Model used | Purpose |
|:-----|:---------|:-----|
| 1 | **Funnel Analysis** | Find the step with the largest loss in the payment process |
| 2 | **Interval Analysis** | Understand the decision duration from browsing to payment |
| 3 | **Path Analysis** | Discover the typical behavior path of paying users |
| 4 | **Attribution Analysis** | Evaluate the contribution of different touchpoints to payment |

### Example — analyzing "user churn warning"

| Step | Model used | Purpose |
|:-----|:---------|:-----|
| 1 | **Retention Analysis** | Confirm the churn rate trend |
| 2 | **Composition Analysis** | Compare the profile differences between churned and retained users |
| 3 | **Distribution Analysis** | View the behavior frequency distribution of churned users |
| 4 | **Path Analysis** | Analyze the behavior characteristics of churned users before leaving |
| 5 | **SQL Query** | Export the churned user list for subsequent operations |

---

## 🛠️ Practical Examples

### Example Input

**Customer tracking plan** (non-standard format):

Event table:
- app_start_up: start_time
- purchase_complete: gift_id, product_id
- enter_level: level_id

User properties:
- total_payment_amount
- vip_level
- diamond

**Analysis requirement list**:
1. View daily new users
2. View daily active user count
3. View total payment amount

---

### Example Output

Generate the Excel file `TE_Model_Feasibility_Assessment_20240115.xlsx`, containing 5 sheets:

**Sheet 1: TE Model Feasibility Assessment**

| No. | Requirement category | Specific analysis requirement | Recommended TE model | Implementable | ✅ Events/properties already in xlsx | ❌ Completely missing events/properties | Reason for No/Partial | Alternative solution/suggestion |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| 1 | New users | View daily new users | Event Analysis (event) | No | No directly matching event | None | No register event in xlsx | Add a register event |
| 2 | Active users | View daily active user count | Event Analysis (event) | Yes | app_start_up (game launch) | None | None | Event app_start_up, metric triggering user count, granularity day |
| 3 | Payment analysis | View total payment amount | Event Analysis (event) | No | purchase_complete (payment completed) | ❌ purchase_complete event lacks the pay_amount property | Only gift_id and product_id, no amount field | Must add a pay_amount (number) property to purchase_complete |

**Sheet 2: Summary Statistics**

I. Assessment result summary

| Assessment result | Requirement count | Proportion |
|:---------|:---------|:-----|
| Can be implemented (events/properties in xlsx fully cover) | 1 | 33.3% |
| Partially implementable (alternative solutions or prerequisite operations available) | 1 | 33.3% |
| Cannot be implemented (missing key events/properties or model limitations) | 1 | 33.3% |
| Total | 3 | - |

II. Events/properties completely missing from the xlsx tracking plan

| Missing item | Type | Where to add | Affected requirement numbers |
|:-------|:-----|:----------|:--------------|
| pay_amount (payment amount) | Event property (number) | purchase_complete event | #3 (1 total) |

**Sheet 3: #Event Data**

| Event Name (required) | Event Display Name | Event Description | Property Name (required) | Property Display Name | Property Type (required) | Property Description |
|:-------------|:----------|:---------|:--------------|:----------|:---------------|:---------|
| app_start_up | Game Launch | - | start_time | Start Time | Datetime | - |
| purchase_complete | Payment Completed | - | gift_id | Product ID | Text | - |
| purchase_complete | Payment Completed | - | product_id | Product ID | Text | - |
| enter_level | Enter Level | - | level_id | Level ID | Text | - |

**Sheet 4: #User Data**

| Property Name (required) | Property Display Name | Property Type (required) | Property Description |
|:-------------|:----------|:---------------|:---------|
| total_payment_amount | Total Payment Amount | Number | - |
| vip_level | VIP Level | Text | - |
| diamond | Held Diamonds | Number | - |

**Sheet 5: #Common Event Properties**

| Property Name (required) | Property Display Name | Property Type (required) | Property Description |
|:-------------|:----------|:---------------|:---------|
| - | - | - | - |

---

## ⚠️ Notes

### Excel Output Requirements

1. **File naming**: `TE_Model_Feasibility_Assessment_YYYYMMDD.xlsx` (e.g., `TE_Model_Feasibility_Assessment_20240115.xlsx`)
2. **Save location**: user's desktop (~/Desktop/)
3. **Format requirements**:
   - Bold headers
   - Auto-fit column widths
   - Highlight key columns
   - Auto-wrap multi-line text

### Field Translation Requirements

1. **Accuracy**: prioritize industry-standard terms
2. **Consistency**: the same field uses the same translation in different places
3. **Readability**: translated names should be concise and clear
4. **Keep original**: keep the English field name in parentheses

### Standard Tracking Format Requirements

1. **Event Name**: required, use an English identifier
2. **Event Display Name**: used for display
3. **Property Type**: required, options: Text/Number/Boolean/Datetime/List/Object/Object Group
4. **One property per row**: when an event has multiple properties, each property occupies one row; the event name does not need to be repeated
5. **⚠️ Completeness requirement**: must output all tracking data provided by the customer without omitting any event, property, user property, or common property. Events/properties without properties also need to be output, without filling

---

## 📚 References

This skill references the following resources:
- TE official documentation: analysis model capability boundaries
- te-model-selector.skill.md: model determination decision tree, configuration methods for each model
- TE preset events and properties list
- Practical feasibility assessment case library (Excel templates)
- **Field translation reference table**: `references/te-field-translations.md`

---

## 🔄 Collaboration with te-model-selector

- **te-feasibility-analyzer**: planning phase, assesses whether the tracking plan is sufficient, outputs an Excel report
- **te-model-selector**: implementation phase, generates detailed configuration for "can be implemented" requirements

Suggested workflow:
1. Use `/te-feasibility-analyzer` to assess feasibility and generate an Excel report
2. Supplement tracking based on the report
3. Use `/te-model-selector` to generate specific configuration
