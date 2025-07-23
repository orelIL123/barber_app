# Firebase Functions for SMS Verification

This folder contains Firebase Functions that enable real SMS sending for the Barber App.

## Setup Instructions

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase Functions (if not already done)
```bash
firebase init functions
# Select your existing project: barber-app-template
# Choose JavaScript
# Install dependencies with npm
```

### 4. Install Dependencies
```bash
cd firebase_functions
npm install
```

### 5. Configure Twilio (for real SMS)
Sign up for Twilio account and get:
- Account SID
- Auth Token  
- Phone Number

Then set these as Firebase config:
```bash
firebase functions:config:set twilio.account_sid="your_account_sid"
firebase functions:config:set twilio.auth_token="your_auth_token" 
firebase functions:config:set twilio.phone_number="your_twilio_phone"
```

### 6. Deploy Functions
```bash
firebase deploy --only functions
```

### 7. Test the Function
The function will be available at:
```
https://us-central1-barber-app-template.cloudfunctions.net/sendSMS
```

## Function Endpoints

### sendSMS
**POST** `/sendSMS`
```json
{
  "phoneNumber": "+972501234567",
  "message": "קוד האימות שלך הוא: "
}
```

Response:
```json
{
  "success": true,
  "code": "123456",
  "verificationId": "twilio-1234567890",
  "message": "SMS sent successfully via Twilio"
}
```

### sendSMSAlternative
**POST** `/sendSMSAlternative`
Alternative SMS service endpoint (can be configured for different SMS providers)

### verifySMS
**POST** `/verifySMS`
Verify SMS codes (placeholder for advanced verification logic)

## Development Mode

If Twilio is not configured, the functions will run in development mode:
- Generate verification codes
- Log codes to Firebase Functions console
- Return codes in response for testing

## Monitoring

Check function logs:
```bash
firebase functions:log
```

## Cost Considerations

- Firebase Functions: Pay per invocation
- Twilio SMS: ~$0.0075 per SMS for Israel
- Consider implementing rate limiting for production

## Security Notes

- Functions include CORS headers for web requests
- Add authentication if needed for production
- Store sensitive config in Firebase Functions config, not code
- Consider implementing request validation and rate limiting

## Troubleshooting

1. **Function not deploying**: Check Firebase project permissions
2. **SMS not sending**: Verify Twilio configuration and account balance
3. **CORS errors**: Functions include CORS headers, check client request format
4. **Phone number format**: Ensure international format (+972...)

## Alternative SMS Services

Instead of Twilio, you can use:
- MessageBird
- SendGrid
- AWS SNS
- Any REST API SMS service

Update the function code accordingly.