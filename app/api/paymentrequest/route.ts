
import { NextResponse } from 'next/server';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const requestURL = new URL(request.url);
    const { amount, message, payeeAlias, payerAlias, payeePaymentReference } = await request.json();

    const instructionUUID = uuidv4().replace(/-/g, '').toUpperCase();
    
    const callbackUrl = `https://${requestURL.host}/api/callback?id=${instructionUUID}`;


    const payload = {
      payeePaymentReference: payeePaymentReference || '0123456789',
      callbackUrl,
      payerAlias: payerAlias || '4671234768',
      payeeAlias: payeeAlias || '1234679304',
      amount,
      currency: 'SEK',
      message,
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

    const swishRequest = new Promise((resolve, reject) => {
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

      req.write(JSON.stringify(payload));
      req.end();
    });

    const result = await swishRequest;

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
