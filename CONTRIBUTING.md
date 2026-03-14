# Contributing Guide - Rivvo

This project is proprietary. Contributions require explicit written permission from the owner.

## Ownership
- Owner: Oluwayemi Oyinlola Michael
- Portfolio: oyinlola.site
- Tech Firm: telente.site

## How to Request Permission
1. Contact the owner with a short description of your proposed change.
2. Wait for explicit written approval before starting any work.
3. Keep a record of the approval in your request or issue thread.

## Contribution Requirements
1. Keep changes focused and well-scoped.
2. Follow existing code style and conventions.
3. Update documentation when behavior changes.
4. Include tests where relevant.
5. Do not add secrets or credentials to commits.

## Development Workflow
1. Ensure the app runs locally (`npm run dev`).
2. Run checks before submitting:
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
3. If you touch backend code, also run:
   - `cd backend && npm test`

## Security Expectations
- Do not introduce insecure dependencies or patterns.
- Crypto and auth changes require careful review.
- Avoid logging secrets or sensitive data.

## Review Process
All contributions are reviewed by the owner. The owner may accept, request changes, or reject a contribution at their discretion.

## Unauthorized Contributions
Unapproved contributions may be closed without review.

## Submission Checklist
- [ ] Permission granted by owner
- [ ] Scope is clear and minimal
- [ ] Tests added or updated (if applicable)
- [ ] Documentation updated
- [ ] No secrets or credentials included

## Communication
All contribution discussions should remain professional and focused on the work.
