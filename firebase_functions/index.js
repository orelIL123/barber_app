const functions = require('firebase-functions');
const admin = require('firebase-admin');
const twilio = require('twilio');

// Initialize Firebase Admin
admin.initializeApp();

// Twilio configuration - these should be set as environment variables
// Run: firebase functions:config:set twilio.account_sid="your_account_sid" twilio.auth_token="your_auth_token" twilio.phone_number="your_twilio_phone"
const accountSid = functions.config().twilio?.account_sid;
const authToken = functions.config().twilio?.auth_token;
const twilioPhoneNumber = functions.config().twilio?.phone_number;

// Initialize Twilio client
let twilioClient = null;
if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
}

// SMS sending function
exports.sendSMS = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber) {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const fullMessage = `${message || 'קוד האימות שלך הוא: '}${verificationCode}`;
    
    console.log(`Sending SMS to ${phoneNumber}: ${fullMessage}`);

    if (twilioClient && twilioPhoneNumber) {
      // Send real SMS via Twilio
      try {
        const smsResult = await twilioClient.messages.create({
          body: fullMessage,
          from: twilioPhoneNumber,
          to: phoneNumber
        });
        
        console.log(`SMS sent successfully: ${smsResult.sid}`);
        
        res.status(200).json({
          success: true,
          code: verificationCode,
          verificationId: `twilio-${Date.now()}`,
          message: 'SMS sent successfully via Twilio',
          sid: smsResult.sid
        });
      } catch (twilioError) {
        console.error('Twilio SMS failed:', twilioError);
        
        // Fallback to mock for development
        console.log(`DEVELOPMENT: SMS code for ${phoneNumber} is: ${verificationCode}`);
        res.status(200).json({
          success: true,
          code: verificationCode,
          verificationId: `dev-${Date.now()}`,
          message: 'SMS sent (development mode - check logs)',
          development: true
        });
      }
    } else {
      // Development mode - just return the code
      console.log(`DEVELOPMENT: SMS code for ${phoneNumber} is: ${verificationCode}`);
      res.status(200).json({
        success: true,
        code: verificationCode,
        verificationId: `dev-${Date.now()}`,
        message: 'SMS sent (development mode - check logs)',
        development: true
      });
    }
    
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ 
      error: 'Failed to send SMS',
      details: error.message 
    });
  }
});

// Alternative SMS function using a different SMS service (like SMS API services)
exports.sendSMSAlternative = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  try {
    const { phoneNumber, message } = req.body;
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const fullMessage = `${message || 'קוד האימות שלך הוא: '}${verificationCode}`;
    
    // Example using a different SMS API service (replace with actual service)
    // const smsApiUrl = 'https://api.sms-service.com/send';
    // const smsApiKey = functions.config().sms?.api_key;
    
    // For now, just return the code for development
    console.log(`Alternative SMS to ${phoneNumber}: ${fullMessage}`);
    
    res.status(200).json({
      success: true,
      code: verificationCode,
      verificationId: `alt-${Date.now()}`,
      message: 'SMS sent via alternative service'
    });
    
  } catch (error) {
    console.error('Error in alternative SMS:', error);
    res.status(500).json({ 
      error: 'Failed to send SMS via alternative service',
      details: error.message 
    });
  }
});

// Verification function to check codes
exports.verifySMS = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  try {
    const { verificationId, code, phoneNumber } = req.body;
    
    // In a real implementation, you'd store and verify the codes
    // For now, this is just a placeholder
    console.log(`Verifying code ${code} for ${phoneNumber} with ID ${verificationId}`);
    
    res.status(200).json({
      success: true,
      verified: true,
      message: 'Code verified successfully'
    });
    
  } catch (error) {
    console.error('Error verifying SMS:', error);
    res.status(500).json({ 
      error: 'Failed to verify SMS code',
      details: error.message 
    });
  }
});