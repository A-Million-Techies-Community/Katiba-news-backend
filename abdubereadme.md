# Katiba-News - Frontend Architecture by Abdube

This file outlines the comprehensive frontend blueprint, development workflows and codebase architecture for Katiba-News — a professional digital newspaper platform dedicated to Kenyan civic, political and court reporting.

---

## Frontend Tech Stack
Framework: React.js (via Vite)
Language: TypeScript (`.ts`, `.tsx`)
Styling: Tailwind CSS (configured for utility-first, highly readable news typographic layouts)
Icons: Lucide React / React Icons
Package Manager: npm

---

## Getting Started (For Frontend Developers)

Follow these exact steps to set up the environment and spin up the frontend on your local development server.

### Prerequisites
Ensure you have **Node.js** (v18 or higher recommended) installed. Check your version with:
```bash
node -v
```

### Installation & Local Setup
1. Clone the repository:

   git clone  https://github.com/changemk/Katiba-News.git 
   
2. Navigate into the project directory:
   
   cd Katiba-News
   
3. install the project dependencies:

   npm install

4. Boot up the Vite local server:
   
   npm run dev
   
5. Open your browser and navigate to the local link displayed in your terminal (typically `http://localhost:5173`).

---

##  Project Directory Structure
The frontend architecture follows a highly modular layout optimized for TypeScript safety and component reusability:

text
├── src/
│   ├── assets/          # Shared media assets (logos, fallback news images, badges)
│   ├── components/      # Reusable presentational UI building blocks
│   │   ├── ui/          # Atomic components (Buttons, Inputs, Spinners)
│   │   ├── articles/    # Article cards, News feeds, Opinion grids
│   │   ├── navigation/  # Top navbar, Category menus, Footers
│   │   └── legal/       # Civic, Political, and Court document viewers
│   ├── hooks/           # Custom React hooks for global features
│   ├── pages/           # High-level views tied to core routes
│   │   ├── Home.tsx     # Main breaking news dashboard
│   │   ├── Politics.tsx # Kenyan national/regional political hub
│   │   ├── Courts.tsx   # Court proceedings and legal documents archive
│   │   └── Article.tsx  # Deep-dive clean typography article reading view
│   ├── types/           # Global TypeScript interfaces & type definitions (e.g., Article, User)
│   ├── utils/           # Helper functions (Date formatters, text truncators)
│   ├── App.tsx          # Core layout component and Routing config
│   ├── main.tsx         # Application entry point
│   └── index.css        # Tailwind directives and custom typography layer
├── tailwind.config.js   # Tailwind custom theme definitions
├── tsconfig.json        # TypeScript compiler strict configurations
└── package.json         # Node scripts and dependencies

---

##  Coding Standards & Workflows
Strict Types: Avoid using `any`. Define robust interfaces inside `src/types/` for data sets such as `Article`, `Reporter`, and `Comment`.

Mobile First:All interfaces must be completely responsive using Tailwind's breakpoint prefixes (`sm:`, `md:`, `lg:`) to cater to mobile-first news consumption patterns in Kenya.

Feature Branches: Do not push frontend experimental structural work directly to `main`. Create branches dedicated to your feature:
  
  git checkout -b feature/your-feature-name
  

---

##  Project Team
 Frontend Engineer:Abdube ([@dida234](https://github.com))
 Backend Engineer:Change ([](https://github.com))
 Designer: Mugai ([](https://github.com))

Project Collaborator: Alex ([](https://github.com))
