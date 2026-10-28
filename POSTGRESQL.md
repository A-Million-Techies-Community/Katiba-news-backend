# Check PostgreSQL locally

Katiba News has separate frontend and backend repositories. Only the Django
backend connects to PostgreSQL.

## Production domain

The site's production domain will be `katibanews.co.ke`, with public URL
`https://katibanews.co.ke`.

Set these environment variables on the production backend:

```dotenv
ALLOWED_HOSTS=katibanews.co.ke
PUBLIC_SITE_URL=https://katibanews.co.ke
```

`PUBLIC_SITE_URL` is used for account and password reset links. Local development
continues to use localhost and `http://127.0.0.1:5173` by default.
These settings do not configure DNS, HTTPS, or hosting.

## Check the server

Run in a normal terminal:

```bash
pg_isready -h 127.0.0.1 -p 5432
```

`accepting connections` means the server is ready. This does not verify your
username or password. Test those separately:

```bash
psql -h 127.0.0.1 -U katiba_news -d katiba_news -W
```

Enter your database password when prompted. At `katiba_news=>`, run:

```sql
SELECT current_database(), current_user;
```

Exit with `\q`.

## Django configuration

`backend/.env` contains your private local settings and is ignored by Git.
Put your actual `DATABASE_URL` in `.env`.
Exported environment variables take precedence over this file. URL-encode special
characters in connection URL credentials.

`backend/config/settings.py` reads that URL to configure Django's database.
A successful psql login verifies PostgreSQL access; Django access still depends
on the credentials in its configuration.

The old SQLite database and export backups have been removed because their data
is no longer needed. PostgreSQL will start with fresh application data once
Django migrations are run.
