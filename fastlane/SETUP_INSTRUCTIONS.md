# Fastlane Setup Instructions

## Quick Setup

### Step 1: Add Service Account Credentials

You need to create the `service_account.json` file in the `fastlane/` directory with your Google Play API credentials.

The file should be located at: `fastlane/service_account.json`

**Option A: Use the provided credentials**
If you have the service account JSON file (barber-app-template-0a7ff13027ab.json), copy its content to `fastlane/service_account.json`.

The file should have the following structure:
```json
{
  "type": "service_account",
  "project_id": "barber-app-template",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "fastlane-uploader@barber-app-template.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/fastlane-uploader%40barber-app-template.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

**Note**: Replace the "..." placeholders with the actual values from your service account JSON file.

**Option B: Copy from file**
```bash
cp /path/to/your/barber-app-template-0a7ff13027ab.json fastlane/service_account.json
```

### Step 2: Verify Setup

Check that all files are in place:
```bash
ls -la fastlane/
```

You should see:
- ✅ Appfile
- ✅ Fastfile
- ✅ service_account.json (or you need to create it)
- ✅ metadata/he-IL/
- ✅ README.md

### Step 3: Install Fastlane

```bash
gem install fastlane
```

Or if using bundler:
```bash
bundle install
```

### Step 4: Test the Configuration

```bash
fastlane android release
```

## Security Note

⚠️ **IMPORTANT**: The `service_account.json` file is automatically added to `.gitignore` to prevent accidentally committing sensitive credentials to the repository.

If you need to share credentials with your team:
1. Use a secure password manager
2. Use environment variables in CI/CD
3. Use secret management tools (GitHub Secrets, AWS Secrets Manager, etc.)

## Files Created

All the following files have been created and are ready to use:

1. **fastlane/Appfile** - App configuration with package name
2. **fastlane/Fastfile** - Deployment automation script
3. **fastlane/metadata/he-IL/title.txt** - App title (Hebrew)
4. **fastlane/metadata/he-IL/short_description.txt** - Short description (Hebrew)
5. **fastlane/metadata/he-IL/full_description.txt** - Full description (Hebrew)
6. **fastlane/metadata/he-IL/privacy_policy.txt** - Privacy policy (Hebrew)
7. **fastlane/metadata/he-IL/changelogs/whatsnew.txt** - Release changelog (Hebrew)
8. **fastlane/service_account.json.example** - Template for service account credentials

## Package Configuration

- **Package Name**: `com.orelaharon.rontugemanbarber`
- **Track**: Production
- **Language**: Hebrew (he-IL)

This matches the package name in your `app.json` file.
