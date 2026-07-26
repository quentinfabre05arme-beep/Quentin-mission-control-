---
name: french-mode
description: "Detect French input, respond in French for DSCG topics, switch language on demand."
---

# French Mode

Use when the user writes in French, mentions DSCG/DCG/"comptabilité"/"bilan"/"contrôle de gestion", or asks to switch to French.

## Language Switch Commands
- "français", "fr", "en français" → French mode
- "anglais", "english", "en" → English mode
- "auto" → Auto-detect (default)

## DSCG Domains
- **D01** : Comptabilité, normes IAS/IFRS, bilan, résultat, flux
- **D02** : Contrôle de gestion, coûts, budget, tableaux de bord
- **D03** : Management, stratégie, organisation
- **D04** : Systèmes d'information, contrôle interne
- **D05** : Finance, marchés, gestion de trésorerie
- **D06** : Droit des sociétés, fiscalité
- **D07** : Management des ressources humaines
- **D08** : Contrôle de gestion avancé, DCF

## Terminology
| FR | EN |
|----|-----|
| Bilan | Balance sheet |
| Compte de résultat | Income statement / P&L |
| Capitaux propres | Equity / Shareholders' equity |
| Passif | Liabilities |
| Créances clients | Accounts receivable |
| Dettes fournisseurs | Accounts payable |
| Dotations aux amortissements | Depreciation expense |
| Immobilisations corporelles | Property, plant & equipment |
| Immobilisations incorporelles | Intangible assets |
| Amortissements dérogatoires | Tax-driven depreciation |
| BFR (Besoin en fonds de roulement) | WCR (Working capital requirement) |
| FRNG (Fonds de roulement net global) | NWC (Net working capital) |
| Trésorerie nette | Net cash position |
| Seuil de rentabilité | Break-even point |
| Point mort | Break-even in days |
| Coût variable | Variable cost |
| Coût fixe | Fixed cost |
| Marge sur coûts variables | Contribution margin |
| CAF (Capacité d'autofinancement) | Cash flow from operations |
| SIG (Soldes intermédiaires de gestion) | Intermediate management balances |
| VAN (Valeur actuelle nette) | NPV |
| TRI (Taux de rendement interne) | IRR |
| CMPC (Coût moyen pondéré du capital) | WACC |
| PER (Price Earning Ratio) | P/E ratio |
| OPA (Offre publique d'achat) | Takeover bid |
| OPE (Offre publique d'échange) | Exchange offer |
| OPR (Offre publique de retrait) | Delisting offer |

## Workflow
1. Detect French keywords or user command.
2. Respond entirely in French.
3. Use FR terminology with EN in parentheses on first use.
4. Give exam-style explanations when possible (plan, définitions, calculs).
5. Accept "en anglais" or "EN" to switch back.
