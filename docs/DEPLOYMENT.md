# Deploying Q-AI Hub (free hosting)

A setup that costs nothing and keeps the session cookies working:

```
browser ──► Vercel (frontend, static)  ──/api, /uploads──►  Render (API, Docker)  ──►  MySQL (Aiven)
            same domain for the browser: the HttpOnly SameSite=Strict cookies keep working
```

Vercel forwards `/api` and `/uploads` to the API, so the browser only ever talks to one domain.

## 1. Database: MySQL on Aiven

1. Create a free **MySQL** service on [aiven.io](https://aiven.io).
2. From its overview page, note the host, port, user (`avnadmin`) and password.
3. The JDBC URL is:
   `jdbc:mysql://<host>:<port>/defaultdb?sslMode=REQUIRED&serverTimezone=UTC`

Flyway creates every table on the first start (`backend/src/main/resources/db/migration`).

## 2. API: Docker web service on Render

1. On [render.com](https://render.com): **New → Web Service**, connect this repository.
2. Runtime **Docker**, root directory **`backend`** (it uses `backend/Dockerfile`), plan **Free**.
3. Environment variables:

   | Variable | Value |
   |---|---|
   | `SPRING_PROFILES_ACTIVE` | `prod` |
   | `DB_URL` | the JDBC URL above |
   | `DB_USERNAME` / `DB_PASSWORD` | Aiven user / password |
   | `JWT_SECRET` | output of `openssl rand -base64 64` |
   | `FRONTEND_URL` | `https://<your-app>.vercel.app` |
   | `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` | an SMTP account, e.g. Gmail with an [app password](https://myaccount.google.com/apppasswords) |
   | `API_DOCS_ENABLED` | `true` to publish Swagger UI (optional) |
   | `GEMINI_API_KEY` | optional, AI features |

   Render sets `PORT` itself and the API reads it.
4. Health check path: `/api/events`.

Free-plan limits: the service sleeps after 15 minutes without traffic (the first request then
takes about a minute), and its disk is not persistent, so uploaded files disappear on redeploy.

## 3. Frontend: Vercel

1. On [vercel.com](https://vercel.com): **Add New → Project**, import this repository.
2. Root directory **`frontend`**. Vercel detects Vite (`npm run build`, output `dist`).
3. Add `frontend/vercel.json`, with the Render URL of step 2, and push it:

   ```json
   {
     "rewrites": [
       { "source": "/api/:path*", "destination": "https://<your-api>.onrender.com/api/:path*" },
       { "source": "/uploads/:path*", "destination": "https://<your-api>.onrender.com/uploads/:path*" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

   The last rule lets React Router handle direct links such as `/events` or `/dashboard`.
4. Put the Vercel URL in `FRONTEND_URL` on Render if it changed.

## 4. Demo accounts

The `prod` profile creates no accounts, and the fixed login code is refused outside `dev`
(anyone could log in with it). Two ways to let reviewers in:

- **Real login codes (recommended)**: configure `MAIL_*`, register founder accounts through the
  site, and create the first administrator directly in the database.
  Visitors then sign up with their own email.
- **Demo instance**: run the API with `SPRING_PROFILES_ACTIVE=dev`, `COOKIE_SECURE=true`,
  `OTP_FIXED_ENABLED=true` and an `OTP_FIXED_CODE` published in the README. The demo accounts and
  event are created automatically, but **every visitor can log in to every account, including
  the admin**. Only use this with fictional data, and expect to reset the database from time to time.

## Checking the deployment

- `https://<your-app>.vercel.app/` loads the site and the events list (proves the `/api` rewrite).
- Logging in sets the `qa_access` cookie on the Vercel domain (browser dev tools → Application → Cookies).
- With `API_DOCS_ENABLED=true`: `https://<your-api>.onrender.com/swagger-ui.html`.
