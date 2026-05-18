# Design Reference

Dead simple. Browser-default buttons. Minimal inline styles for layout only. No colors, no theming.

## Rules

- **Buttons**: no style prop — plain browser default
- **Cards/sections**: `{ border: "1px solid #ddd", padding: 12, marginBottom: 12 }`
- **Inputs**: `{ flex: 1, padding: 8 }` for flex inputs, `{ padding: 6 }` for selects
- **Textarea**: `{ display: "block", padding: 6, width: "100%", boxSizing: "border-box" }`
- **Container**: `{ maxWidth: 700, margin: "40px auto", fontFamily: "Arial" }`
- **Errors**: `{ color: "red" }` only
- No CSS variables in component code
- No background colors, border-radius, shadows, or accent colors
