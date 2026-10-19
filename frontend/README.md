# Katiba News frontend

Run `npm install` and `npm run dev` from this directory. Start Django from the project root with `.venv/bin/python manage.py runserver`.

Readers browse the homepage, news, articles, and blogs without an account. Writers and editors can apply from their respective sign-in pages at `/writer/apply` and `/editor/apply`. Applying creates an inactive account with no staff grants; an administrator must approve it before sign-in.

The “Staff sign in” link opens `/workspace`, offering separate Writer (`/writer/login`) and Editor (`/editor/login`) sign-in pages. Administrators use `/administration/login` directly. Administrator access is not advertised on public pages. The server routes each signed-in account to its permitted workspace:

- Writer: write and submit news, articles, and blogs.
- Editor: review and publish submissions.
- Admin: create, assign, activate, and suspend writer and editor accounts at `/workspace/admin`.

Administrator tools require an active superuser account. The URL being unlisted does not replace server-side authorization. Django's `/admin/` remains available for authenticated administrators doing advanced maintenance.

Run `npm run lint` and `npm run build` to validate frontend changes.

Admins review Writer and Editor applications in **Staff applications**, with required feedback when rejecting. Decisions record the reviewer and time. Approved accounts get only the requested role and an email linking to the appropriate sign-in page. Existing accounts can still be managed in **Writers & editors**. Pending and rejected accounts cannot be activated through that account form.

The local Django configuration uses the console email backend, so decision emails appear in the backend terminal rather than an inbox.
