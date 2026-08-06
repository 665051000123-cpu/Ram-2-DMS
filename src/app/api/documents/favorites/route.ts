import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Check if already favorited
    const existingFav = await prisma.favorite.findUnique({
      where: {
        userId_documentId: {
          userId: session.user.id,
          documentId
        }
      }
    });

    if (existingFav) {
      // Toggle off (un-favorite)
      await prisma.favorite.delete({
        where: { id: existingFav.id }
      });
      return NextResponse.json({ success: true, favorited: false });
    } else {
      // Toggle on (favorite)
      await prisma.favorite.create({
        data: {
          userId: session.user.id,
          documentId
        }
      });
      return NextResponse.json({ success: true, favorited: true });
    }
  } catch (error) {
    console.error('Toggle Favorite Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
