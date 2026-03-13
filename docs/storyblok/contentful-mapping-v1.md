# Legacy Contentful -> Storyblok Mapping v1

This document defines the deterministic mapping contract used for legacy Contentful exports in `data/contentful-export/entries.json`.

## Type Mapping

| Legacy Contentful type | Storyblok target | Notes |
| --- | --- | --- |
| `about` | `page_home` story (`slug=home`) | Singleton home content |
| `project` | `page_project` story | One Storyblok story per legacy project |
| `experience` | `item_experience` reusable record | Referenced from `page_home.experience` |
| `socialLink` | `item_social_link` reusable record | Embedded into `page_home.social_links` |

## Field Mapping

### `about -> page_home`

| Contentful field | Storyblok field | Mapping rule |
| --- | --- | --- |
| `name` | `headline` | Direct string copy |
| `description` | `role` | Direct string copy |
| `aboutMe` | `intro` | Converted to one-paragraph richtext |
| `aboutMe` | `hero_intro` | Seeded from legacy intro, then eligible for curated CMS copy |
| `aboutMe` | `about_intro` | Seeded from legacy intro, then eligible for curated CMS copy |
| `roles[]` | `roles[]` | String array copy |
| n/a | `availability_note` | Seeded with default availability copy and then curated in baseline import |
| n/a | `availability_status` | Seeded with default availability status |
| n/a | `availability_timezone` | Seeded with default timezone text |
| n/a | `availability_response_time` | Seeded with default response expectation |
| `socialLinks[]` (entry links) | `social_links[]` | Resolved via mapped `socialLink` records |
| `projects[]` (entry links) | `featured_projects[]` | Relation keys to mapped projects (`legacy:project:{entryId}`) |
| `experience[]` (entry links) | `experience[]` | Relation keys to mapped experience records (`legacy:experience:{entryId}`) |
| `profile` asset | `seo[0].og_image` | Asset id copy when present |

### `project -> page_project`

| Contentful field | Storyblok field | Mapping rule |
| --- | --- | --- |
| `name` | `title` | Direct string copy |
| `name` | `slug` | Lowercase slugified value |
| `description` | `summary` | Direct string copy |
| `description` | `content` | Converted to one-paragraph richtext |
| `publishedDate` | `published_date` | ISO date normalization |
| `projectUrl` | `project_url` | Direct string copy |
| `repositoryUrl` | `repository_url` | Optional direct string copy |
| `type` | `type` | Direct string copy |
| n/a | `stack[]` | Seeded empty from legacy export, filled by curated baseline content |
| `logo` asset | `logo` | Asset id copy |

### `experience -> item_experience`

| Contentful field | Storyblok field | Mapping rule |
| --- | --- | --- |
| `title` | `title` | Direct string copy |
| `companyName` | `company_name` | Direct string copy |
| `description` | `description` | Converted to one-paragraph richtext |
| `startDate` | `start_date` | ISO date normalization |
| `endDate` | `end_date` | Optional ISO date normalization |
| `skills[]` | `skills[]` | String array copy |
| `image` asset | `image` | Asset id copy |

### `socialLink -> item_social_link`

| Contentful field | Storyblok field | Mapping rule |
| --- | --- | --- |
| `name` | `name` | Direct string copy |
| `url` | `url` | Direct string copy |
| `fontAwesomeIcon` | `icon` | Direct string copy |

## Validation

Contract validation is implemented in `tests/contract/contract-migration-001.spec.ts` using live sample payloads from `data/contentful-export/entries.json`.

## Curated Copy Layer

Legacy Contentful export is a bootstrap source, not the final public portfolio copy.

The baseline import workflow may apply a curated content layer after legacy mapping to:
- replace migration-era placeholder copy with hiring-focused portfolio copy,
- split home content into `hero_intro` and `about_intro`,
- populate project-specific `stack[]`,
- keep the final publishable Storyblok payload aligned with the approved portfolio narrative.
