
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Swish callback received:', body);
    return NextResponse.json({ message: 'Callback received' });
  } catch (error) {
    console.error('Error handling Swish callback:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
