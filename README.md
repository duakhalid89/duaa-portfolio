# Duaa Khalid — Interactive 3D Portfolio

A 3D web portfolio for Duaa Khalid (Game Developer, Unity & Unreal) with a custom Blender avatar, an After Effects
promo video, a RAG-based AI chatbot and a working contact form.

Course: Web 3D Programming (CT-401) · Duaa Khalid (GA-23303) · Course Advisor: Miss Saadia Arshad

- **Live site:** https://duaa-portfolio-nu.vercel.app
- **Project report (PDF):** [docs/Duaa_Khalid_Portfolio_Report.pdf](docs/Duaa_Khalid_Portfolio_Report.pdf)
- **Screenshots of every module:** [docs/screenshots/](docs/screenshots/) (including the email delivery proof)
- **Blender source and model:** [blender/avatar.blend](blender/avatar.blend), [public/models/avatar.glb](public/models/avatar.glb)
- **After Effects project and video:** [after-effects/Duaa_Promo.aep](after-effects/Duaa_Promo.aep),
  [after-effects/render/Duaa_Khalid_Promo.mp4](after-effects/render/Duaa_Khalid_Promo.mp4)

## Features

| Module | What is included |
|---|---|
| 3D portfolio | React Three Fiber hero scene, About, Promo video, Skills, Projects & achievements (level-select map + grid), Education & experience, Contact, plus a walkable 3D studio room. Scroll reveals, smooth scrolling, a 3D "universe" per project category, responsive down to phone width. |
| 3D avatar | `public/models/avatar.glb` (rigged, exported from Blender). Blender clips: Idle, Talk, Think, Shrug, Gamer, Victory, Point. Looks toward the mouse, waves, picks up the skill icons, scarf colour picker, corner companion and guided tour. |
| Promo video | 35 s After Effects promo (`after-effects/Duaa_Promo.aep`, render in `after-effects/render/`). Web copy `public/videos/promo.mp4` in a cinema player with chapters and theatre mode. |
| RAG chatbot | Floating chat window. Answers only from Duaa's CV and portfolio data, cites its sources, supports voice input, understands English and Urdu questions and always answers in English. |
| Contact system | Name / email / subject / message form, validated in the browser and on the server, sent by SMTP. Spam protection and rate limiting. |

Extra credit: interactive 3D objects that respond to the mouse, dark/light theme, voice input and spoken answers,
multilingual chatbot, avatar gestures, project filter + search, source citations, accessibility (ARIA labels, keyboard
focus, reduced motion). Fun extras: a walkable 3D studio room whose computer opens three
mini-games (Code Catcher, Guess the Game, Skill Stack), a photo booth, achievements, a time-of-day sky and an RPG-style chat.
Only one window (chat, games, booth, room, project world, theatre mode) is open at a time.

## Tech stack

- **Frontend:** React 19, Vite, Three.js, React Three Fiber, Drei, postprocessing, GSAP, Lenis
- **Backend:** Vercel serverless functions (Node.js) in `api/`
- **AI:** Google Gemini (`gemini-flash-latest`) for answers and `gemini-embedding-001` for embeddings; Anthropic Claude supported as an alternative
- **Email:** Nodemailer over SMTP, input validation with Zod

## Project structure

```
api/
  chat.js            RAG chatbot endpoint (retrieve -> prompt -> Claude)
  contact.js         Contact form endpoint (validate -> send email)
  _lib/rag.js        Tokenizer, embeddings, cosine search
  _lib/limit.js      Rate limiter and JSON body reader
  _data/index.json   Generated vector index (built by scripts/build-index.js)
knowledge/           CV text files used as chatbot documents
public/              Avatar model, videos, posters, CV PDFs, profile photo
scripts/
  build-index.js     Builds the RAG vector index
  dev-api.js         Runs the api/ functions locally on port 3001
  test-rag.mjs       Prints retrieval results for sample questions
src/
  App.jsx            Layout, navigation, theme, loader
  components/        Hero (3D avatar scene), Universe (project 3D view), Sections, Chatbot
  data/              Profile, skills, education, experience and project content
```

## Setup and running locally

Requirements: Node.js 20 or newer.

```bash
npm install
```

```bash
cp .env.example .env
```

Fill in `.env` (see the next section), then run the API and the website in two terminals:

```bash
npm run dev:api
```

```bash
npm run dev
```

Open http://localhost:5173. Vite forwards `/api/*` requests to the local API on port 3001.

## Environment variables

Secrets are only read from environment variables and are never sent to the browser. `.env` is in `.gitignore`.

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google Gemini key (free at aistudio.google.com/apikey). Used for the chatbot's answers and embeddings |
| `GEMINI_MODEL` | Optional; defaults to `gemini-flash-latest` |
| `ANTHROPIC_API_KEY`, `CHAT_MODEL` | Optional alternative LLM (Claude), used only when `GEMINI_API_KEY` is empty |
| `EMBEDDINGS_PROVIDER` | Optional: `gemini`, `voyage`, `openai` or `local`. Defaults to `gemini` when a Gemini key is set |
| `EMBEDDINGS_API_KEY` | Key for a non-Gemini embeddings provider |
| `SMTP_HOST`, `SMTP_PORT` | Mail server, e.g. `smtp.gmail.com` and `465` |
| `SMTP_USER`, `SMTP_PASS` | Mail account; for Gmail use an App Password, not the account password |
| `CONTACT_TO` | Address that receives contact-form messages |

## How the RAG chatbot works

1. **Collect documents** — `scripts/build-index.js` gathers the CV text in `knowledge/` and the structured data in
   `src/data/` (profile, skills, education, experience, achievements, certifications, each project). Each document
   is tagged with the page section it belongs to so answers can link back to it. Phone numbers are removed.
2. **Chunk** — documents are split on paragraphs and merged into ~700-character chunks with ~100 characters of
   overlap, so related facts stay together.
3. **Embed** — each chunk becomes a 768-dimension vector from Google's `gemini-embedding-001` model (one batch
   request). Without a key, a local TF-IDF hashed vector (words + word pairs) is used as a fallback.
4. **Store** — vectors and text are saved in `api/_data/index.json`, a small vector index shipped with the function.
   It is rebuilt on every `npm run build` (or `npm run index`).
5. **Retrieve** — `api/chat.js` embeds the visitor's question the same way and takes the 5 most similar chunks by
   cosine similarity.
6. **Generate** — the chunks are numbered and given to Gemini with instructions to answer only from them, cite
   them as [1], [2], always answer in English, and say "I don't have that information" instead of guessing.
7. **Show** — the chat window displays the answer and clickable source links that scroll to the matching section.

Test retrieval without calling the LLM:

```bash
node scripts/test-rag.mjs
```

## Contact form security

- Validation in the browser (`src/components/Sections.jsx`) and again on the server with Zod (`api/contact.js`).
- Hidden honeypot field: bots that fill it get a fake success and no email is sent.
- Rate limit of 3 messages per IP every 10 minutes; request bodies are capped at 20 KB.
- User input is HTML-escaped in the email body and newlines are stripped from header fields.
- The visitor's address is used as `Reply-To`, never as the sender, so mail is not rejected as spoofed.

## Deployment (Vercel)

1. Push this repository to GitHub.
2. In Vercel: **Add New → Project**, import the repository. The settings come from `vercel.json`
   (build `npm run build`, output `dist`, functions in `api/`).
3. Under **Settings → Environment Variables**, add the variables from the table above.
4. Deploy, then put the URL at the top of this README.

## Video and 3D source files

- Promo video: `after-effects/Duaa_Promo.aep` (Adobe After Effects 2026). Footage, images and audio are in
  `after-effects/assets/` (keep the folder next to the .aep so the links resolve); the scenes were laid out with
  `after-effects/build/build_promo.jsx`. Final render: `after-effects/render/Duaa_Khalid_Promo.mp4` (1080p, 35 s).
  The website plays a 720p copy, `public/videos/promo.mp4`.
  Music: "Voxel Revolution" by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0, credited in the video and
  on the site.

- Avatar: `public/models/avatar.glb`, built in Blender 5.2 from `blender/avatar.blend`.
  `blender/build_avatar.py` documents every step: it imports the rigged base character
  (`blender/avatar_base.glb`), tunes the fabric materials, poses her in a relaxed contrapposto stance, keys a
  4-second looping `Idle` animation (breathing, weight shift, head and arm sway), sets up a camera, three-point
  lighting and floor, saves the `.blend` and exports the web GLB. To rebuild:

  ```bash
  blender -b --factory-startup --python blender/build_avatar.py -- blender/avatar_base.glb --export
  ```

## Report

The PDF report is generated from code so it can be rebuilt after changes:

```bash
python docs/report/diagrams.py
python docs/report/code_figures.py
python docs/report/make_report.py
```
