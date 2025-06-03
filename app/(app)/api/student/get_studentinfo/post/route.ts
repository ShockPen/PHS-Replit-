// app/api/get_settings

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getSession } from 'next-auth/react';
import { NextRequest, NextResponse } from "next/server";
// import { authOptions } from '../../auth/[...nextauth]/route';
import { authOptions } from '@/app/(app)/lib/auth';

import clientPromise from '@/app/lib/mongodb';

interface Data {
    message?: string;
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<Record<string, string>> }
): Promise<NextResponse> {
    const session = await getServerSession(authOptions);


    if (session?.user.role !== 'student') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session) {

        const client = await clientPromise;
        const db = client.db('schoolcentral');
        const user_collection = db.collection('users');

        const data = await user_collection.find({ email: session.user?.email }).toArray();

        return NextResponse.json({ firstname: data[0].firstname, lastname: data[0].lastname });
    }
    else {
        return NextResponse.json({ message: 'Not authenticated' });
    }
}

