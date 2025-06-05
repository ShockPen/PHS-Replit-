// app/(app)/api/student/get_projectlist/post/route.ts
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from '@/app/(app)/lib/auth';
import clientPromise from '@/app/lib/mongodb';

export async function POST(
    req: NextRequest,
    context: { params: Promise<Record<string, string>> }
): Promise<NextResponse> {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        if (session?.user.role !== 'student') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await clientPromise;
        const db = client.db('schoolcentral');
        const user_collection = db.collection('users');

        const data = await user_collection.find({ email: session.user?.email }).toArray();

        // Check if user exists
        if (data.length === 0) {
            return NextResponse.json(
                { message: 'User not found in database' },
                { status: 404 }
            );
        }

        const user = data[0];

        // Return empty array if java_project_names doesn't exist or is null
        const projectNames = user.java_project_names || [];

        return NextResponse.json({
            java_project_names: projectNames
        });

    } catch (error) {
        console.error('Error in get_projectlist:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}