import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/(app)/lib/auth'; // confirm path
import clientPromise from '@/app/lib/mongodb';

interface ProjectData {
    project_name: string;
    files: {
        filename: string;
        contents: string;
    }[];
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    const client = await clientPromise;
    const db = client.db('schoolcentral');

    // Try to get session but do not require it
    const session = await getServerSession(authOptions);

    try {
        const body = await req.json();
        const projectData: ProjectData = {
            project_name: body.project,
            files: body.files,
        };

        if (session && session.user?.role === 'student') {
            // Authenticated student update existing project
            const user_collection = db.collection('users');

            const result = await user_collection.updateOne(
                {
                    email: session.user.email,
                    'java_projects.project_name': projectData.project_name,
                },
                {
                    $set: {
                        'java_projects.$': projectData,
                    },
                }
            );

            if (result.modifiedCount === 0) {
                return NextResponse.json(
                    { error: 'Project not found or not updated' },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { message: 'Project updated successfully (authenticated user)' },
                { status: 200 }
            );
        } else {
            // Anonymous user — save project in a separate collection
            const anon_collection = db.collection('anonymous_projects');

            // You might want to add a timestamp or anonymous ID here
            const result = await anon_collection.insertOne({
                ...projectData,
                createdAt: new Date(),
            });

            if (!result.insertedId) {
                return NextResponse.json(
                    { error: 'Failed to save project anonymously' },
                    { status: 500 }
                );
            }

            return NextResponse.json(
                { message: 'Project saved anonymously' },
                { status: 200 }
            );
        }
    } catch (error) {
        console.error('Error in save_files POST route:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
