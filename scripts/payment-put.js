// Configuration - Edit these values as needed
const AMOUNT = '100';
const MESSAGE = 'Test payment';

// Script starts here
const https = require('https');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function createPaymentRequest() {
  try {
    const instructionUUID = uuidv4().replace(/-/g, '').toUpperCase();

    const callbackUrl = `https://your-domain.com/api/callback?id=${instructionUUID}`;

    const payload = {
      amount: AMOUNT,
      callbackUrl,
      currency: 'SEK',
      message: MESSAGE,
      payeeAlias: '1234679304',
      payeePaymentReference: '0123456789',
      payerAlias: '4671234768',
    };

    const pfxPath = path.resolve(process.cwd(), 'mss-client-cert/Swish_Merchant_TestCertificate_1234679304.p12');
    const pfx = fs.readFileSync(pfxPath);

    const agent = new https.Agent({
      pfx,
      passphrase: 'swish',
    });

    const options = {
      hostname: 'mss.cpc.getswish.net',
      port: 443,
      path: `/swish-cpcapi/api/v2/paymentrequests/${instructionUUID}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      agent,
    };

    const result = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data, instructionUUID });
          } else {
            reject(new Error(`Request failed with status code ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(JSON.stringify(payload));
      req.end();
    });

    console.log('Payment request created successfully!');
    console.log('Status Code:', result.statusCode);
    console.log('Instruction UUID:', result.instructionUUID);
    console.log('Response:', result.data || 'No response body');

    return result;
  } catch (error) {
    console.error('Error creating payment request:', error.message);
    process.exit(1);
  }
}

// Run the script
createPaymentRequest();
