# Debugging the app on the emulator – where to see logs

## 1. Flutter run (recommended)

Run the app from the terminal so all `debugPrint` and print output appears there:

```bash
cd apps/mobile
flutter run -d emulator-5554 --flavor customer
```

- **Before submit:** When you tap "Post Listing", you’ll see:
  - `[CreateListing] POST listings body: {...}` – exact JSON sent to the API.
- **On error:** You’ll see:
  - `[CreateListing] Error: ...` – exception message.
  - `[CreateListing] API statusCode: 400` (or 401, 500, etc.).
  - `[API] Error 400 response: {...}` – raw error body from the server.

Keep this terminal open while you use the app; logs appear in real time.

## 2. Android logcat (if the app wasn’t started by `flutter run`)

If you installed the app from Android Studio or a built APK and didn’t run it with `flutter run`, use logcat:

```bash
# All Flutter / Dart logs
adb logcat -s flutter

# Or filter by your app’s tag (e.g. I/flutter)
adb logcat | findstr "flutter CreateListing API"
```

On macOS/Linux use `grep` instead of `findstr`.

## 3. DevTools (when running with `flutter run`)

When you run `flutter run`, the terminal prints a DevTools URL, for example:

```
The Flutter DevTools debugger and profiler on sdk gphone64 x86 64 is available at: http://127.0.0.1:9100?uri=...
```

Open that URL in a browser to use the **Logging** tab and see the same log messages there.

## 4. Create listing – what is logged in debug

In **debug mode** (e.g. `flutter run` without `--release`):

- Request: `[CreateListing] POST listings body: { title, categoryId, pricePaisa, quantity, unitId, cityName, ... }`
- On failure: `[CreateListing] Error: ...`, `[CreateListing] API statusCode: ...`, and `[API] Error 4xx/5xx response: ...`

Use these to see exactly what was sent and what the backend returned (status + body).
