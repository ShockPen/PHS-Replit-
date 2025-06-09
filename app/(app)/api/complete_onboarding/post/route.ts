import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/(app)/lib/auth";
import clientPromise from "@/app/lib/mongodb";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  // Check if user is authenticated
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    firstname,
    lastname,
    age,
    grade,
    job,
    school_abbr,
    role
  } = body;

  try {
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db("schoolcentral");

    // Validate school exists
    const schoolExists = await db.collection("schools").findOne({ school_abbr });
    if (!schoolExists) {
      return NextResponse.json({ message: "School not found" }, { status: 404 });
    }

    // User data to update
    const userData: any = {
      firstname,
      lastname,
      role,
      school_abbr,
      emailIsVerified: true,
      onboardingCompleted: true,
      updatedAt: new Date(),
    };

    // Add role-specific fields
    if (role === "student") {
      userData.age = parseInt(age);
      userData.grade = parseInt(grade);
    } else if (role === "educator") {
      userData.job = job;
    }

    const existing_user = await db.collection("users").findOne(
        { email: session.user.email }
    )

    if (existing_user?.onboardingCompleted) {
      return NextResponse.json({
        message: "Onboarding was already completed"
      }, { status: 400 });
    }

    // Update user in database
    await db.collection("users").updateOne(
        { email: session.user.email },
        { $set: userData }
    );

    return NextResponse.json({
      message: "Onboarding completed successfully"
    }, { status: 200 });

  } catch (error) {
    console.error("Onboarding completion error:", error);
    return NextResponse.json({
      message: "An error occurred during onboarding"
    }, { status: 500 });
  }
}