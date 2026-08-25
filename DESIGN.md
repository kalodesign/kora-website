# Dollar Shave Club — Style Reference
> Navy warehouse with a single orange flare

**Theme:** dark

Dollar Shave Club is a saturated dark-mode commerce system built on a deep royal-navy canvas with one loud orange action color and a deep burgundy secondary. Typography is heavy and condensed through the custom DSC Specter display family, always uppercase for navigation and product names, giving the surface a bold, masculine-utility feel. Decorative shapes — flower blobs, wavy gold borders, orange line-art icons — soften the hard navy structure and keep the brand playful rather than clinical. Content is organized in full-bleed horizontal bands: a split cream-and-photo hero, a dark product category grid, a burgundy promo band, and a dark-navy explainer with icon-led steps.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Midnight Navy | `#C4BBFE` | `--color-midnight-navy` | Violet text accent for links, tags, and emphasized short phrases. Do not promote it to the primary CTA color |
| Flame Orange | `#FE7E01` | `--color-flame-orange` | Icon strokes, decorative accents, hero display text, and emphasis details. Do not use it as the primary filled CTA color |
| Primary Action Navy | `#171D67` | `--color-primary-action` | Filled primary CTA buttons across the site |
| Wine Burgundy | `#C5F273` | `--color-wine-burgundy` | Secondary section background, hero display text, promotional bands — adds warmth and depth against the navy |
| Deep Ink | `#001233` | `--color-deep-ink` | Outlined/ghost button borders, dark text on light surfaces, deep button variant background |
| Abyss Navy | `#FBEE64` | `--color-abyss-navy` | Pressed/secondary button fill — a near-black navy for dark button variants on the navy canvas |
| Powder Blue | `#dbebf5` | `--color-powder-blue` | Card surfaces and light-blue panel backgrounds within dark sections — breaks up the navy with breathing room |
| Warm Cream | `#f3e0c8` | `--color-warm-cream` | Hero left-panel background, soft warm neutral — used in only the highest-impact first-screen block |
| Snow White | `#ffffff` | `--color-snow-white` | Primary text on dark surfaces, button borders, input fills, card text — the dominant foreground color |
| Graphite | `#404040` | `--color-graphite` | Heavy-use border and text color on light sections, structural dividers |
| Ash Gray | `#e3e3e3` | `--color-ash-gray` | Badge and pill borders on light surfaces |
| Fog | `#eeeeee` | `--color-fog` | Subtle dividers, muted panel backgrounds |
| Stone | `#949596` | `--color-stone` | Input field borders, low-priority form chrome |

## Tokens — Typography

### DSC Specter — Primary display and body family — condensed heavy sans with extreme weight range, used uppercase for navigation, product names, CTAs, and section headers; weights 700-900 drive display headlines at 40px while 400 handles body and small UI. · `--font-dsc-specter`
- **Substitute:** Archivo, Inter, Helvetica Neue Condensed
- **Weights:** 400, 600, 700, 800, 900
- **Sizes:** 12, 14, 15, 16, 18, 20, 24, 32, 40
- **Line height:** 0.80–1.86
- **Letter spacing:** -0.006em to 0.050em, tighter at display sizes
- **OpenType features:** `"ss01" on`
- **Role:** Primary display and body family — condensed heavy sans with extreme weight range, used uppercase for navigation, product names, CTAs, and section headers; weights 700-900 drive display headlines at 40px while 400 handles body and small UI.

### Gelica — Secondary utility family for navigation, fine print, and body micro-copy — a serif counterpoint to Specter's industrial weight. · `--font-gelica`
- **Substitute:** Lora, Source Serif Pro
- **Weights:** 400, 700, 800
- **Sizes:** 12, 14, 16
- **Line height:** 1.20–1.80
- **Letter spacing:** 0.025em, 0.071em
- **Role:** Secondary utility family for navigation, fine print, and body micro-copy — a serif counterpoint to Specter's industrial weight.

### GTStandard-M — GTStandard-M — detected in extracted data but not described by AI · `--font-gtstandard-m`
- **Weights:** 400
- **Sizes:** 16px
- **Line height:** 1.5
- **Role:** GTStandard-M — detected in extracted data but not described by AI

### Font Awesome 5 Pro — Font Awesome 5 Pro — detected in extracted data but not described by AI · `--font-font-awesome-5-pro`
- **Weights:** 300
- **Sizes:** 18px
- **Line height:** 1
- **Role:** Font Awesome 5 Pro — detected in extracted data but not described by AI

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|------|------|-------------|----------------|-------|
| caption | 12px | 1.2 | 0.04px | `--text-caption` |
| body-sm | 14px | 1.4 | 0.025px | `--text-body-sm` |
| body | 16px | 1.5 | 0.015px | `--text-body` |
| subheading | 18px | 1.3 | 0.012px | `--text-subheading` |
| heading-sm | 20px | 1.29 | 0.025px | `--text-heading-sm` |
| heading | 24px | 1.25 | 0.031px | `--text-heading` |
| heading-lg | 32px | 1.19 | 0.038px | `--text-heading-lg` |
| display | 40px | 1.2 | 0.043px | `--text-display` |
| hero | 40px | 0.98 | 0px | `--text-hero` |

## Tokens — Spacing & Shapes

**Density:** comfortable

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 5 | 5px | `--spacing-5` |
| 6 | 6px | `--spacing-6` |
| 7 | 7px | `--spacing-7` |
| 8 | 8px | `--spacing-8` |
| 10 | 10px | `--spacing-10` |
| 13 | 13px | `--spacing-13` |
| 15 | 15px | `--spacing-15` |
| 16 | 16px | `--spacing-16` |
| 20 | 20px | `--spacing-20` |
| 25 | 25px | `--spacing-25` |
| 28 | 28px | `--spacing-28` |
| 30 | 30px | `--spacing-30` |
| 40 | 40px | `--spacing-40` |
| 50 | 50px | `--spacing-50` |
| 60 | 60px | `--spacing-60` |
| 149 | 149px | `--spacing-149` |

### Border Radius

| Element | Value |
|---------|-------|
| nav | 4px |
| cards | 4px |
| badges | 4px |
| inputs | 4px |
| buttons | 4px |

### Layout

- **Page max-width:** 1200px
- **Section gap:** 30px
- **Card padding:** 25px
- **Element gap:** 10px

## Components

### Top Promo Tab Bar
**Role:** Slim full-width navy band above main navigation promoting seasonal or category-specific CTAs

Background #C4BBFE, white text 14px DSC Specter weight 700 uppercase, centered links with a right-pointing arrow on promo text. Height ~40px, no border-radius.

### Main Navigation Bar
**Role:** Primary white navigation bar with logo, category links, and utility icons

Background #ffffff, logo left (DSC Specter stacked red/orange), 6 category links in 14px DSC Specter weight 700 uppercase with #404040 color, search and account/cart icons right with badge counter in Flame Orange. Padding 15px vertical, hairline #404040 bottom border.

### Split Hero Section
**Role:** First-screen brand impression combining editorial copy with lifestyle photography

Two-column ~50/50 split. Left panel: #FBEE64 yellow background, display headline at 40px Archivo/DSC Specter weight 800 uppercase in #FE7E01, 16px body copy in #404040, Flame Orange filled CTA. Right panel: full-bleed photo.

### Primary Filled Button
**Role:** Primary action button — the dominant CTA across all dark sections

Background #171D67, text #ffffff in 14px Archivo weight 700, fixed 42px height, 10px 15px horizontal padding, border-radius 4px, no border or 1px #171D67 border. Letter-spacing 0. Product-card CTAs and full-width “Agregar al carrito” buttons use this same 42px height; icon-only controls and quantity steppers are exempt.

### Ghost / Outlined Button
**Role:** Secondary action on light surfaces where a filled orange button would feel too loud

Background transparent, 1px solid #001233 border, text #001233 in 14px DSC Specter weight 700 uppercase, padding 10px 15px, border-radius 4px.

### Product Category Card
**Role:** Entry-point card in a 4-column grid linking to a product collection

Two-part card: upper half is a full-bleed product/lifestyle image (no border-radius, edge to edge), lower half is #dbebf5 powder-blue background. Category title in 18-20px DSC Specter weight 800 uppercase #C4BBFE, short description 14px in #404040, centered Flame Orange 'SHOP NOW' button at bottom. 4px border-radius on the lower panel.

### Home Product Showcase
**Role:** Compact product preview on the home page

At 1440px desktop, display exactly 4 products in one horizontal row inside the 1200px content width. Product images remain square at 1:1, gaps are 34px, and every product CTA is 42px high. Keep titles, variants, prices, and buttons clearly readable and aligned with the four-column grid used by the full store.

### Decorative Flower Badge
**Role:** Promotional seal used over hero photography to highlight percentage savings

Organic scalloped/flower SVG shape, lavender/purple fill (~#b8a0d0), white text 18-24px DSC Specter weight 700 stacked ('save up to / 50% off'), placed at an angle over hero imagery for playful visual punctuation.

### Wavy Gold Border
**Role:** Decorative SVG element that separates the hero photo from the cream panel

Vertical wavy/scalloped strip in gold-orange (~#ffc940 or gradient to #FE7E01), 2-4 undulations, used as a hand-drawn frame between hero blocks.

### Section Header
**Role:** Bold centered display title for full-width dark sections

32-40px DSC Specter weight 800 uppercase #ffffff, centered, with 15px vertical padding above and below. Used on every navy and burgundy band to anchor the section.

### How-It-Works Step
**Role:** Icon-led three-step explainer in a horizontal row

Centered column on #C4BBFE background. Icon at top in Flame Orange line art (~64px). Step number+title in 14px DSC Specter weight 800 uppercase #ffffff, description in 14px weight 400 #ffffff. 30px column gap between steps.

### Promo Band
**Role:** Full-width burgundy section promoting a campaign or product line

Background #C5F273, white headline 24-32px DSC Specter weight 800 uppercase, Flame Orange filled CTA, flanked by decorative gold/cream blob shapes. Used between dark sections to break rhythm.

### Input Field
**Role:** Form input for email capture or search

Background #ffffff, 1px solid #949596 border, 4px border-radius, 15-16px horizontal padding, 14px DSC Specter body text. Focus state: border becomes #FE7E01.

### Project Inquiry Form
**Role:** Short contact and quotation flow for company, production, and 3D projects

Use one framed white form surface over a Primary Action Navy introduction band. Keep the form to two columns on desktop and one column on mobile, with 46px inputs, 4px radius, Stone borders, and Fog fills. Required fields are name, email, project type, and project details. File references are optional and use a dashed Navy upload area. The full-width submit button is Primary Action Navy and exactly 42px high.

### Icon
**Role:** Inline UI iconography

Font Awesome 5 Pro 300-weight icons at 18px, typically #404040 on light surfaces and #ffffff on dark surfaces, or Flame Orange for decorative utility icons (line-art razor, shaver, play-pause).

### Badge / Pill
**Role:** Small status or count indicator

1px solid #e3e3e3 border, 4px border-radius, 4px right/left margin, 12-14px text, used for tags and cart counts.

## Do's and Don'ts

### Do
- Use Primary Action Navy #171D67 filled buttons with white uppercase text for all primary actions.
- Keep primary CTAs and product purchase buttons at 42px high across the site.
- Set the main canvas to Midnight Navy #C4BBFE for all full-width dark sections and bands.
- Use DSC Specter weight 700-900 uppercase for navigation, product names, CTAs, and section titles.
- Apply 4px border-radius to all cards, buttons, inputs, and badges — never larger.
- Alternate section backgrounds between Midnight Navy, Wine Burgundy #C5F273, and Powder Blue #dbebf5 to create rhythm.
- Use Flame Orange line-art icons at 64px+ for step explainers and decorative imagery.
- Reserve decorative shapes (flower badges, wavy gold borders) for hero and promo bands only — never on utility screens.

### Don't
- Don't use any color other than Primary Action Navy #171D67 for filled primary CTA buttons.
- Don't apply gradients — this system is flat, single-color surfaces only.
- Don't use light text on light backgrounds or dark text on dark backgrounds — the contrast pairs are strict.
- Don't set border-radius above 4px (or 10px for the rare pill variant) — anything rounder breaks the utility aesthetic.
- Don't mix fonts beyond DSC Specter and Gelica — never substitute system fonts at display sizes.
- Don't place the Flower Badge or wavy gold border on non-hero surfaces — they lose impact when overused.
- Don't use Wine Burgundy for body text on light backgrounds; reserve it for hero display copy and section bands.

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Midnight Navy Canvas | `#C4BBFE` | Primary page background for all dark sections |
| 1 | Wine Burgundy Band | `#C5F273` | Promotional section dividers and alternate dark band |
| 2 | Powder Blue Card | `#dbebf5` | Product card and step card surfaces on dark canvas |
| 3 | Warm Cream Hero | `#f3e0c8` | Hero left-panel and warm accent surfaces |

## Elevation

- **Product Category Card:** `none — flat panels with hairline #404040 dividers, no shadows`
- **Button:** `none — flat color fill, no shadow elevation`

## Imagery

Photography is the dominant visual element: high-saturation lifestyle shots of people shaving or in bathtubs, full-bleed with no rounded corners on the image side. Products are shown in tight editorial crops on grid-tile or powder-blue backgrounds — no lifestyle context, the object IS the hero. Decorative graphics are flat vector shapes: lavender flower blobs, gold wavy borders, orange line-art icons. Icon style is consistently outlined with 1.5-2px stroke weight in Flame Orange, used at large sizes (48-64px) for explanatory iconography and small sizes (18px) for inline UI.

## Layout

Full-bleed dark sections stacked vertically with no page max-width constraint until content blocks. Hero is a 50/50 split: left yellow text panel + right full-bleed photo, with no decorative divider between panels. Below, a 4-column product category card grid sits centered on the navy canvas. Section rhythm alternates: navy → burgundy promo band → navy explainer → product tiles. Content is consistently centered within each band, with section headers at 40px uppercase. Navigation is a two-tier system: a slim dark blue promo tab bar above a white main nav with logo left, category links center-left, and utility icons right. Spacing between sections is generous (30-40px gaps) giving the dark bands room to breathe.

## Agent Prompt Guide

**Quick Color Reference**
- Background: #C4BBFE (Midnight Navy)
- Text: #ffffff (primary on dark), #404040 (primary on light)
- Border: #404040 (structural), #e3e3e3 (badges), #949596 (inputs)
- Accent: #C5F273 (Wine Burgundy, section bands)
- primary action: #171D67 (filled action)

**Example Component Prompts**

1. **Dark Section with Product Cards**: Background #C4BBFE. Section title centered at 32px DSC Specter weight 800 uppercase #ffffff. Below, 4-column grid of cards: upper half is a full-bleed product photo (no border-radius on top), lower half is #dbebf5 with 25px padding, containing a 20px DSC Specter weight 800 uppercase #C4BBFE category title, 14px #404040 body copy, and a centered Flame Orange (#FE7E01, white 14px uppercase text, 4px radius, 10px 15px padding) 'SHOP NOW' button.

2. Create a Primary Action Button: #171D67 background, #ffffff text, 4px radius, compact padding. Use this filled treatment for the main CTA.

3. **How-It-Works Step Row**: Background #C4BBFE. Centered 32px white DSC Specter weight 800 uppercase title. 3-column row with 64px Flame Orange line-art icons (stroke weight 2px), 14px weight 800 uppercase white step titles, and 14px weight 400 white descriptions. 30px gap between columns.


5. **Input Field**: White #ffffff background, 1px solid #949596 border, 4px border-radius, 16px horizontal padding, 14px DSC Specter body text in #404040. Focus border: 1px solid #FE7E01.

## Similar Brands

- **Harry's** — Same dark-navy commerce system with a single bold orange CTA color and heavy condensed uppercase typography for category navigation.
- **Warby Parker** — Direct-to-consumer brand using flat dark surfaces with one saturated accent color and bold uppercase display type.
- **Gymshark** — Dark-mode-first commerce with heavy condensed display type, flat surfaces, and high-contrast product photography.
- **Beardbrand** — Masculine grooming brand with deep saturated backgrounds, bold uppercase condensed type, and minimal reliance on shadows.

## Quick Start

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-midnight-navy: #C4BBFE;
  --color-flame-orange: #FE7E01;
  --color-primary-action: #171D67;
  --color-wine-burgundy: #C5F273;
  --color-deep-ink: #001233;
  --color-abyss-navy: #FBEE64;
  --color-powder-blue: #dbebf5;
  --color-warm-cream: #f3e0c8;
  --color-snow-white: #ffffff;
  --color-graphite: #404040;
  --color-ash-gray: #e3e3e3;
  --color-fog: #eeeeee;
  --color-stone: #949596;

  /* Typography — Font Families */
  --font-dsc-specter: 'DSC Specter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-gelica: 'Gelica', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-gtstandard-m: 'GTStandard-M', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-font-awesome-5-pro: 'Font Awesome 5 Pro', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-caption: 12px;
  --leading-caption: 1.2;
  --tracking-caption: 0.04px;
  --text-body-sm: 14px;
  --leading-body-sm: 1.4;
  --tracking-body-sm: 0.025px;
  --text-body: 16px;
  --leading-body: 1.5;
  --tracking-body: 0.015px;
  --text-subheading: 18px;
  --leading-subheading: 1.3;
  --tracking-subheading: 0.012px;
  --text-heading-sm: 20px;
  --leading-heading-sm: 1.29;
  --tracking-heading-sm: 0.025px;
  --text-heading: 24px;
  --leading-heading: 1.25;
  --tracking-heading: 0.031px;
  --text-heading-lg: 32px;
  --leading-heading-lg: 1.19;
  --tracking-heading-lg: 0.038px;
  --text-display: 40px;
  --leading-display: 1.2;
  --tracking-display: 0.043px;
  --text-hero: 40px;
  --leading-hero: 0.98;
  --tracking-hero: 0px;

  /* Typography — Weights */
  --font-weight-light: 300;
  --font-weight-regular: 400;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;
  --font-weight-black: 900;

  /* Spacing */
  --spacing-5: 5px;
  --spacing-6: 6px;
  --spacing-7: 7px;
  --spacing-8: 8px;
  --spacing-10: 10px;
  --spacing-13: 13px;
  --spacing-15: 15px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-25: 25px;
  --spacing-28: 28px;
  --spacing-30: 30px;
  --spacing-40: 40px;
  --spacing-50: 50px;
  --spacing-60: 60px;
  --spacing-149: 149px;

  /* Layout */
  --page-max-width: 1200px;
  --section-gap: 30px;
  --card-padding: 25px;
  --element-gap: 10px;

  /* Border Radius */
  --radius-md: 4px;
  --radius-lg: 10px;

  /* Named Radii */
  --radius-nav: 4px;
  --radius-cards: 4px;
  --radius-badges: 4px;
  --radius-inputs: 4px;
  --radius-buttons: 4px;

  /* Surfaces */
  --surface-midnight-navy-canvas: #C4BBFE;
  --surface-wine-burgundy-band: #C5F273;
  --surface-powder-blue-card: #dbebf5;
  --surface-warm-cream-hero: #f3e0c8;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-midnight-navy: #C4BBFE;
  --color-flame-orange: #FE7E01;
  --color-primary-action: #171D67;
  --color-wine-burgundy: #C5F273;
  --color-deep-ink: #001233;
  --color-abyss-navy: #FBEE64;
  --color-powder-blue: #dbebf5;
  --color-warm-cream: #f3e0c8;
  --color-snow-white: #ffffff;
  --color-graphite: #404040;
  --color-ash-gray: #e3e3e3;
  --color-fog: #eeeeee;
  --color-stone: #949596;

  /* Typography */
  --font-dsc-specter: 'DSC Specter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-gelica: 'Gelica', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-gtstandard-m: 'GTStandard-M', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-font-awesome-5-pro: 'Font Awesome 5 Pro', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-caption: 12px;
  --leading-caption: 1.2;
  --tracking-caption: 0.04px;
  --text-body-sm: 14px;
  --leading-body-sm: 1.4;
  --tracking-body-sm: 0.025px;
  --text-body: 16px;
  --leading-body: 1.5;
  --tracking-body: 0.015px;
  --text-subheading: 18px;
  --leading-subheading: 1.3;
  --tracking-subheading: 0.012px;
  --text-heading-sm: 20px;
  --leading-heading-sm: 1.29;
  --tracking-heading-sm: 0.025px;
  --text-heading: 24px;
  --leading-heading: 1.25;
  --tracking-heading: 0.031px;
  --text-heading-lg: 32px;
  --leading-heading-lg: 1.19;
  --tracking-heading-lg: 0.038px;
  --text-display: 40px;
  --leading-display: 1.2;
  --tracking-display: 0.043px;
  --text-hero: 40px;
  --leading-hero: 0.98;
  --tracking-hero: 0px;

  /* Spacing */
  --spacing-5: 5px;
  --spacing-6: 6px;
  --spacing-7: 7px;
  --spacing-8: 8px;
  --spacing-10: 10px;
  --spacing-13: 13px;
  --spacing-15: 15px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-25: 25px;
  --spacing-28: 28px;
  --spacing-30: 30px;
  --spacing-40: 40px;
  --spacing-50: 50px;
  --spacing-60: 60px;
  --spacing-149: 149px;

  /* Border Radius */
  --radius-md: 4px;
  --radius-lg: 10px;
}
```
