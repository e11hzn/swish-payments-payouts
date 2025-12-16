import { NextResponse } from 'next/server';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const requestURL = new URL(request.url);
    const { amount, message } = await request.json();

    const instructionUUID = uuidv4().replace(/-/g, '').toUpperCase();

    const callbackUrl = `https://${requestURL.host}/api/callback?id=${instructionUUID}`;

    // Ensure amount is formatted as string with 2 decimal places
    const formattedAmount = parseFloat(amount).toFixed(2);

    // Generate ISO 8601 timestamp without milliseconds
    const now = new Date();
    const instructionDate = now.toISOString().replace(/\.\d{3}Z$/, 'Z');

    const payload = {
      payoutInstructionUUID: instructionUUID,
      payerPaymentReference: 'payerRef',
      payerAlias: '1234679304',
      payeeAlias: '46768648198',
      payeeSSN: '196210123235',
      amount: formattedAmount,
      currency: 'SEK',
      payoutType: 'PAYOUT',
      message,
      instructionDate,
      signingCertificateSerialNumber: '4F24C03A0295A0B53596240EA8C0F430',
    };

    // Read the private key from the signing certificate
    const privateKeyPath = path.resolve(process.cwd(), 'mss-client-cert/Swish_Merchant_TestSigningCertificate_1234679304.key');
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

    // Generate signature
    const payloadString = JSON.stringify(payload);
    const payloadHashed = crypto.createHash('sha512').update(payloadString).digest();

    const sign = crypto.createSign('RSA-SHA512');
    sign.update(payloadHashed);
    sign.end();
    const signature = sign.sign(privateKey, 'base64');

    const requestBody = {
      payload,
      signature,
      callbackUrl,
    };

    // Read the client certificate for TLS authentication (use regular merchant cert, not signing cert)
    const pfxPath = path.resolve(process.cwd(), 'mss-client-cert/Swish_Merchant_TestCertificate_1234679304.p12');
    const pfx = fs.readFileSync(pfxPath);

    const agent = new https.Agent({
      passphrase: 'swish',
      pfx,
    });

    const options = {
      hostname: 'mss.cpc.getswish.net',
      port: 443,
      path: '/swish-cpcapi/api/v1/payouts/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      agent,
    };

    const swishRequest = new Promise<{ statusCode: number; data: string }>((resolve, reject) => {
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

      req.write(JSON.stringify(requestBody));
      req.end();
    });

    const result = await swishRequest;
    console.log(`Payout ${instructionUUID} created`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Payout error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Something went wrong',
      details: error
    }, { status: 500 });
  }
}

