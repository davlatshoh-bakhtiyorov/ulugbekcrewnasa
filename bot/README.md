# Neyra Telegram bot

`/start` sends a button that opens the Mini App (`WEBAPP_URL`); a shared location opens the Mini App at that
field (`?lat=&lon=`). It also sets the bot commands and the chat menu button on startup.

```
cp .env.example .env     # fill TELEGRAM_BOT_TOKEN (BotFather) and WEBAPP_URL (public HTTPS, ends with /web/)
npm run bot              # long polling; keep it running on any machine with internet
npm run bot -- --once    # only register commands + menu button, then exit
```

No dependencies (Node 18+, global fetch). Only one instance may poll at a time (Telegram returns 409 otherwise).
