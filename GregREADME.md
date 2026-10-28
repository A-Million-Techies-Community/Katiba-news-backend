# 📰 KATIBA News

**A professional digital newspaper platform for Kenyan civic, political, and court reporting.**

KATIBA News is a full-stack news publishing application combining a fast, modern public-facing website with a powerful newsroom admin system — built for editors, journalists, and readers who want fast breaking news, in-depth political analysis, and accurate court reporting.

---

## 📌 Table of Contents

- [About the Project](#about-the-project)
- [Tech Stack](#tech-stack)
- [Core Features](#core-features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development Roadmap](#development-roadmap)
- [Team & Contribution Workflow](#team--contribution-workflow)
- [Branching Strategy](#branching-strategy)
- [Contributing](#contributing)
- [License](#license)

---

## About the Project

KATIBA News is not just a blog — it's designed as a digital newspaper with two connected systems:

1. **Public Website (Frontend)** — where readers browse, search, and read news.
2. **Newsroom Admin System (Backend)** — where editors and journalists manage content, media, and analytics.

The name "Katiba" (Swahili for *constitution*) reflects the platform's focus on civic affairs, governance, courts, and elections reporting.

---

## Tech Stack

| Layer            | Technology                         |
|-------------------|-------------------------------------|
| Frontend          | React                               |
| Backend           | Django + Django REST Framework      |
| Database          | PostgreSQL                          |
| Search (later)    | Elasticsearch                       |
| Web Server        | Nginx                               |
| App Server        | Gunicorn                            |
| Deployment        | Ubuntu Server                       |

---

## Core Features

### 🌍 Public Website

- **Homepage** — header with logo, date/time, search, login/register, newsletter subscribe; full nav menu (Home, Politics, Courts, Breaking News, Explainers, Opinion, Latest News, Contact Us); scrolling breaking-news ticker
- **Hero Section** — main headline story + 3–4 secondary stories
- **Latest News Feed** — article cards with image, category, headline, summary, author, date, read time
- **Category Pages** — Politics, Courts, Explainers, Breaking News, each with latest articles + "View More"
- **Trending News** — most read / most shared / popular this week
- **Article Page** — headline, author, date, featured image, full content, tags, social share, related articles, comments
- **Search** — by keyword, category, and date
- **Newsletter Signup**
- **Mobile-First Design** — fast loading, responsive, optimized for phone users

### 🛠 Newsroom Admin (Django Admin / DRF)

- **User Roles** — Super Admin, Editor, Journalist, Subscriber
- **Article Management** — create, edit, delete, schedule publishing, add images/videos/tags
- **Category Management**
- **Breaking News Control** — mark as breaking, push to ticker
- **Media Management** — images, videos, PDFs
- **Newsletter Management** — view subscribers, send newsletters
- **Analytics Dashboard** — total articles, views, subscribers, most-read news

### 🗄 Core Database Models

`Users`, `Articles`, `Categories`, `Tags`, `Comments`, `Subscribers`, `Views`, `BreakingNews`

### ✨ Stretch Features (future consideration)

Live updates page, court rulings archive, AI-generated article summaries, audio news, WhatsApp sharing, dark mode, push notifications, journalist profiles, election results page.

---

## Project Structure

\```
katiba-news/
├── backend/                 # Django project
│   ├── katiba/               # Project settings
│   ├── articles/             # Articles app (models, serializers, views)
│   ├── accounts/             # Users & roles
│   ├── newsletter/           # Subscribers & campaigns
│   ├── manage.py
│   └── requirements.txt
├── frontend/                 # React app
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/          # API calls to Django backend
│   │   └── App.js
│   └── package.json
├── .env                     # Local configuration (not committed)
├── .gitignore
└── README.md
\```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Git

### 1. Clone the repo

\```bash
git clone https://github.com/changemk/Katiba-News.git
cd Katiba-News
\```

### 2. Backend setup (Django)

\```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure your .env (see below), then:
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
\```

Backend API runs at `http://localhost:8000`.

### 3. Frontend setup (React)

\```bash
cd frontend
npm install
npm start
\```

Frontend runs at `http://localhost:3000`.

---

## Environment Variables

The backend loads `backend/.env`; exported variables take precedence. See
[PostgreSQL connection checks](POSTGRESQL.md) for server and login checks.

Create or edit `backend/.env` with your local configuration.

Set `DJANGO_SECRET_KEY` and `DATABASE_URL` in `.env`. Keep this file out of Git.
The backend uses PostgreSQL through `DATABASE_URL`.

---

## Development Roadmap

| Phase | Focus | Deliverables |
|-------|-------|---------------|
| **Phase 1** | Design | Homepage design, article page design, category structure |
| **Phase 2** | Backend Foundations | Django models, admin panel, authentication |
| **Phase 3** | Core Functionality | News feeds, search, newsletter |
| **Phase 4** | Deployment | Ubuntu + Nginx + Gunicorn + PostgreSQL production setup |

---

## Team & Contribution Workflow

1. Pick an issue/task from the project board.
2. Create a feature branch (see naming convention below).
3. Commit with clear, descriptive messages.
4. Open a Pull Request (PR) against `develop`.
5. Request at least one review before merging.
6. Squash-merge once approved.

## Branching Strategy

- `main` — production-ready code only
- `develop` — integration branch for active development
- `feature/<short-description>` — e.g. `feature/breaking-news-ticker`
- `fix/<short-description>` — e.g. `fix/article-page-images`

## Contributing

- Keep components/functions small and reusable.
- Follow the existing folder structure for new features.
- Write clear commit messages (e.g. `feat: add newsletter signup form`).
- Document any new environment variable names in this README without including secrets.
- Test locally before opening a PR.

---

## License

This project is for educational/group project purposes. License to be determined by the team.
