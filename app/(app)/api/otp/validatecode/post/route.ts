import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from '@/app/(app)/lib/auth';
import clientPromise from '@/app/lib/mongodb';

interface Data {
    message?: string;
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<Record<string, string>> }
): Promise<NextResponse> {
    // Simplified getServerSession call for App Router
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
        return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    // if there's a document that has the same email and the otp code is the same as the document, set the "emailIsVerified" field to true
    const email: string = session.user.email;
    const client = await clientPromise;
    const db = client.db('schoolcentral');
    const collection = db.collection('otp');

    const body = await req.json();

    const document = await collection.findOne({ email, otpCode: body.otp });

    if (document) {
        await collection.updateOne(
            { email },
            {
                $set: {
                    emailIsVerified: true
                }
            }
        );
        return NextResponse.json({ message: 'Email verified successfully' });
    } else {
        return NextResponse.json({ message: 'Invalid OTP code' }, { status: 400 });
    }
}