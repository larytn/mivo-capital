# Mivo Capital mobile app

The Android and iOS projects use Capacitor to preview the hosted Mivo Capital app. This lets the preview reflect a web deployment immediately.

## Native project commands

- `npm run mobile:sync` copies the mobile web shell and synchronizes native dependencies.
- `npm run mobile:assets` regenerates the Android and iOS icons and splash screens from the Mivo brand assets.
- `npm run mobile:open:android` opens the Android project in Android Studio.
- `npm run mobile:open:ios` opens the iOS project in Xcode on macOS.

Set `CAPACITOR_APP_URL` before syncing if the preview should use a different deployment. The default is the current Mivo Capital Vercel site.

## Store release status

The hosted website connection is for internal preview. Capacitor documents `server.url` as a live-reload setting that is not intended for production. Apple also requires an app experience that goes beyond repackaging a website. Before submitting to either store, the mobile app needs its own bundled mobile experience and store review preparation. Web deployments update the hosted preview; they do not replace a published iOS or Android binary.

Building and signing also require the Android SDK/Android Studio for Android and macOS with Xcode for iOS. Store uploads require the corresponding developer accounts and signing credentials.
