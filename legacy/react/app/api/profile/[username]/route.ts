import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@auth0/nextjs-auth0';

export const GET = async (req: NextRequest, { params }: { params: { username: string } }) => {
    const { username } = await params;
    const response = await fetch(`https://api.speedsolve.xyz/profile/${username}`);
    const data = await response.json();
    return NextResponse.json(data);
};

export const PATCH = async (req: NextRequest, { params }: { params: { username: string } }) => {
  console.log('PATCH request received');
  const { username } = await params;
  let accessToken;
  try {
    accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const response = await fetch(`https://api.speedsolve.xyz/profile/${username}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json();
  return NextResponse.json(data);
};