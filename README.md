# AI Chat for an old iPad

Plain chat page (ES5 only) that talks to a free AI model through OpenRouter.

## Settings (environment variables)
- `API_KEY` (required): your OpenRouter key
- `MODEL` (optional): default `openrouter/free`
- `ACCESS_CODE` (optional): password for the page

## Run
Needs Node 18+.

    API_KEY=your_key npm start

Open `http://COMPUTER-IP:3000` on the iPad (same Wi-Fi).

## Render
Web Service, empty build command, start command `npm start`, add `API_KEY` under Environment.
Note: iOS 5.1.1 may fail to open HTTPS sites, so Render may not load on the first-gen iPad.
