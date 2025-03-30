import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { spawn } from 'child_process';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sheetUrl, emails } = body;

  const validateScript = path.resolve(process.cwd(), 'lib', 'validate-and-run.js');

  const envVars = {
    ...process.env,
    SHEET_URL: sheetUrl,
    EMAILS: emails.join(','),
  };

  return new Promise((resolve) => {
    const validateProc = spawn('node', [validateScript], { env: envVars });

    validateProc.stdout.on('data', (data) => {
      console.log('[validate-and-run.js]', data.toString());
    });

    validateProc.stderr.on('data', (data) => {
      console.error('[validate-and-run.js ERROR]', data.toString());
    });

    validateProc.on('close', (code) => {
      if (code !== 0) {
        console.error(`[validate-and-run.js] exited with code ${code}`);
        return resolve(NextResponse.json({ error: '❌ Validation or compute failed', code }, { status: 500 }));
      }

      return resolve(NextResponse.json({
        message: '✅ Validation and compute flow completed successfully!',
      }));
    });
  });
}
