---
name: Tres Marías Architectural Identity
colors:
  surface: '#faf9f7'
  surface-dim: '#dadad8'
  surface-bright: '#faf9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f1'
  surface-container: '#efeeec'
  surface-container-high: '#e9e8e6'
  surface-container-highest: '#e3e2e0'
  on-surface: '#1a1c1b'
  on-surface-variant: '#46464a'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1ef'
  outline: '#77777b'
  outline-variant: '#c7c6ca'
  surface-tint: '#5f5e60'
  primary: '#171819'
  on-primary: '#ffffff'
  primary-container: '#2c2c2e'
  on-primary-container: '#949395'
  inverse-primary: '#c8c6c8'
  secondary: '#6b5d40'
  on-secondary: '#ffffff'
  secondary-container: '#f1ddb9'
  on-secondary-container: '#6f6144'
  tertiary: '#171819'
  on-tertiary: '#ffffff'
  tertiary-container: '#2b2c2e'
  on-tertiary-container: '#939395'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e4e2e4'
  primary-fixed-dim: '#c8c6c8'
  on-primary-fixed: '#1b1b1d'
  on-primary-fixed-variant: '#474649'
  secondary-fixed: '#f4e0bc'
  secondary-fixed-dim: '#d7c4a1'
  on-secondary-fixed: '#241a04'
  on-secondary-fixed-variant: '#52452a'
  tertiary-fixed: '#e3e2e4'
  tertiary-fixed-dim: '#c7c6c8'
  on-tertiary-fixed: '#1b1c1d'
  on-tertiary-fixed-variant: '#464749'
  background: '#faf9f7'
  on-background: '#1a1c1b'
  surface-variant: '#e3e2e0'
typography:
  display-xl:
    fontFamily: notoSerif
    fontSize: 64px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: notoSerif
    fontSize: 40px
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: notoSerif
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.3'
  body-lg:
    fontFamily: manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  body-md:
    fontFamily: manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.15em
  button:
    fontFamily: manrope
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
spacing:
  unit: 8px
  container-max: 1440px
  gutter: 32px
  margin-edge: 64px
  section-gap: 128px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style

The design system is rooted in the concept of "Architectural Silence"—a philosophy where the interface recedes to allow the photography of luxury estates to command the user's attention. It targets high-net-worth individuals who value discretion, permanence, and meticulous craftsmanship.

The aesthetic follows a **High-End Minimalist** approach. This is characterized by generous negative space, a restricted earthy palette, and a rigorous adherence to a grid that mirrors modern architectural blueprints. The emotional response should be one of profound trust, exclusivity, and calm. By eliminating decorative "noise," the design system communicates that the properties themselves are the primary focus, establishing a sophisticated atmosphere reminiscent of high-end editorial gallery spaces.

## Colors

The palette is derived from natural, raw materials used in premium construction: stone, earth, and metal. 

- **Charcoal (#2C2C2E):** Used for primary typography and structural elements. It provides a softer, more sophisticated contrast than pure black.
- **Slate (#707072):** Utilized for secondary text and subtle UI borders, offering a cool, professional tone.
- **Sand (#C5B391 / #D9CDB8):** Acts as the primary accent color. It represents warmth and luxury, used sparingly for call-to-action elements, active states, and highlights.
- **Neutral Earth (#F9F8F6):** A warm-toned off-white used for backgrounds and section layering to avoid the clinical feel of pure white and provide a sense of "gallery" parchment.

## Typography

This design system employs a classic typographic contrast to establish hierarchy and authority.

- **Headings (notoSerif):** Chosen for its editorial elegance and corporate weight. Large headlines should use ample leading and slight negative letter-spacing to feel tight and custom-designed.
- **Body (manrope):** A highly legible, modern sans-serif that balances the traditionalism of the serif headings. It ensures that technical property data and descriptions remain professional and accessible.
- **Micro-copy & Labels:** Use **manrope** in all-caps with generous letter-spacing (tracking) to denote categories, status labels, or small captions, adding to the high-fashion editorial feel.

## Layout & Spacing

The layout philosophy is defined by "The Luxury Gap"—the intentional use of significant whitespace to suggest that the content is so valuable it does not need to compete for space.

- **Grid Model:** A 12-column fixed grid with a maximum width of 1440px. Gutters are wide (32px) to maintain a feeling of breathability.
- **Rhythm:** A strictly vertical rhythm based on 8px increments. 
- **Sectioning:** Major content sections are separated by large gaps (128px) to encourage a slow, deliberate scrolling experience.
- **Alignment:** Strong left-alignment for text blocks mimics professional architectural portfolios. Images should often break the grid or occupy full-bleed spans to create visual impact.

## Elevation & Depth

This design system avoids heavy shadows and traditional skeuomorphism in favor of **Tonal Layering** and **Low-Contrast Outlines**.

- **Surface Tiers:** Hierarchy is created by placing white "cards" or content blocks over a `Neutral Earth (#F9F8F6)` background.
- **Depth:** Instead of shadows, use thin (1px) borders in `Slate (#707072)` at low opacity (10-15%) to define boundaries. 
- **Photography Depth:** Depth is primarily introduced through high-quality architectural photography featuring natural light and shadows, rather than UI-generated effects.
- **Interactions:** Subtle backdrop blurs (Glassmorphism) may be used exclusively for navigation overlays or mobile menus to maintain context of the property photography behind the interface.

## Shapes

The shape language is strictly **Sharp (0px)**. 

In luxury real estate, precision is paramount. Sharp corners evoke the structural integrity of modern architecture and the clean lines of high-end blueprints. There are no rounded corners in this design system—buttons, input fields, and image containers all feature 90-degree angles. This rigidity projects a sense of corporate stability and timelessness.

## Components

- **Buttons:** Primary buttons are solid `Charcoal` with white text, or `Sand` for key conversions. They are rectangular (0px radius) with generous internal padding (16px 32px). Secondary buttons use a ghost style with a 1px `Slate` border.
- **Input Fields:** Minimalist design featuring only a bottom border in `Slate`. Labels use the `label-caps` typography style and sit above the line.
- **Cards:** Property cards are borderless with typography placed directly on the `Neutral Earth` surface or white background. Information is organized with high-contrast hierarchy (Price in Serif, Details in Sans-serif).
- **Chips/Tags:** Used for "Available" or "Sold" status. Rectangular boxes with 1px borders, using the `label-caps` font style.
- **Property Specs:** A custom component featuring a grid of icons (thin line-weight, Charcoal) paired with clean sans-serif data points (e.g., "4 Beds", "5,000 Sq Ft").
- **Image Galleries:** Large-scale, masonry or full-bleed carousels with minimal UI controls—arrows should be simple thin lines without backgrounds.