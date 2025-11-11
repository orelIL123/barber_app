# Fastlane Setup for Ron Turgeman Barber App

## Directory Structure
```
fastlane/
├── Appfile                          # App configuration
├── Fastfile                         # Deployment automation
├── service_account.json             # Google Play API credentials
├── metadata/
│   └── he-IL/                       # Hebrew (Israel) metadata
│       ├── title.txt                # App title
│       ├── short_description.txt    # Short description
│       ├── full_description.txt     # Full description
│       ├── privacy_policy.txt       # Privacy policy
│       └── changelogs/
│           └── whatsnew.txt         # Changelog
```

## Configuration

### Package Name
- **Package**: `com.orelaharon.rontugemanbarber`
- Configured in: `Appfile` and `app.json`

### Service Account
The `service_account.json` file contains the Google Play API credentials for automated uploads.
- **Project ID**: barber-app-template
- **Service Account**: fastlane-uploader@barber-app-template.iam.gserviceaccount.com

**Setup Instructions:**
1. Copy the provided service account JSON file to `fastlane/service_account.json`
2. The file is gitignored for security - use `service_account.json.example` as a template
3. Or create the file with the following content:
   ```json
   {
     "type": "service_account",
     "project_id": "barber-app-template",
     "private_key_id": "0a7ff13027ab916df957a5f12262a92c27b5f454",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "fastlane-uploader@barber-app-template.iam.gserviceaccount.com",
     ...
   }
   ```

## Usage

### Prerequisites
1. Install fastlane:
   ```bash
   gem install fastlane
   ```
   Or use bundler:
   ```bash
   bundle install
   ```

2. Ensure you have built the release AAB:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

### Deploy to Google Play
Run the release lane:
```bash
fastlane android release
```

This will:
1. Build the release bundle (AAB)
2. Upload to Google Play Store (production track)
3. Upload metadata (Hebrew)
4. Upload screenshots (if available)
5. Upload changelog

## Metadata Files

All metadata is in Hebrew (he-IL):
- **Title**: Ron Turgeman – אפליקציית תורים לספרים
- **Short Description**: Barber appointment booking app
- **Full Description**: Complete app description with features
- **Privacy Policy**: Data handling and privacy information
- **Changelog**: Version release notes

## Notes
- The service account JSON file is included in the repository for deployment automation
- Ensure the Android build outputs the AAB to: `android/app/build/outputs/bundle/release/app-release.aab`
- All uploads go to the production track by default
