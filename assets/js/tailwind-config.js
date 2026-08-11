/**
 * Tokens de DESIGN.md para el CDN de Tailwind.
 *
 * NO es un módulo ES: se carga con un <script src> normal (bloqueante) justo
 * después del CDN y antes de que Tailwind genere las clases, igual que cuando
 * vivía en línea dentro de <head>. Vive aquí para que todas las páginas del
 * sitio —index.html y aviso-de-privacidad/— compartan la misma paleta y la
 * misma escala tipográfica sin duplicarlas.
 */
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      "colors": {
              "surface-variant": "#e3e2e0",
              "secondary-fixed-dim": "#d7c4a1",
              "on-secondary-fixed-variant": "#52452a",
              "on-primary": "#ffffff",
              "surface-container-highest": "#e3e2e0",
              "surface": "#faf9f7",
              "on-secondary-fixed": "#241a04",
              "inverse-on-surface": "#f1f1ef",
              "surface-tint": "#5f5e60",
              "primary-container": "#2c2c2e",
              "tertiary-container": "#2b2c2e",
              "secondary": "#6b5d40",
              "tertiary-fixed": "#e3e2e4",
              "tertiary": "#171819",
              "outline-variant": "#c7c6ca",
              "error-container": "#ffdad6",
              "on-secondary-container": "#6f6144",
              "inverse-primary": "#c8c6c8",
              "on-error-container": "#93000a",
              "on-tertiary-fixed": "#1b1c1d",
              "secondary-fixed": "#f4e0bc",
              "on-tertiary-container": "#939395",
              "surface-dim": "#dadad8",
              "surface-container": "#efeeec",
              "tertiary-fixed-dim": "#c7c6c8",
              "on-surface-variant": "#46464a",
              "on-tertiary": "#ffffff",
              "on-surface": "#1a1c1b",
              "secondary-container": "#f1ddb9",
              "primary": "#171819",
              "surface-bright": "#faf9f7",
              "on-background": "#1a1c1b",
              "on-primary-fixed": "#1b1b1d",
              "surface-container-low": "#f4f3f1",
              "inverse-surface": "#2f3130",
              "on-tertiary-fixed-variant": "#464749",
              "on-primary-container": "#949395",
              "surface-container-lowest": "#ffffff",
              "background": "#faf9f7",
              "on-secondary": "#ffffff",
              "surface-container-high": "#e9e8e6",
              "primary-fixed": "#e4e2e4",
              "on-primary-fixed-variant": "#474649",
              "outline": "#77777b",
              "on-error": "#ffffff",
              "error": "#ba1a1a",
              "primary-fixed-dim": "#c8c6c8"
      },
      "borderRadius": {
              "DEFAULT": "0.25rem",
              "lg": "0.5rem",
              "xl": "0.75rem",
              "full": "9999px"
      },
      "spacing": {
              "stack-lg": "48px",
              "stack-md": "24px",
              "section-gap": "128px",
              "container-max": "1440px",
              "margin-edge": "64px",
              "gutter": "32px",
              "unit": "8px",
              "stack-sm": "12px"
      },
      "fontFamily": {
              "headline-lg": ["Noto Serif"],
              "body-md": ["Manrope"],
              "body-lg": ["Manrope"],
              "headline-md": ["Noto Serif"],
              "display-xl": ["Noto Serif"],
              "label-caps": ["Manrope"],
              "button": ["Manrope"]
      },
      "fontSize": {
              "headline-lg": ["40px", {"lineHeight": "1.2", "letterSpacing": "-0.01em", "fontWeight": "400"}],
              "body-md": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}],
              "body-lg": ["18px", {"lineHeight": "1.6", "letterSpacing": "0.01em", "fontWeight": "400"}],
              "headline-md": ["32px", {"lineHeight": "1.3", "fontWeight": "400"}],
              "display-xl": ["64px", {"lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "400"}],
              "label-caps": ["12px", {"lineHeight": "1.0", "letterSpacing": "0.15em", "fontWeight": "600"}],
              "button": ["14px", {"lineHeight": "1.0", "letterSpacing": "0.05em", "fontWeight": "500"}]
      }
    },
  },
};
