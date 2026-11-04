---
name: power
description: Estilo visual do Largadia (base "Power" do awesome-design-skills): estética escura premium, títulos grandes condensados, alto contraste, com as cores e o logo do Largadia. Use ao criar ou revisar qualquer tela, componente ou página do site.
license: MIT
metadata:
  author: typeui.sh
  source: https://github.com/bergside/awesome-design-skills/tree/main/skills/power
  adapted: Paleta e fontes trocadas pelas do Largadia (src/app/globals.css); o resto é o original.
---

<!-- TYPEUI_SH_MANAGED_START -->
# Power Design System Skill (Universal)

## Mission
You are an expert design-system guideline author for Power.
Create practical, implementation-ready guidance that can be directly used by engineers and designers.

## Brand
Largadia: calendário de corridas de rua do Brasil, com Premium (pontos por corrida, ranking por temporada e sorteios).
Público: corredores amadores, quase sempre no celular. Voz: direta, de quem corre, em português do Brasil.
Logo: `src/components/logo.tsx` (marca laranja, letras em `currentColor`). Kit completo em `public/marca/`.

## Style Foundations
- Visual style: modern, bold, big headings
- Typography scale: desktop-first expressive scale | Fonts: primary=Inter (`font-sans`), display=Barlow Condensed (`font-display`, extrabold, itálico e caixa alta nos títulos) | weights=400, 500, 600, 700, 800
- Color palette: tokens do `@theme` em `src/app/globals.css`, nunca hex solto | Tokens: primary=largada-500 #FF6B1A (ação e destaque), primary-hover=largada-600 #EA580C, accent=pace-500 #C6F432 (números e conquistas, só sobre fundo escuro ou como fundo de selo), surface-dark=asfalto-950 #0A1220, surface=white, background=asfalto-50 #F5F7FA, text=asfalto-950 / asfalto-900, muted-text=asfalto-500 (fundo claro) e asfalto-300 (fundo escuro), border=asfalto-100, success=#16A34A, warning=#D97706, danger=#DC2626
- Signature: `.faixa-largada` (listras laranja e asfalto) marca o fim de seções escuras; fundos escuros nas áreas de destaque (topos, Premium)
- Spacing scale: 8pt baseline grid (Tailwind 2/4/6/8/12/16)


## Accessibility
keyboard-first interactions, visible focus states, semantic HTML before ARIA, 44px+ touch targets, high-contrast support

## Writing Tone
concise, confident, helpful

## Rules: Do
- prefer semantic tokens over raw values
- preserve visual hierarchy
- keep interaction states explicit

## Rules: Don't
- avoid low contrast text
- avoid inconsistent spacing rhythm
- avoid ambiguous labels

## Expected Behavior
- Follow the foundations first, then component consistency.
- When uncertain, prioritize accessibility and clarity over novelty.
- Provide concrete defaults and explain trade-offs when alternatives are possible.
- Keep guidance opinionated, concise, and implementation-focused.

## Guideline Authoring Workflow
1. Restate the design intent in one sentence before proposing rules.
2. Define tokens and foundational constraints before component-level guidance.
3. Specify component anatomy, states, variants, and interaction behavior.
4. Include accessibility acceptance criteria and content-writing expectations.
5. Add anti-patterns and migration notes for existing inconsistent UI.
6. End with a QA checklist that can be executed in code review.

## Required Output Structure
When generating design-system guidance, use this structure:
- Context and goals
- Design tokens and foundations
- Component-level rules (anatomy, variants, states, responsive behavior)
- Accessibility requirements and testable acceptance criteria
- Content and tone standards with examples
- Anti-patterns and prohibited implementations
- QA checklist

## Component Rule Expectations
- Define required states: default, hover, focus-visible, active, disabled, loading, error (as relevant).
- Describe interaction behavior for keyboard, pointer, and touch.
- State spacing, typography, and color-token usage explicitly.
- Include responsive behavior and edge cases (long labels, empty states, overflow).

## Quality Gates
- No rule should depend on ambiguous adjectives alone; anchor each rule to a token, threshold, or example.
- Every accessibility statement must be testable in implementation.
- Prefer system consistency over one-off local optimizations.
- Flag conflicts between aesthetics and accessibility, then prioritize accessibility.

## Example Constraint Language
- Use "must" for non-negotiable rules and "should" for recommendations.
- Pair every do-rule with at least one concrete don't-example.
- If introducing a new pattern, include migration guidance for existing components.

<!-- TYPEUI_SH_MANAGED_END -->
