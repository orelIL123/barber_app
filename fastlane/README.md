# Fastlane Setup - Ron Turgeman Barber App

This directory contains the Fastlane configuration for automated deployment to Google Play Store.

## 📋 Prerequisites

1. **Ruby** - Install Ruby (version 2.5 or higher)
2. **Fastlane** - Install via: `gem install fastlane -NV`
3. **Google Play API Credentials** - You need a service account JSON key

## 🔑 Setup Instructions

### 1. Create Google Play Service Account

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to **Settings** → **API access**
3. Create a new service account or use an existing one
4. Download the JSON key file
5. Save it as `service_account.json` in the `fastlane/` directory

**Important:** The `service_account.json` file is already added to `.gitignore` to prevent accidentally committing sensitive credentials.

### 2. Build Android App Bundle

Before running Fastlane, ensure you have built the Android app bundle:

```bash
# For Expo projects, you may need to prebuild first
npx expo prebuild

# Then build the release bundle
cd android
./gradlew bundleRelease
```

### 3. Run Fastlane

To deploy to Google Play Store:

```bash
cd fastlane
fastlane android release
```

## 📁 Directory Structure

```
fastlane/
├── Appfile                 # App identifier and service account configuration
├── Fastfile                # Lane definitions for deployment
├── service_account.json    # Google Play API credentials (not in git)
└── metadata/
    └── he-IL/              # Hebrew locale metadata
        ├── title.txt
        ├── short_description.txt
        ├── full_description.txt
        ├── privacy_policy.txt
        └── changelogs/
            └── whatsnew.txt
```

## 🚀 What This Does

The `release` lane will:
1. Build an Android App Bundle (AAB)
2. Upload to Google Play Store production track
3. Include all metadata (title, descriptions, privacy policy)
4. Include changelog/release notes

## 🔧 Configuration

- **Package Name:** `com.orelaharon.rontugemanbarber`
- **Default Platform:** Android
- **Output:** `android/app/build/outputs/bundle/release/app-release.aab`

## 📝 Updating Metadata

To update app store metadata, simply edit the files in `metadata/he-IL/`:
- `title.txt` - App title (max 50 characters)
- `short_description.txt` - Short description (max 80 characters)
- `full_description.txt` - Full description (max 4000 characters)
- `privacy_policy.txt` - Privacy policy URL or text
- `changelogs/whatsnew.txt` - What's new in this version (max 500 characters)

## 🛟 Troubleshooting

If you encounter issues:

1. **Check service account permissions** - Ensure the service account has the correct permissions in Google Play Console
2. **Verify package name** - Confirm it matches your app's package name
3. **Build the AAB first** - Make sure the Android App Bundle exists at the expected path
4. **Check Fastlane logs** - Run with `--verbose` flag for detailed logs

For more information, visit the [Fastlane documentation](https://docs.fastlane.tools/).
