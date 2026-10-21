# Gitee evaluation — `my_forks/spapi-listing-builder`

Source evaluated, as instructed: <https://gitee.com/my_forks/spapi-listing-builder>.
Cloned read-only into a temporary directory outside the ListingAI repository.
**No code from this project has been imported into ListingAI.**

Verified on 2026-10-21.

---

## 1. Revision and maintenance status

| Item | Value |
| --- | --- |
| Gitee HEAD | `09ef983ebd70079ec42350bbb173a4703913e766` |
| HEAD date | 2024-12-03 10:30:54 +0800, "feat: 完善跟卖产品生成及示例" |
| `package.json` version | `0.2.1` |
| Upstream declared in `package.json` | `github.com/sellerartifact/spapi-listing-builder` |
| Upstream `main` | `6a4c8b9a6d289ce31c8e2c0d19c543ba3b944d97` (2026-09-09) |
| Commits the Gitee fork lacks | **15** |
| npm `latest` | `spapi-listing-builder@0.2.9` (MIT) |

The Gitee repository is a **fork** of the upstream project, not the canonical source.
The fork's HEAD SHA exists in the upstream repository, so the fork carries no local
modification of that commit — but the fork is an **abandoned snapshot**, 15 commits and
eight published releases behind, while the upstream is actively maintained.

**Conclusion:** adopt from the published npm package, never from this fork.

## 2. Licence and commercial permission

`LICENSE.md` in full is the MIT License:

```
MIT License

Copyright (c) 2024 wangjue666 <https://github.com/wangjue666>
... (full MIT permission and warranty disclaimer)
```

`package.json` declares `"license": "MIT"` and author `wangjue666 <wangjuesix@gmail.com>`.

* MIT expressly permits **use, copying, modification, merging, publication,
  distribution, sublicensing and selling**, including commercially.
* **Obligation:** "The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software." Any adopted
  portion must carry that notice and the MIT text.
* **Attribution to record:** copyright holder `wangjue666`; upstream project
  `sellerartifact/spapi-listing-builder`; MIT text reproduced in ListingAI's
  third-party notices.

## 3. Third-party data inside the repository — a licensing blocker

`test/SchemaCheck/schema/HOME.json` (1,022,292 bytes) is **Amazon's Product Type
Definition**, not author-authored data:

```json
"$schema": "https://schemas.amazon.com/selling-partners/definitions/product-types/meta-schema/v1",
"$id": "https://schemas.amazon.com/selling-partners/definitions/product-types/schema/v1/HOME",
"$comment": "Amazon product type definition for HOME product type"
```

The repository's MIT licence covers the author's own software; it cannot grant rights
over Amazon's Product Type Definitions, which Amazon publishes under its own Selling
Partner API terms.

**`HOME.json` must not be imported into ListingAI.** It is also absent from the
published npm package: `package.json` sets `"files": ["dist"]`, and the
`spapi-listing-builder@0.2.9` tarball was inspected and contains only `dist/`,
`LICENSE.md`, `README.md` and `package.json`. A scan of `dist/index.mjs` found no
embedded Amazon schema, no `schemas.amazon.com` reference and no marketplace id.

## 4. Dependencies

| Package | Version | Licence |
| --- | --- | --- |
| `json-schema-library` | `10.0.0-rc2` | MIT |
| `deepmerge` | 4.3.1 | MIT |
| `fast-copy` | 3.0.2 | MIT |
| `fast-deep-equal` | 3.1.3 | MIT |
| `@sagold/json-query` | 6.1.3 | MIT |
| `@sagold/json-pointer` | 6.0.1 | MIT |
| `smtp-address-parser` | 1.0.10 | MIT |
| `valid-url` | 1.0.9 | MIT upstream; the published registry metadata omits the `license` field |

The single runtime dependency is a **release candidate pinned to an exact version**,
which is a supply-chain risk in its own right. Dev dependencies are all permissive.

**No GPL, AGPL, academic-use-only or unknown-licence code was found.**

## 5. Security review

A static scan of every file under `src/` found **none** of: `fetch`, `axios`,
`XMLHttpRequest`, `eval`, `new Function`, `child_process`, `fs`, `process.env`,
`localStorage`. The only external import is `json-schema-library`.

It is a **pure data-transformation library**: a plain object in, an SP-API-shaped JSON
object out. No network access, no credentials, no persistence, and no execution of
anything in the schema it validates.

One hygiene issue: `src/SchemaCheck/ConvertSchemaItem2FormItem/index.ts` runs
`console.log('properties', properties)` immediately before throwing on an unknown
schema type. No secrets are involved, but it should be removed if the code is ever
vendored.

## 6. TypeScript compatibility

* TypeScript and ESM, like ListingAI. It uses `unbuild` and a `@/` path alias;
  vendored source would need the alias rewritten to relative imports.
* `tsconfig` targets `ESNext` with `lib: ["ESNext"]`; ListingAI targets `ES2020` with
  `lib: ["ES2020", "DOM", "DOM.Iterable"]`.
* The library produces **plain data, not React elements**. `ConvertSchemaItem2FormItem`
  returns `{ field, label, component, componentProps, required }` where `component` is a
  string (`'Input'`, `'Select'`, `'Switch'`, `'DatePicker'`, `'InputNumber'`). That is
  UI-agnostic and fits ListingAI, but a small adapter from those names to ListingAI's
  components is required.
* The npm `dist/index.mjs` is 25.4 kB raw. The JSON Schema validator is not
  tree-shakeable, so it would need a dynamic import to stay out of the initial bundle.

## 7. Test coverage

The project's own suite was executed in the temporary clone (`npm install` succeeded
with 615 packages):

* `npx vitest run` → **13 test files, 25 tests, all passing**.
* Coverage with the v8 provider: **statements 98.2 %, branches 96.46 %, functions
  96.12 %, lines 98.2 %**.

The headline number is inflated by roughly 25 trivial single-value attribute classes
with one-line tests. The meaningful paths are the least covered:

| File | Statements | Branches | Uncovered |
| --- | --- | --- | --- |
| `src/SchemaCheck/index.ts` | 76.36 % | 66.66 % | `getRequiredSchema`, `getProperties`, error paths |
| `src/listing/product/BaseInfo/ListPrice/index.ts` | 60 % | 100 % | 0 % functions |
| `src/listing/product/BaseInfo/index.ts` | 100 % | 60 % | branches on lines 22-46 |

The schema-to-form path, the part ListingAI would care about most, is the least tested.

## 8. Reusable features against ListingAI

| Area | Audited project | ListingAI today | Assessment |
| --- | --- | --- | --- |
| Product-type schema validation | `SchemaCheck` over JSON Schema Draft 2019-09 | `src/lib/bulk/templates.ts` holds an intentionally empty `ProductTypeSchemaRegistry` | **Engine reusable, data not.** The only available schema is Amazon's PTD, a licensing blocker. |
| Listing form generation | `ConvertSchemaItem2FormItem` → UI-agnostic descriptors | none | **Reusable and the highest-value item.** |
| Product attributes | ~25 attribute classes producing SP-API attribute objects | heuristic copy-quality scoring | **No functional overlap.** |
| Variation relationships | `ProductParentage` → variation theme, colour, size, parentage level, child/parent SKU relationship | the Bulk File Doctor detects a parent-SKU column role | **No overlap.** |
| JSON payload generation | `ListingProduct` → `{ productType, requirements, attributes }` | none | **New capability.** |
| Bulk feeds | `FeedProduct` → `{ header, messages[] }` | none | **New capability.** |

## 9. Decision

**Not integrated in this milestone.** If any part is adopted later:

1. Take it from the published npm package `spapi-listing-builder@0.2.9` (MIT), not
   from the stale Gitee fork and not by copying files.
2. Never import `HOME.json` or any Amazon Product Type Definition. PTDs must be
   obtained and verified under Amazon's own terms and stored behind the
   `ProductTypeSchemaRegistry` interface, recording `source` and `verifiedAt`.
3. Add the MIT notice and copyright to ListingAI's third-party notices.
4. Note that ListingAI currently has **no root LICENSE file**; the project owner must
   settle the licence of the combined work before any MIT code is vendored.
5. Keep any integration behind a dynamic import and keep the Bulk File Doctor offline:
   no seller credentials and no live SP-API call.

No GPL, AGPL, academic-use-only or unclear-licence code was copied into ListingAI, and
no code from this project was copied at all.
