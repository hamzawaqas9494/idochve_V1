# iDocHive Marketing Website

## Overview

iDocHive converts sensitive enterprise documents and archives into governed, permission-aware, searchable, and AI-ready organizational knowledge inside the customer’s controlled environment. This repository is the bilingual (English and Arabic) marketing website. Its job is to convert qualified government, regulated-enterprise, and partner visitors into architecture-review meetings. It is not the product application and it is not a public SaaS signup product.

## Goals

1. Within five seconds, communicate what iDocHive does, who it serves, why it is different, where data stays, and what to do next.
2. Convert visitors with a single commercial CTA: Book an Architecture Review.
3. Deliver native English and Arabic layouts of equal authority.
4. Publish only confirmed claims from `idochive.md` Sections 31 and 63.
5. Feel suitable for a government CIO, CISO, or enterprise buyer.

## Core User Flow

1. Visitor lands on Home in English or Arabic.
2. Hero and pipeline show PAPER → DATA → INFORMATION → INTELLIGENCE inside a customer-controlled environment.
3. Visitor inspects How It Works, Deployment and Security, or Government pages.
4. Visitor books an Architecture Review. There is no sign-up, trial, or account.

## Features

### Launch pages

- Home
- How It Works
- Deployment and Security
- Government and Regulated Enterprise
- Book an Architecture Review
- Short privacy notice

### Product explanation

- Animated document pipeline
- Interactive architecture explorer with PostgreSQL + pgvector as the named data layer
- Air-gapped topology with no public-internet egress
- Synthetic product mockups (National Infrastructure Archive)
- Qualification form with real-success-only submission

## Scope

### In Scope

- Five primary pages plus privacy notice
- English and native RTL Arabic
- SEO metadata, sitemap, robots, Organization and SoftwareApplication schema
- WCAG 2.2 AA target, reduced motion, keyboard access
- Form posting only to `VITE_FORM_ENDPOINT` when configured

### Out of Scope

- Public SaaS, signup, register, free trial
- Public pricing or internal commercial ranges
- Customer names, logos, testimonials, revenue, pipeline
- HUMAIN partnership claims
- Live PostgreSQL, product APIs, or the Laravel/Vue application
- Solutions, Partners, Resources, Company, Trust Center pages
- 3D engines, background video on mobile, decorative AI imagery

## Success Criteria

1. All five pages work in English and Arabic on desktop, tablet, and mobile.
2. Navigation, language switch, and primary CTA work on every page.
3. Form validates and never shows a fake success state.
4. Architecture visuals name PostgreSQL + pgvector and never label the product UI as React.
5. No unsupported or confidential claims appear.
