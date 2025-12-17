const https = require('https');
const fs = require('fs');
const path = require('path');

// Hardcoded payout ID
const PAYOUT_ID = '1F59EB1841FE4BDAB6C1BE6ECC1EE9BD';

async function checkPayout() {
  try {
    console.log(`Checking payout status for ID: ${PAYOUT_ID}\n`);

    const pfxPath = path.resolve(process.cwd(), 'mss-client-cert/Swish_Merchant_TestCertificate_1234679304.p12');
    const pfx = fs.readFileSync(pfxPath);

    const agent = new https.Agent({
      passphrase: 'swish',
      pfx,
    });

    const options = {
      hostname: 'mss.cpc.getswish.net',
      port: 443,
      path: `/swish-cpcapi/api/v1/payouts/${PAYOUT_ID}`,
      method: 'GET',
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
            resolve({ statusCode: res.statusCode, data });
          } else {
            reject(new Error(`Request failed with status code ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });

    console.log('Status Code:', result.statusCode);
    console.log('Response:');
    console.log(JSON.stringify(JSON.parse(result.data), null, 2));
  } catch (error) {
    console.error('Payout error:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
  }
}

checkPayout();
