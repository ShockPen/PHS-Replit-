import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/(app)/lib/auth';
import clientPromise from '@/app/lib/mongodb';

export async function POST(
    req: NextRequest,
    context: { params: Promise<Record<string, string>> }
): Promise<NextResponse> {
    try {
        const session = await getServerSession(authOptions);

        if (session?.user.role !== 'student') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session?.user?.email) {
            const client = await clientPromise;
            const db = client.db('schoolcentral');
            const user_collection = db.collection('users');

            const data = await user_collection.find({ email: session.user.email }).toArray();

            // Check if user exists
            if (data.length === 0) {
                return NextResponse.json(
                    { message: 'User not found in database' },
                    { status: 404 }
                );
            }

            const user = data[0];

            // Check if required fields exist
            if (!user.firstname || !user.lastname) {
                return NextResponse.json(
                    { message: 'User profile incomplete - missing name information' },
                    { status: 400 }
                );
            }

            return NextResponse.json({
                firstname: user.firstname,
                lastname: user.lastname
            });
        } else {
            return NextResponse.json(
                { message: 'Not authenticated' },
                { status: 401 }
            );
        }
    } catch (error) {
        console.error('Error in get_studentinfo:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}