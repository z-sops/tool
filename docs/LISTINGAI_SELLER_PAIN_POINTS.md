# Seller pain points — evidence and prioritisation

Public evidence only. Every entry below names its source and date. Where a source
does **not** state a business impact, the impact field says so rather than
inventing one. No statistic, market share or customer-demand figure is asserted
that is not written in a cited source.

Researched 2026-10-21.

---

## Pain point 1 — A seller's own file is rejected because it is not Amazon's template

**1. Source and date.** Amazon Seller Forums, "Flat File Upload no longer works",
2025-11-05.
<https://sellercentral.amazon.com/seller-forums/discussions/t/6e2ee161-bf32-4808-a834-676838dd7ea5>
A seller with "400+ SKUs in 9 Product Categories" writes that for nine years they
uploaded "technically correct feed files that have JUST the columns I am
updating", and that from late October the upload "no longer accommodates any
format except a strictly downloaded template file", so "to update one field, say
the bullets, I have to manually populate the template … comb through 300+ fields
BY HAND".

**2. Specific seller problem.** A listing file that is correct in meaning is
rejected because it does not match the shape of Amazon's own template.

**3. Business impact.** As stated in the source: manual population of 300+ fields
for a single field change across 400+ SKUs in 9 categories.

**4. Current available workaround.** As stated in the source: download the
template, populate every column by hand, or request the "Category Listings
Report" from Seller Support and edit that.

**5. Existing ListingAI capability.** The M1b template adapters identify the
meaning of a file's columns from a *small set of machine field names*
(`seller-sku`, `item-name`, `brand-name`, `standard-price`, `bullet-point1`,
`product-type`, `template-id`, …) and report an explicit unsupported result when
they cannot.

**6. Missing functionality.** ListingAI reads a file; it does not yet **write**
an Amazon-shaped file from the seller's own data.

**7. Proposed solution.** A payload writer that takes the seller's own table and
emits a template-shaped file for a chosen product type, using a verified schema.
This belongs to **M2**, not to M1b, because it needs the schema engine.

**8. How to verify the solution works.** Take the seller's own minimal file,
run it through ListingAI, and confirm the emitted file is accepted by Amazon's
own template validation (the XSD the template ships with) without the seller
populating a single unused column.

---

## Pain point 2 — The processing report is the only diagnostic, and it is opaque

**1. Source and date.** Amazon Seller University, "Troubleshooting" (Amazon's own
listing-upload troubleshooting guide).
<https://m.media-amazon.com/images/G/02/selleruniversity/Listings_Troubleshooting_EN4.pdf>
It states: "you need to access Monitor Upload Status … click on Download your
Processing Report", that in the report "you will find the SKU that identifies
your product (Column B) and the error code and description assigned to each of
them (Column C and E)", and that for a category-specific template the report has
a "Processing Summary" tab grouping the errors and a "Template" tab showing the
specific rows.

**2. Specific seller problem.** The file is rejected, the only explanation is a
report the seller must download, open and read row by row.

**3. Business impact.** Not quantified in the source. The source's guidance
implies a manual, per-row workflow: "check the error message in the results … this
description will point to the exact row that is causing the error".

**4. Current available workaround.** As stated in the source: download the
Processing Report and work through it row by row; for a category template, work
from the "Template" tab where the failing rows are highlighted.

**5. Existing ListingAI capability.** The M1b processing report analyzer reads
the report, extracts the error code, the SKU and the description, matches each
error to the row of the seller's own file by SKU, groups the errors by code,
column and root cause, counts the affected rows and proposes a correction per
group. The tab-delimited Processing Report layout documented by Amazon is
supported.

**6. Missing functionality.** The adapter is **not validated against a genuine
Amazon export** — no real processing report has been supplied for this project.
The "Processing Summary" tab of a category-specific report is not yet read.

**7. Proposed solution.** Validate the adapter against an anonymised real
Processing Report supplied by a seller, and add the "Processing Summary" tab
layout.

**8. How to verify the solution works.** Feed an anonymised real report to the
analyzer and confirm that the number of extracted errors equals the number of
rows Amazon flagged, and that every extracted SKU resolves to a row in the
seller's own file.

---

## Pain point 3 — The documented error codes are the seller's real vocabulary, and the tool does not know them

**1. Source and date.** Amazon Seller University, "Troubleshooting".
<https://m.media-amazon.com/images/G/02/selleruniversity/Listings_Troubleshooting_EN4.pdf>
The guide documents specific codes and their meanings, for example:
* **8058** — "you have not provided a value for a particular field in your
  inventory file … you will see an error: The following attributes are missing
  for SKU: [XXXXXXXX]: [item_name]".
* **99010** — "missing or conflicting values in one of the conditionally required
  columns. For example, the three following columns are a group and are
  conditionally required to be meaningful: 1) sale_price 2) sale_from_date
  3) sale_end_date … To prevent this error, your solution should check 'Data
  Definition' and 'valid values' tab of category specific flat files and add such
  checks before uploading."
* **99038** — "invalid (Ex: HTML Code) characters are used in Product
  Description or Name."
* **90114** — "you have submitted a file that has a numeric value that is lower
  than the minimum value allowed."
* **5008** — the product ID (EAN/UPC) "is not available on Amazon".
* **5003** — "your file is missing required information".
* **5002** — "too many errors in the data you submitted to continue processing it",
  with the recommendation to "Submit a smaller set of data for troubleshooting
  purposes".

**2. Specific seller problem.** A seller sees "Error 8058" and must know what
that code means and which field it refers to.

**3. Business impact.** Not quantified in the source. The source's guidance is to
download the XSDs from Seller Central and validate the feed against them
before uploading.

**4. Current available workaround.** As stated in the source: download the XSDs
and the category's "Data Definition" and "Valid Values" tabs and validate
locally.

**5. Existing ListingAI capability.** The M1b analyzer classifies an error into a
**ListingAI keyword heuristic** category (format, missing-attribute,
invalid-value, relationship, category-requirement, brand-authorization, unknown),
explicitly labelled as *not* Amazon's taxonomy.

**6. Missing functionality.** The tool does not yet carry a **code-to-meaning
map** for the codes Amazon itself documents publicly, and it cannot yet check
"conditionally required groups" or enumerated "Valid Values".

**7. Proposed solution.** Build a documented code reference from Amazon's public
troubleshooting guide, cite the source and its date for every entry, and mark it
clearly as a reading of Amazon's documentation rather than an official API. Add
conditional-requirement groups and enumeration checks once product-type schemas
exist. This is **M2** work.

**8. How to verify the solution works.** For a report Amazon produced, the tool's
suggested correction for a given code must match the meaning Amazon documents
for that code, and the tool must never claim a meaning for a code Amazon does
not document.

---

## Pain point 4 — Amazon reports a field as missing when the seller supplied it

**1. Source and date.** Amazon Seller Forums, "Product catalog issues, I can't get
support to actually help", 2023-09-23.
<https://sellercentral.amazon.com/seller-forums/discussions/t/6ac37f43-1fee-4133-927b-70c423b8fe58>
A seller of printed apparel writes: "We also get poor 8058: The following
attributes are missing for SKU: []: [brand]. Brand is in the file. It's in every
single record. We got 72 of these errors in a single feed file. Brand was in every
record." The same thread describes warning **18367**, where Amazon "amended the
product_type of your submission from SHIRT to PET_APPAREL", followed by error
**8541** and a requirement for a UPC exemption for a category the seller never
submitted.

**2. Specific seller problem.** The processing report contradicts the seller's
own file. The seller cannot satisfy the error without removing data that is
present and correct.

**3. Business impact.** Not quantified in the source.

**4. Current available workaround.** As stated in the source: open Seller Support
cases, which were repeatedly closed without action, and escalate through the
forum.

**5. Existing ListingAI capability.** The M1b analyzer **matches each reported
error to the row of the seller's file by SKU**, so a seller can see, for the
specific SKU Amazon complains about, what the file actually contains. That is
the raw material for spotting a false "missing attribute" report.

**6. Missing functionality.** The tool does not yet **compare the reported error
with the actual cell value** and say "the report says `brand` is missing, and
column `brand-name` is populated in this row". It also cannot detect an Amazon
product-type amendment (18367) against the seller's intended product type.

**7. Proposed solution.** Add a "reported versus present" cross-check: for a
missing-attribute error, verify whether the mapped column actually has a value
and flag the contradiction explicitly. Detect a product-type warning that
disagrees with the seller's chosen product type.

**8. How to verify the solution works.** Feed a report and a file where the
reported-missing field is present, and confirm the tool reports the
contradiction rather than repeating Amazon's claim as fact.

---

## Pain point 5 — Header rows, encodings and delimiters silently fail a file

**1. Source and date.** Amazon Seller Forums (UK), "Flat file Inventory Loader
problem", 2023-10-04.
<https://sellercentral.amazon.co.uk/seller-forums/discussions/t/75c646c6-f4c9-4387-967e-b588893422a3>
The seller receives "The file's header row is missing or invalid. The header row
is for Amazon use only and must not be modified or deleted" and adds that the
reason for the upload was "that amazon blocked some of our listings due to EPR
number missing … they lifted 'search suppression' for us but we have to activate
the listings again". A reply notes "For me, tab delimited text works. You might
be using a comma-delimited text CSV file."

**2. Specific seller problem.** A file that is valid in a spreadsheet is
rejected over its header row or its delimiter, and the seller's listings stay
suppressed while that is unresolved.

**3. Business impact.** As stated in the source: search suppression and the need
to reactivate the listings.

**4. Current available workaround.** As stated in the source: download the
template again and upload as a `.txt` file, or use tab-delimited text.

**5. Existing ListingAI capability.** The M1b reader detects the header row
instead of assuming row 1, skips and reports instruction rows above it, and the
CSV reader handles UTF-8 BOM, CRLF and LF. The M1a tool rejects a UTF-16 file
with an actionable message.

**6. Missing functionality.** The tool does not yet **tell the seller which
delimiter or encoding their file actually uses**, and it does not detect the
Amazon-specific "header row is for Amazon use only" preamble that the Seller
University guide and the forum post both describe.

**7. Proposed solution.** Report the detected delimiter, encoding and header row
position, and flag a file that carries an Amazon template preamble.

**8. How to verify the solution works.** Take the forum's example file shape and
confirm the tool reports the delimiter, the encoding and the true header row,
and that the reported position matches the file.

---

## Pain point 6 — AI-generated copy caused a policy violation before the seller could review it

**1. Source and date.** Amazon Seller Forums, "Beware of using Amazon's Generate
Listing Content with Add Product tool", 2024-07-11.
<https://sellercentral.amazon.com/seller-forums/discussions/t/eee3537b-97fe-4503-9031-26492c1120d0>
The seller used Amazon's own generator, which "overwrote my product title" and
generated bullets containing "prohibited health claim for our detox gummy". They
write: "Our listing was removed before we could review auto-generated content and
remove prohibited words", then "We followed instructions, deleted listing, waited
for 48 hours, and now trying to create listing again but running into error
8541 there system now doesn't accept our new revised title because of the
original already exists in the Amazon catalog … this is catch 22". A later reply
in the same thread explains that the underlying cause was a Brand Registry
permission in another marketplace, and that it "took me opening more than 10 cases
to resolve".

**2. Specific seller problem.** Machine-written copy containing claims the
seller did not write, published without review, that then triggers enforcement.

**3. Business impact.** As stated in the source: the listing was removed, the
seller had already sent inventory to FBA, and the catalogue retained the
erroneous title so the seller could not re-list with correct wording. The
resolution required "more than 10 cases".

**4. Current available workaround.** As stated in the source: opt out of the AI
programme, or manually write and review everything.

**5. Existing ListingAI capability.** The M1a work already made the /create
page state that the output is a draft, is not verified product information and
has not been checked against any marketplace. The ListingAnalyzer scores
copy quality with fixed local rules.

**6. Missing functionality.** The generator has **no fact grounding**: it is not
told which claims come from the seller's own data, and it does not check its
output for prohibited-claim patterns before showing it.

**7. Proposed solution.** Ground every generated claim in the seller's supplied
fields, mark the source of each claim, and run a claim-safety check on the
output before it is offered. This is **M3** work.

**8. How to verify the solution works.** Generate a listing from a product
description that contains a health claim, and confirm the tool either omits the
claim or marks it explicitly as unverified seller input, and that a claim-safety
check flags it before the seller can save it.

---

## Pain point 7 — Enforcement and search suppression arrive without warning and without a working appeal

**1. Source and date.** Two sources.
* Amazon Seller Forums, "My Listings are Being Taken Down by AI. Nobody Reads the
  Appeal. Nobody Cares. Nobody Helps.", 2025-08-23.
  <https://sellercentral.amazon.com/seller-forums/discussions/t/2b235d21-4080-4bf3-b847-3bc8fa9d1f6d>
  A seller of cigarette papers writes that "in the last 24 hours I have had more
  than 100 of my listings taken down", with a templated message, appeals that
  are denied, and "thousands of dollars of goods stranded in American FBA
  warehouses" plus a similar amount in Canada because the stores are connected.
* Reddit r/AmazonFBATips, "I sell mostly wholesale. Amazons been making some of
  my products search suppressed by force. Anyone else experiencing this?",
  2025-04-17.
  <https://www.reddit.com/r/AmazonFBATips/comments/1k1dztr/i_sell_mostly_wholesale_amazons_been_making_some_of_my_products/>
  The poster lists "Category removal, for no reason it seems like Amazon would
  remove my products category making from its category making it search
  suppressed and unsellable", "Description deletion, this also make the product
  not sellable", and page deletion, with "Amazon support claims they will look
  into it" in every case.

**2. Specific seller problem.** Listings are suppressed or removed, the reason is
generic, the appeal is not read, and the seller cannot find out what to fix.

**3. Business impact.** As stated in the sources: stranded FBA inventory valued
in the thousands of dollars across two marketplaces, and unsellable listings.

**4. Current available workaround.** As stated in the sources: appeal and open
support cases, which the sources describe as not working.

**5. Existing ListingAI capability.** The M1b tool can show what a file says and
what a processing report says about it, offline, before the seller uploads
anything.

**6. Missing functionality.** ListingAI has **no visibility of a live listing
at all**. It cannot know that a listing was suppressed, what was removed, or
whether an appeal was answered.

**7. Proposed solution.** This needs an authorised Amazon integration: listing
status retrieval, an issue timeline per SKU, and alerting. That is **M6**, and
it must not be started before an API authorisation and a security review, and
it must not claim to detect enforcement Amazon has not reported.

**8. How to verify the solution works.** With an authorised seller account, pull
the status of a known-suppressed listing and confirm the tool reports the same
state Amazon's own dashboard shows, and reports nothing at all when the API is
not authorised.

---

## Pain point 8 — A partial update silently does not update the listing

**1. Source and date.** Amazon Seller Forums, "AI Generated Bullets - opt out
please", 2025-02-05.
<https://sellercentral.amazon.com/seller-forums/discussions/t/6999bce7-ee28-4eca-8500-5ae743e4cf71>
A seller reports that "the product bullets displayed to customers do not match
what is in Seller Central" and suspects Amazon's AI programme. Amazon's
response: "The reason you're not seeing updates to the bullet points is due to
doing a partial update feed file. Recommendation is to perform a full update, by
selecting 'update' in 'update/delete' column in feed template."

**2. Specific seller problem.** A file is accepted but does not change the
listing, and the seller cannot tell why.

**3. Business impact.** Not quantified in the source.

**4. Current available workaround.** As stated in the source: use a full update
and set the "update/delete" column correctly.

**5. Existing ListingAI capability.** The M1b template adapters identify the
`update-delete` column only as an unmapped column, and the M1b tool reports
whether a file is partial or full nowhere.

**6. Missing functionality.** The tool does not detect the update mode.

**7. Proposed solution.** Detect the update mode from the template's
`update-delete` column and warn when a file that a seller expects to change a
listing is actually a partial update, or when the column is missing.

**8. How to verify the solution works.** Give the tool a file whose
`update-delete` column is absent or says "Partial Update" and confirm it warns
that the listing fields will not change.

---

## Prioritisation

Ordered by how directly the evidence supports the work, and by whether it needs
an authorised Amazon integration first.

| Rank | Pain point | Addressed by | Blocked on |
| --- | --- | --- | --- |
| 1 | 2 — the processing report is the only diagnostic | **M1b (done)** | validated against a real report |
| 2 | 5 — header, encoding and delimiter failures | **M1b (done)** | nothing |
| 3 | 3 — documented error codes are the seller's vocabulary | M2 | a cited code reference and schemas |
| 4 | 4 — Amazon reports a field missing when it is present | M2 | depends on 3 and on schemas |
| 5 | 1 — a seller's own file is rejected | M2 | verified product-type schemas |
| 6 | 8 — a partial update silently does nothing | M2 | template knowledge |
| 7 | 6 — AI copy caused a policy violation | M3 | fact grounding and claim checks |
| 8 | 7 — suppression and enforcement without notice | M6 | **API authorisation and a security review** |

The evidence supports the order above rather than a general "add more tools".
Three of the top six are about **the same artefact** — a seller's bulk file and
the report Amazon returns for it — which is why the Bulk File Doctor, and the
M2 schema engine behind it, are the right place to invest. The two points that
need a live Amazon connection are deliberately last, because they cannot be
built or verified without an authorised account.
