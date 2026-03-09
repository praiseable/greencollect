# Chat Module – Two-Device Debug Test

## Debug logging enabled

Verbose logging is **on** for the chat module:

- **`kChatDebug`** in `apps/mobile/lib/services/chat_db_service.dart` – DB ops (insert, getMessages, updateMessageStatus).
- **`kChatProviderDebug`** in `apps/mobile/lib/core/providers/chat.provider.dart` – provider (load, send, sync, auto-reply).
- **`_kChatScreenDebug`** in `apps/mobile/lib/features/chat/chat_screen.dart` – UI (initState, build, sendMessage).

Log tags to grep in console/log files:

- `[ChatDB]` – SQLite
- `[ChatProvider]` – state/send/sync
- `[ChatScreen]` – screen lifecycle and send
- `[Chat]` – older/fallback messages
- `[App]` – chat DB init

## Two AVDs + two users

1. **Emulators**
   - **emulator-5554** – Medium_Phone_API_35  
   - **emulator-5556** – Pixel_9_API_35  

2. **Run app on both**
   - Terminal 1: `cd d:\gc-app\apps\mobile` then  
     `flutter run -d emulator-5554`  
   - Terminal 2: same directory then  
     `flutter run -d emulator-5556`  
   - Or use the background runs that were started; logs go to  
     `d:\gc-app\chat_debug_emulator1.log` and  
     `d:\gc-app\chat_debug_emulator2.log`.

3. **Logins (see TEST_USERS.md)**
   - **Device 1 (e.g. 5554):** e.g. Customer – phone `03001234567`, OTP `111111`.
   - **Device 2 (e.g. 5556):** e.g. Dealer – phone `03219876543`, OTP `222222`.

4. **Open chat on both**
   - From **Home** → tap a listing → tap **Message** (or open any path that pushes `/chat/<roomId>`).
   - Or navigate to a listing detail and use the message action to get the same `roomId` on both devices when testing the same listing/seller.

5. **Send messages**
   - On each device, type and send a few messages.
   - Watch the run terminal (or the `chat_debug_emulator*.log` files) for:
     - `[ChatDB] insertMessage` / `getMessages` / `updateMessageStatus`
     - `[ChatProvider] sendMessage` / `_trySendToServer` / `auto-reply`
     - `[ChatScreen] _sendMessage` / `build`

## Expected behavior (current design)

- Chat is **local-first**: each device has its own SQLite DB; there is **no** backend sync in the app yet.
- Messages do **not** cross devices; each device only sees its own messages + the **mock auto-reply** (“Thanks for the message! I’ll get back to you shortly.”) after ~2 seconds.
- So “two users chatting with each other” in the sense of real cross-device messaging will **not** work until the app uses the backend chat API and/or real-time channel.

## What to look for in logs (problems)

- **DB init:** `[ChatDB] FATAL` or `Database initialization failed` → SQLite/path issue.
- **Provider:** `_loadFromLocal ERROR` or `sendMessage FAILED` → persistence or state issue.
- **Send path:** `_trySendToServer FAILED` or message stuck in `pending`/`failed` → connectivity or sync logic.
- **Screen:** `_sendMessage skipped: no user` → auth not set; `Invalid chat room ID` or empty `roomId` → routing/args.

## Turning debug off

- In `chat_db_service.dart`: set `const bool kChatDebug = false;`
- In `chat.provider.dart`: set `const bool kChatProviderDebug = false;`
- In `chat_screen.dart`: set `static const bool _kChatScreenDebug = false;`
