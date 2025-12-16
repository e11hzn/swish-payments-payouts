import { NextResponse } from 'next/server';
import https from 'https';
import fs from 'fs';
import path from 'path';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }>}) {
  try {
    const payoutId = (await params).id;

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
      path: `/swish-cpcapi/api/v1/payouts/${payoutId}`,
      method: 'GET',
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