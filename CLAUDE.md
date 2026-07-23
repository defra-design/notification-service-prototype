# Claude AI Rules for Import Notification Service Prototype

## Project Context

This is a **GOV.UK Prototype Kit** application ("Import notification service") for exploring how someone submits a notification to import live animals/animal commodities into the UK — commodity and species selection, country of origin, animal identification, consignor/consignee/destination addresses, transport and arrival details, accompanying documents, and a final declaration and submission.

**User groups:**
- People submitting import notifications on behalf of a business
- Reviewers checking notification status via the dashboard

**Developer:** Interaction Designer in a UK government digital delivery team with coding experience, seeking help with complex coding concepts and creating interactive, data-driven prototypes.

**Design knowledge base:** `.claude/knowledge/` holds design patterns, decisions (with rationale), and research findings for this service. Check it before answering design questions or proposing a new pattern — prefer an existing decision/pattern over inventing a new one, and flag if a request seems to contradict something recorded there.

---

## Core Technologies

- **Framework:** GOV.UK Prototype Kit v13.19.1
- **Templating:** Nunjucks, written in `.html` files (not `.njk` — only shared `includes/` partials use `.njk`)
- **Backend:** Node.js with Express.js
- **Frontend:** GOV.UK Frontend v6.1.0 (rebrand enabled in `app/config.json`)
- **Styling:** Sass/SCSS
- **Data:** JS/JSON modules with session management
- **Typeahead:** `accessible-autocomplete` (loaded via CDN `<script>` in `pageScripts` blocks, enhancing a `govuk-select`)

---

## GOV.UK Design Principles

When building pages, always follow these principles from the GDS Design System and Service Standard:

1. **One thing per page** — Ask one question per page. This reduces cognitive load and makes error handling simpler. It's the single most important pattern in GOV.UK services.

2. **Use the question as the page heading** — The `<h1>` should be the question itself. Stock GOV.UK guidance sets this via `isPageHeading: true` on the label/legend, but **this codebase instead renders the `<h1>` via the `pageHeader()` macro** with the form nested inside it — see Coding Conventions → "Question page heading rules" below for the actual pattern to follow here.

3. **Progressive disclosure** — Only ask for information you need. Use the Details component to hide supplementary content. Don't front-load users with information.

4. **Consistent component usage** — Always use GOV.UK Nunjucks macros rather than writing raw HTML. The macros handle accessibility, error states, and responsive behaviour correctly. **Macros are globally available in Prototype Kit v13+ — you do NOT need `{% from %}` import statements.**

5. **Accessible by default** — GOV.UK Frontend components meet WCAG 2.2 AA. Don't override component styles or structure unless you have a strong reason. Always include hint text where it helps, always use fieldsets to group related inputs, always provide visible labels.

6. **Use the GOV.UK grid** — Layout uses `govuk-grid-row` and `govuk-grid-column-*` classes. Main content is typically `two-thirds` width. Never use custom CSS grid or flexbox when the GOV.UK grid classes work.

---

## Architecture Principles

### 1. Journey Architecture
- There is one active journey: **`v1-baseline`**. `v1-experimental` used to be a separate flow but has been merged in — its `routes.js` is now just a 302 redirect shim from `/v1-experimental/*` to `/v1-baseline/*`. Don't add new pages under `v1-experimental`.
- Each journey has its own route module (`app/views/{journey}/routes.js`), registered from the top-level `app/routes.js`
- Shared logic lives in `app/lib/`; reference/lookup data lives in `app/data/`
- `res.locals.basePath` is set per-request from the URL prefix (`/v1-baseline`) — templates and route builders use `basePath` (or default to `/v1-baseline`) rather than hardcoding the journey prefix, so links keep working if a journey is renamed

### 2. Reusable Components
- Shared partials live in `app/views/includes/*.njk` (e.g. `page-header.njk`, `save-continue-and-task-list.njk`, `quick-fill-internal-link.njk`)
- Nearly every page wraps its content in the `pageHeader(title, caption, width)` macro/caller from `includes/page-header.njk` — this renders the `<h1>` and grid column, so page templates don't repeat that markup (see Coding Conventions below)
- Build reusable logic functions in `app/lib/`

### 3. Data-Driven Design
- Reference/lookup data (commodities, species, countries, ports, etc.) lives as JS modules in `app/data/` (e.g. `commodities-eu.js`, `species-translations.js`, `eu-countries.js`)
- Mock dashboard rows live in `app/data/notifications.js`; a fully-populated example notification lives in `app/data/notification-full-view-mock.js`
- In-progress notification data lives in `req.session.data` (commodities array, addresses, transport, etc.) and is only converted to a "submitted" notification row on final submission
- Store temporary UI state flags in session (e.g. `taskListErrorList`, `deletedNotificationSnapshot`) and delete them immediately after the page that consumes them has read them
- **Notification reference numbers:** GBN-type notifications (`GBN AG`, `GBN PP`, `GBN NNS`, `GBN IUU`) use the agreed `GBN-{CODE}-{YY}-{6-char Crockford base32}` format (e.g. `GBN-AG-26-7K8M2P`) — generate/format these via `app/lib/notification-reference.js`, never hand-format the string. See `.claude/knowledge/decisions/gbn-reference-format-2026-07-23.md` before touching any reference-number field. CHED A/CHED P/CHED-D/CHED PP references are a different, real TRACES-sourced format (not this scheme) and legacy `v1-baseline` still deliberately uses `IMP.GB.{year}.{7-digit number}` — see `.claude/knowledge/reference/notification-reference-number-formats.md` for the full picture before assuming any journey's reference format.

---

## File Organization

```
app/
├── config.json                    # Prototype Kit config (service name, rebrand flag)
├── routes.js                      # Top-level routing: index, sign-in, clear-data, mounts journey routes
├── filters.js                     # Custom Nunjucks filters
├── views/
│   ├── index.html, sign-in.html   # Entry pages (outside any journey)
│   ├── layouts/                   # main.html, v1-baseline.html/-forms.html, v1-experimental.html/-forms.html
│   ├── includes/                  # Shared .njk partials (page header, error-aware form chrome, quick-fill links)
│   ├── v1-baseline/
│   │   ├── routes.js              # Dashboard + commodity/origin/task-list routes
│   │   ├── post-hub-routes.js     # Animal identification → confirmation routes
│   │   ├── dashboard.html, start.html
│   │   └── create/                # One .html template per journey step
│   └── v1-experimental/
│       └── routes.js              # Redirect shim only — no templates
├── lib/                           # Shared route/view logic (dashboard.js, create-helpers.js, notification-view-helpers.js, etc.)
├── data/                          # Reference data & mock notifications (JS modules)
└── assets/sass/                   # SCSS, imported into application.scss
```

Key points about this Prototype Kit setup:
- The kit is an npm package — core files and default GOV.UK macros live in `node_modules`, not the project
- This project defines most routes explicitly in `routes.js` files (including simple GETs) rather than relying purely on Prototype Kit's automatic view-to-route serving — follow that pattern for new pages so branching/session logic has somewhere to live
- Run with `npm run dev`

---

## Coding Conventions

### Nunjucks Templates

**Non-form page structure** (extends the plain journey layout, e.g. `start.html`, `dashboard.html`):
```nunjucks
{% extends "layouts/v1-baseline.html" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "includes/page-header.njk" import pageHeader %}

{% set title = "Page title" %}

{% block content %}
{% call pageHeader(title, null, "two-thirds") %}
  <!-- content here -->
{% endcall %}
{% endblock %}
```

**Form page structure** (extends the `-forms` layout, which auto-renders the error summary — see Error Handling below):
```nunjucks
{% extends "layouts/v1-baseline-forms.html" %}
{% set title = "Question or page title" %}
{% set backLinkHref = backHref %}

{% block formContent %}
{% from "includes/page-header.njk" import pageHeader %}
{% call pageHeader(title, null, "two-thirds") %}
    <form method="post" novalidate>
      {{ govukInput({ ... }) }}

      {% include "includes/save-continue-and-task-list.njk" %}

      {% set quickFillHref = (basePath or '/v1-baseline') + '/create/some-page-prefill' %}
      {% include "includes/quick-fill-internal-link.njk" %}
    </form>
{% endcall %}
{% endblock %}
```
`layouts/v1-baseline-forms.html` extends `layouts/v1-baseline.html`, so form pages get the header/nav for free. It also already imports `govukInput`, `govukSelect`, `govukRadios`, `govukCheckboxes`, `govukButton`, `govukBackLink`, `govukDetails`, `govukInsetText` and `govukErrorSummary` — no need to re-import those in a form page.

**GOV.UK Components:**
- Always use GOV.UK macros (e.g., `govukButton`, `govukTable`, `govukSummaryList`) for standard form controls
- Macros are globally available in Prototype Kit v13+, but this codebase still imports the ones it uses at the top of most templates — follow that convention (explicit `{% from %}` imports) for consistency rather than relying on global availability
- Use utility classes (e.g., `govuk-!-margin-bottom-6`) for spacing/styling overrides
- Avoid inline styles; prefer utility classes or SCSS
- For a typeahead/autocomplete field there is no GOV.UK macro — the codebase hand-writes the `govuk-form-group`/`govuk-select` markup (see `create/commodity.html` or `create/origin.html`) and progressively enhances it with `accessible-autocomplete` in a `pageScripts` block. Copy that pattern rather than inventing a new one.

**Question page heading rules — this codebase's convention differs from stock GOV.UK guidance:**
Instead of `isPageHeading: true` on the input/fieldset, almost every page renders its `<h1>` via the `pageHeader()` macro and puts the form *inside* the `{% call %}` block:
```nunjucks
{% from "includes/page-header.njk" import pageHeader %}
{% call pageHeader(title, null, "two-thirds") %}
  <form method="post" novalidate>
    {{ govukRadios({
      fieldset: {
        legend: { text: "Does the consignment require a region of origin code?", classes: "govuk-fieldset__legend--s" }
      },
      name: "regionOfOriginRequired",
      value: data.regionOfOriginRequired,
      errorMessage: data.errors and data.errors["regionOfOriginRequired"]
    }) }}
  </form>
{% endcall %}
```
Follow this pattern (`pageHeader()` + `govuk-fieldset__legend--s`/no `isPageHeading`) for new question pages rather than the stock `isPageHeading: true` approach, so heading styling stays consistent across the journey.

**Data References:**
- Use the `data` object for form inputs and session data: `req.session.data` is exposed to templates as `data`
- Use `or` for fallbacks: `{{ data.consignmentReference or 'Not provided' }}`
- Loop over arrays with `{% for item in items %}`
- Use filters sparingly; prefer route-side processing (see `app/filters.js` for the custom filters that do exist)

**Input naming:** Session/data keys in this codebase are `camelCase` (e.g. `countryOfOrigin`, `consignmentReference`, `commoditySpecies`), not `lowercase-with-hyphens`. Match existing keys — mixing conventions will silently break `data.xxx` lookups elsewhere in the journey.

### Express Routes

**Separation of concerns:** Routes handle data, logic, and redirects. Templates handle all HTML and presentation. Never build HTML strings in route files — pass data objects to templates and use Nunjucks (`{% set %}`, `{% if %}`, `{% for %}`, macros) to render them. This keeps markup easy to find and update.

**Session Management:**
- Store form data in `req.session.data`
- Use temporary flags for one-time displays (clear after showing)
- Pattern: Check flag → Display → Clear flag

**Route Pattern:**
```javascript
router.get(`${BASE}/create/origin`, (req, res) => {
  const euCountries = require('../../data/eu-countries.js')
  res.render('v1-baseline/create/origin', {
    euCountries,
    backHref: /* ... */
  })
})
```
Data passed to `res.render` is merged in alongside `data` (the session object) — templates read form values from `data.xxx` and anything else (like `euCountries` above) directly by name.

**POST Handlers and Branching:**
```javascript
router.post(`${BASE}/create/origin`, (req, res) => {
  const countryOfOrigin = req.session.data.countryOfOrigin
  const errors = {}
  const errorList = []
  if (!countryOfOrigin || countryOfOrigin.trim() === '') {
    errors.countryOfOrigin = 'Select a country'
    errorList.push({ href: '#countryOfOrigin', text: 'Select a country' })
  }
  if (Object.keys(errors).length > 0) {
    req.session.data.errors = errors
    req.session.data.errorList = errorList
    return res.redirect(`${BASE}/create/origin`)
  }
  delete req.session.data.errors
  delete req.session.data.errorList
  res.redirect(`${BASE}/create/commodity`)
})
```

- Validate required fields; on failure set `req.session.data.errors` (a `{ fieldName: 'message' }` map) and `req.session.data.errorList` (a `[{ href, text }]` array for `govukErrorSummary`), then redirect back to the same GET route
- On success, always `delete req.session.data.errors` / `errorList` before redirecting onward — the `-forms` layout checks `data.errors` on every page, so a stale value will show a phantom error banner on the next page
- Don't render directly from POST (always redirect)
- Many pages also have a `*-prefill` GET route (e.g. `/create/origin-prefill`) that fills in plausible session data and redirects onward, wired to the "Quick fill and continue (internal use)" link — add one of these for any new question page (see `includes/quick-fill-internal-link.njk`)

### Data Structure

Reference data in `app/data/*.js` is exported as plain JS objects/arrays keyed for lookup, e.g. `commodities-eu.js`:
```javascript
module.exports = {
  Cow: { code: '0102', commonName: 'Cow', species: ['Bos taurus'], commodityTypes: ['Domestic'] },
  // ...
}
```
Dashboard rows in `app/data/notifications.js` are a flat array:
```javascript
module.exports = [
  {
    reference: 'IMP.GB.2026.1000608',
    commodity: 'Bos taurus (0102)',
    origin: 'France',
    consignee: 'Macdonald Osborne Inc',
    consignor: 'Wagner and Matthews',
    arrival: '8 March 2026',
    status: 'draft'   // 'draft' | 'submitted'
  }
]
```

**Key points:**
- In-progress notifications live only in `req.session.data` (as a `commodities` array plus flat address/transport/document fields) until submission — they are not in `notifications.js` until then
- `app/lib/notification-view-helpers.js` and `app/lib/dashboard.js` know how to find/merge a notification from either session data or the static `notifications.js` array — use those helpers rather than re-implementing lookup logic
- Always check field existence before accessing nested data (e.g. `data.placeOfDestinationAddress` may be a string or an array depending on the flow — see `strOk`/array checks in `post-hub-routes.js`)

### SCSS/Styling

- There is a single stylesheet, `app/assets/sass/application.scss` — there's no per-journey SCSS split or `.v1 { }` wrapper convention; add new rules directly, scoped with a specific class name (e.g. `.animal-id-block`, `.document-row`)
- Favour a plain BEM-ish class name for new components (`.thing`, `.thing__part`, `.thing--modifier`) matching the existing style in this file, rather than nesting deeply or reaching for `!important`
- Use GOV.UK Sass helpers already in use here: `govuk-spacing(n)`, `$govuk-border-colour`, `$govuk-error-colour`, `$govuk-secondary-text-colour`, `@include govuk-typography-common`

**GOV.UK Style Classes:**
- **Grid**: `govuk-grid-row`, `govuk-grid-column-two-thirds`, `govuk-grid-column-one-third`, etc.
- **Typography**: `govuk-heading-xl/l/m/s`, `govuk-body`, `govuk-body-l/s`
- **Spacing**: `govuk-!-margin-bottom-6`, `govuk-!-padding-top-4` (scale: 0-9)
- **Lists**: `govuk-list`, `govuk-list--bullet`, `govuk-list--number`
- **Input widths**: `govuk-input--width-20/10/5/4/3/2` for fixed character widths

---

## Error Handling Pattern

The error summary is **not** something each page renders itself — `layouts/v1-baseline-forms.html` already does it:
```nunjucks
{% block content %}
{% if data.errors %}
{{ govukErrorSummary({
  titleText: "There is a problem",
  errorList: data.errorList
}) }}
{% endif %}
{% block formContent %}{% endblock %}
{% endblock %}
```
So a form page just needs to (1) `{% extends "layouts/v1-baseline-forms.html" %}` and (2) reference `data.errors["fieldName"]` for the field-level message and CSS state. There is no per-page `{% if errorSummary %}` block to add.

**Field-level pattern**, matching `create/origin.html` / `create/commodity.html` — either via the macro's `errorMessage` param:
```nunjucks
{{ govukInput({
  label: { text: "Your internal reference number for this consignment (optional)" },
  id: "consignmentReference",
  name: "consignmentReference",
  value: data.consignmentReference or "",
  errorMessage: data.errors and data.errors["consignmentReference"]
}) }}
```
...or, for hand-written markup (typeaheads), manually:
```nunjucks
<div class="govuk-form-group {% if data.errors and data.errors['countryOfOrigin'] %}govuk-form-group--error{% endif %}">
  <label class="govuk-label" for="countryOfOrigin">Country of origin</label>
  {% if data.errors and data.errors["countryOfOrigin"] %}
    <p id="countryOfOrigin-error" class="govuk-error-message">
      <span class="govuk-visually-hidden">Error:</span> {{ data.errors["countryOfOrigin"] }}
    </p>
  {% endif %}
  <select class="govuk-select" id="countryOfOrigin" name="countryOfOrigin"
    aria-describedby="countryOfOrigin-hint{% if data.errors and data.errors['countryOfOrigin'] %} countryOfOrigin-error{% endif %}"
    {% if data.errors and data.errors["countryOfOrigin"] %}aria-invalid="true"{% endif %}>
    ...
  </select>
</div>
```
`data.errors["fieldName"]` is a **plain string** (the message itself), set on the route side as `errors.fieldName = 'Select a country'` — not a `{ text: ... }` object. Match that shape for new fields.

---

## GOV.UK Component Quick Reference

| Component | Macro | Common use |
|-----------|-------|------------|
| Button | `govukButton` | Form submission, CTAs |
| Text input | `govukInput` | Single-line text |
| Textarea | `govukTextarea` | Multi-line text |
| Radios | `govukRadios` | Single selection |
| Checkboxes | `govukCheckboxes` | Multiple selection |
| Select | `govukSelect` | Dropdown (use sparingly — radios preferred) |
| Date input | `govukDateInput` | Day/month/year entry (never a date picker) |
| File upload | `govukFileUpload` | File uploads |
| Character count | `govukCharacterCount` | Text with length limits |
| Summary list | `govukSummaryList` | Check your answers |
| Table | `govukTable` | Tabular data |
| Tabs | `govukTabs` | Organise content |
| Accordion | `govukAccordion` | Collapsible sections |
| Details | `govukDetails` | Progressive disclosure |
| Inset text | `govukInsetText` | Distinguishing information |
| Warning text | `govukWarningText` | Important warnings |
| Panel | `govukPanel` | Confirmation pages |
| Tag | `govukTag` | Status indicators |
| Phase banner | `govukPhaseBanner` | Alpha/Beta indicator |
| Notification banner | `govukNotificationBanner` | Important announcements |
| Error summary | `govukErrorSummary` | Form error list |
| Breadcrumbs | `govukBreadcrumbs` | Navigation hierarchy |
| Back link | `govukBackLink` | Previous page link |
| Pagination | `govukPagination` | Multi-page navigation |
| Task list | `govukTaskList` | Multi-section services |
| Exit this page | `govukExitThisPage` | Emergency exit |

**Component guidance:**
- Use inline radios only for yes/no questions with 2 options
- Avoid select/dropdown wherever possible — radios are almost always better
- Never use a date picker — three text inputs are faster and more accessible
- Always include a `caption` on tables
- Use `format: "numeric"` for number columns (right-aligns them)
- Always include `visuallyHiddenText` on summary list change links
- Use `behaviour: "exclusive"` for "None of the above" checkbox options
- Always include "Select all that apply" hint text on checkboxes

---

## Common Patterns

### Check Your Answers
Use `govukSummaryList` with change links before submission. Always include `visuallyHiddenText` on change links for accessibility.

### Confirmation Page
Use `govukPanel` with reference number and follow with clear next steps.

### Change Links That Return to Check-Your-Answers
This codebase uses a `returnTo`/`returnToAnchor` session flag rather than a `?change=true` query param, so a page can be reached both mid-journey and as a "change" edit from check-your-answers:
```nunjucks
{# On check-your-answers page #}
actions: {
  items: [{
    href: (basePath or '/v1-baseline') + "/create/origin?returnTo=check-your-answers&anchor=origin",
    text: "Change",
    visuallyHiddenText: "country of origin"
  }]
}
```
```javascript
// GET handler stashes the return intent in session
router.get(`${BASE}/create/origin`, (req, res) => {
  if (req.query.returnTo === 'check-your-answers') {
    req.session.data.returnTo = 'check-your-answers'
    if (req.query.anchor) req.session.data.returnToAnchor = req.query.anchor
  }
  // ...
})

// POST handler branches back to check-your-answers instead of the next step
router.post(`${BASE}/create/origin`, (req, res) => {
  // ...validate, save...
  const data = req.session.data
  if (data.returnTo === 'check-your-answers') {
    delete data.returnTo
    const anchor = data.returnToAnchor
    delete data.returnToAnchor
    const url = `${BASE}/create/check-your-answers`
    return res.redirect(anchor ? `${url}#${anchor}` : url)
  }
  res.redirect(`${BASE}/create/commodity`)
})
```

### Formatting Dates from ISO Strings
The date input pattern (three separate `-day`/`-month`/`-year` session values) isn't used in this codebase — dates are stored as a single ISO string (e.g. `arrivalDate: "2026-03-08"`) and formatted route-side. See `formatDate()` in `post-hub-routes.js`:
```javascript
function formatDate (isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return isoDate || 'Not provided'
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  const months = ['January', 'February', /* ... */]
  return `${d} ${months[m - 1]} ${y}`
}
```
Prefer formatting dates in the route/helper and passing a display string to the template, rather than formatting inline in Nunjucks.

### Session-Based UI Patterns
**Example: Deleting a notification**
1. POST to delete endpoint → build a snapshot of the notification, remove it, store the snapshot in `req.session.data.deletedNotificationSnapshot`
2. Redirect to a dedicated confirmation route (`/notification/deleted`)
3. GET that route → read the snapshot, `delete` it from session, render the check-your-answers template with a `showDeletionSuccessBanner` flag
4. Session flags are always deleted the moment they're read — see `dashboard.js` / `v1-baseline/routes.js` for more examples of this "set → redirect → read-and-clear" pattern

### Filtering Lists
```javascript
let filtered = notifications.filter(n => {
  if (searchTerm) {
    return n.reference.toLowerCase().includes(searchTerm.toLowerCase())
  }
  return true
})
```

### Finding by Reference
```javascript
const notification = notifications.find(n => n.reference === reference)
```

### Dynamic Table Rows
Use includes to build table rows dynamically:
```nunjucks
{% include "includes/some-table-rows.njk" %}
```

---

## Best Practices

### Data Consistency
- Use `camelCase` session/data keys throughout (`countryOfOrigin`, `consigneeId`, `arrivalDate`) — this codebase does not use hyphenated field names
- Keep field names consistent between the in-progress session shape and the "submitted" `notifications.js` row shape; `notification-view-helpers.js` bridges the two, so if you add a new field, check whether that helper needs to know about it too

### Don't Repeat Yourself (DRY)
- Extract repeated table rows into includes
- Create shared utility functions for date formatting, filtering
- Reuse banner patterns across pages

### Forms
- Always validate required fields
- Extend `layouts/v1-baseline-forms.html`, which renders `govukErrorSummary` automatically from `data.errors`/`data.errorList` — see Error Handling Pattern above; don't add a second error summary on the page itself
- Store form values in session for persistence
- Button text is usually "Continue" (not "Next" or "Submit")
- Final submit button should be "Accept and send" or similar

### Notifications
- Use `govukNotificationBanner` macro
- Types: `"success"`, `"information"`, `"error"`
- Clear session flags after display
- Include helpful context in banner text

---

## Development Workflow

### Creating New Pages
1. Add the `.html` template under `app/views/v1-baseline/` (or `create/` for journey steps), extending `layouts/v1-baseline.html` or `layouts/v1-baseline-forms.html` as appropriate
2. Add a `GET`/`POST` pair in `app/views/v1-baseline/routes.js` (or `post-hub-routes.js` for anything after animal identification) — this project routes explicitly rather than relying on Prototype Kit's automatic view routing, so both verbs need a handler
3. Add a `*-prefill` route and wire it to `includes/quick-fill-internal-link.njk` for fast manual testing
4. Update `getNotificationTaskListCompletion()` / `buildExperimentalTaskListSections()` in `routes.js` if the new page represents a task-list section

### Working with Data
1. Add/edit reference data as a JS module in `app/data/`, keyed for lookup (see `commodities-eu.js` for the shape)
2. Mock dashboard notifications live in `app/data/notifications.js` — add rows there for demo/testing data, not to `req.session.data`
3. In-progress notification fields are read/written directly on `req.session.data` — no data-loader/transform layer sits in front of it

### Testing
- Test all user journeys manually
- Test with different data scenarios
- Verify session state management
- Check responsive design

---

## Analysing Screenshots to Build Flows

When the user provides one or more screenshots of an existing service, design, or Figma frame, use this process to derive the prototype structure before writing any code.

### Step 1: Identify each screen

For each screenshot, extract:

- **Page type** — What GDS pattern does this match? (question page, check your answers, task list, confirmation, etc.)
- **Page heading (h1)** — What is the question or title being asked?
- **Components present** — List every GOV.UK component visible (radios, input, date input, summary list, etc.)
- **Form field names** — Infer the `name` attribute values from labels, using `camelCase` (e.g. "Full name" → `fullName`) to match this codebase's convention
- **Content** — Any hint text, body copy, warning text, inset text visible
- **Actions** — What buttons exist and what do they say? ("Continue", "Save and continue", "Confirm and submit", etc.)

### Step 2: Map the sequence

Once each screen is identified, establish the flow:

- **Order** — What is the likely sequence of screens based on their content and context?
- **Entry point** — Which screen is the start page or first question?
- **Branching** — Are there any screens that appear to be conditional routes? Look for: different follow-up questions based on a radio answer, optional screens, error states shown as separate screens, alternative paths (e.g. "UK address" vs "international address")
- **Terminal screens** — Which screen ends the flow? (confirmation panel, summary, etc.)

### Step 3: Define routes

Translate the flow into route definitions. For each screen, document:

```
Screen: [page name]
  File: app/views/v1-baseline/create/[filename].html
  Route: POST /v1-baseline/create/[filename] → redirect to [next-screen]
  Branch: if data.[fieldName] === '[value]' → redirect to [branch-screen]
  Session data stored: [fieldName1], [fieldName2]
```

### Step 4: Output a flow plan

Before writing any code, present a structured summary for the user to confirm:

```
FLOW PLAN
─────────────────────────────
1. [screen-name].html          Question: "..."    Components: radios
2. [screen-name].html          Question: "..."    Components: input (text)
3. [screen-name].html          Branch: if [x] → screen 3a, else → screen 4
   └─ 3a. [screen-name].html   Question: "..."    Components: date input
4. check-your-answers.html     Pattern: Check your answers
5. confirmation.html           Pattern: Confirmation panel

Routes required:
  GET/POST /v1-baseline/create/[name] → /v1-baseline/create/[next]
  GET/POST /v1-baseline/create/[branch] → branches to /v1-baseline/create/[a] or /[b]

Session data keys: [list all fieldName values]
```

Ask the user: "Does this flow look right before I build it?" — only proceed to code once confirmed.

### Screenshot analysis tips

- **Radio buttons visible** → infer a branching route is likely needed
- **Summary list with "Change" links** → this is a check-your-answers page; extract all the keys and values as field names for session data
- **Green panel with large text** → confirmation page; note the reference number format if visible
- **Multiple columns or a sidebar** → check if this is a task list pattern
- **Red border or error summary** → this is an error state of an existing page, not a new screen; map it to the same route with validation logic
- **"Back" link present** → note what screen it should link back to
- **Phase banner (Alpha/Beta)** → include `govukPhaseBanner` in the layout
- If a screen is unclear, state your best interpretation and flag it: "I'm reading this as a [X] page — is that right?"

### Example: Three screenshots → routes.js

Given screenshots of: (1) "Are you a UK resident?" radios, (2) "Enter your UK address" inputs, (3) "Enter your international address" inputs. Note this codebase posts back to the **same path** as the GET (not a separate `-answer` URL):

```javascript
router.post(`${BASE}/create/residency`, (req, res) => {
  if (req.session.data.residency === 'uk') {
    res.redirect(`${BASE}/create/uk-address`)
  } else {
    res.redirect(`${BASE}/create/international-address`)
  }
})

router.post(`${BASE}/create/uk-address`, (req, res) => {
  res.redirect(`${BASE}/create/check-your-answers`)
})

router.post(`${BASE}/create/international-address`, (req, res) => {
  res.redirect(`${BASE}/create/check-your-answers`)
})
```

---

## Reminders

- **Never commit sensitive data** to the repository
- **Prefer GOV.UK components** over custom HTML for anything a macro covers — the one established exception in this codebase is typeahead/autocomplete fields, which are hand-written `govuk-select` markup enhanced with `accessible-autocomplete` (see `create/commodity.html`, `create/origin.html`)
- **Test on mobile** viewport sizes
- **Keep it simple** — prototype, don't over-engineer
- **Use real-looking data** for realistic testing
- **Set `spellcheck: false`** for names, references, codes, emails
- **Use `autocomplete` attributes** to help browsers autofill (e.g., `name`, `email`, `tel`, `postal-code`)
- **Document your decisions** in code comments
