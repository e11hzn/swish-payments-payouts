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

    // Generate signature: Sign the payload with SHA-512
    // createSign('sha512') internally hashes with SHA-512 then signs
    const payloadString = JSON.stringify(payload);

    const sign = crypto.createSign('sha512');
    sign.update(payloadString, 'utf8');
    sign.end();
    const signature = sign.sign({
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    }, 'base64');

    // Verify the signature before sending
    const certPath = path.resolve(process.cwd(), 'mss-client-cert/Swish_Merchant_TestSigningCertificate_1234679304.pem');
    const certificate = fs.readFileSync(certPath, 'utf8');

    const verify = crypto.createVerify('sha512');
    verify.update(payloadString, 'utf8');
    verify.end();
    const isValidSignature = verify.verify({
      key: certificate,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    }, signature, 'base64');

    if (!isValidSignature) {
      throw new Error('Signature verification failed - generated signature is invalid');
    }

    const requestBody = {
      payload,
      signature,
      callbackUrl,
    };

    // Log for debugging
    console.log('=== PAYOUT REQUEST DEBUG ===');
    console.log('Payload object:', JSON.stringify(payload, null, 2));
    console.log('Payload string for signing:', payloadString);
    console.log('Signature length:', signature.length);
    console.log('Full request body:', JSON.stringify(requestBody, null, 2));
    console.log('===========================');

    // Read the client certificate for TLS authentication (use regular merchant cert, not signing cert)
    const pfxPath = path.resolve(process.cwd(), 'mss-client-cert/Swish_Merchant_TestCertificate_1234679304.p12');
    const pfx = fs.readFileSync(pfxPath);

    // should not be needed but included here for now
    // const caCertPath = path.resolve(process.cwd(), 'mss-client-cert/Swish_TLS_RootCA.pem');
    // const caCert = fs.readFileSync(caCertPath);

    const agent = new https.Agent({
      // ca: caCert,
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

    return NextResponse.json(result);
  } catch (error) {
    console.error('Payout error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Something went wrong',
      details: error
    }, { status: 500 });
  }
}

