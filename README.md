# Sam Oyus Foundation — International Partnership Portal

## What this is
A full-stack starter portal, not just a static landing page. It includes:

1. Sponsor/partner registration and login
2. SQLite-backed sponsor accounts
3. Intervention/project database
4. Search and sector filtering
5. Downloadable project concept notes
6. Partnership/application submission
7. Optional supporting-document upload
8. Sponsor dashboard with application history
9. Grant/opportunity database
10. Opportunity-alert subscriptions
11. Responsive public website
12. Foundation logo and programme positioning based on the supplied SOF research

## Run locally

Requirements:
- Node.js 18+ recommended
- npm

Then:

    npm install
    npm start

Open:

    http://localhost:3000

For development:

    npm run dev

## Database
The SQLite database is automatically created at:

    data/portal.db

The first server start seeds the five SOF intervention concepts.

## Production requirements
This is a production-oriented starter, but it must be hardened and connected to real operational systems before public launch:

- Set a strong SESSION_SECRET environment variable.
- Use HTTPS and secure cookies.
- Move sessions to a persistent server-side session store for multi-instance hosting.
- Add CSRF protection and rate limiting.
- Add email verification and password-reset flows.
- Add admin accounts and an admin console for approving projects, opportunities and applications.
- Add role-based access control for SOF staff/reviewers.
- Scan uploaded files for malware and restrict MIME types.
- Store uploaded documents in secure object storage rather than local disk.
- Add audit logs for application and funding decisions.
- Add privacy policy, terms, consent and data-retention rules.
- Add safeguarding, anti-fraud, anti-corruption and conflict-of-interest workflows.
- Verify CAC, governance, bank and donor documentation before institutional fundraising.
- Connect the partnership form and notifications to the Foundation's verified email/CRM.
- Add payment/grant-management integrations only after legal and financial review.

## International funding opportunities
The portal is designed so SOF staff can populate and update verified opportunities. It intentionally does not invent current deadlines or eligibility. Opportunity entries should be sourced from official funder pages and reviewed before publication.

## Recommended next development
1. Admin dashboard
2. Email notifications
3. Donor KYC/organisation verification
4. Proposal versioning
5. Grant application workflow
6. M&E / impact reporting
7. Donor document room
8. Partner CRM
9. Opportunity matching engine
10. Online donation/grant pledge workflow
