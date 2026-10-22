# CivicPulse

A multi-file civic issue reporting prototype built with Node.js, Express, HTML, CSS, and vanilla JavaScript. Includes login-first OTP flow, map-based issue browsing, issue detail maps, persistent report storage, emergency dial links, and a civic AI assistant endpoint.

## Requirements
- Node.js 18 or newer
- VS Code
- Internet access for Leaflet map tiles and CDN assets

## Run locally
1. Extract the project and open the folder in VS Code.
2. Open the integrated terminal in this folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Run `npm start`.
6. Open `http://localhost:3000`.

The app intentionally starts on login/signup. Dashboard API routes require a session.

## OTP modes
- **Demo mode** (`DEMO_MODE=true`): no SMS is sent; use `123456` after entering a valid E.164 phone number, e.g. `+919876543210`.
- **Real SMS OTP**: create a Twilio Verify service, fill `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID` in `.env`, then set `DEMO_MODE=false`. The provider sends the OTP by SMS to the phone number. The user receives it in their phone's Messages/SMS notifications; a website cannot silently inject messages into a phone's notification tray. Twilio may require account verification, billing, and destination permissions.
- Never commit `.env` or expose provider secrets. For production, use a persistent session store, HTTPS, CSRF protection, stronger validation, monitoring, and a privacy policy.

## AI assistant
Without `OPENAI_API_KEY`, the chat widget gives a built-in demo response. To enable AI responses, add the API key in `.env` and restart. The key stays on the server.

## Current prototype limitations
- Newly submitted reports are saved to `data/issues.json` and survive server restarts. For production, migrate to a database and add backups/access controls. Sample markers are clearly illustrative.
- Sample issue locations are illustrative, not live municipal data.
- Department contact numbers must be verified for the deployment city before launch.
- This prototype does not connect to municipal departments or automatically dispatch emergency services.
- Use HTTPS and a persistent session store before public deployment.

## GitHub
Create a new empty repository, then run:
```bash
git init
git add .
git commit -m "Build CivicPulse civic platform"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```
Do not upload `.env`.


## Important deployment notes
- OTP login is the account access flow; demo mode is not real authentication. Configure Twilio Verify and set `DEMO_MODE=false` before testing real SMS.
- Reports persist locally in `data/issues.json`; protect this file and back it up. This is not a substitute for a production database.
- The map uses OpenStreetMap tiles via Leaflet and requires internet access. Browser geolocation requires permission and a secure context (localhost or HTTPS).
- The included emergency numbers are general India examples; verify availability and jurisdiction before launch. Local municipal contacts are intentionally left blank rather than invented.
- The assistant uses an OpenAI API key only when configured. Never put API keys in frontend files or commit `.env`.

## Latest UI updates (v5)
- Sign-in now asks for the citizen's full name before requesting OTP; that name is used consistently in the dashboard profile chip and profile modal.
- A blue floating CivicPulse AI button sits at the bottom-left of the dashboard. Open it to chat without leaving the current page.
- The floating assistant and the full assistant page both include a microphone button. Voice typing uses the browser Web Speech API and requires microphone permission; use a current Chrome or Edge browser for best support. Speech recognition availability can vary by browser and region. Voice is transcribed to text before the user presses Send.


## OTP verification options
The sign-in screen offers two explicit modes:
- **Free demo OTP:** uses code `123456` locally and sends no SMS.
- **Real SMS OTP:** sends through Twilio Verify only when valid credentials are configured in `.env`. Trial availability and provider charges/limits may apply; selecting SMS does not make delivery free.

If SMS is not configured, the application displays a setup message instead of pretending an SMS was sent. Never commit `.env` or share your Twilio Auth Token.
