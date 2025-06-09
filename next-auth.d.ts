import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        accessToken?: string;
        user: {
            _id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role?: string | null;
            school_abbr?: string | null;
            isNewUser?: boolean;
            userType?: "student" | "educator"; // <-- Add this line
        } & DefaultSession["user"];
    }

    interface User {
        role?: string | null;
        school_abbr?: string | null;
        isNewUser?: boolean;
        userType?: "student" | "educator"; // <-- Add this line
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        role?: string | null;
        school_abbr?: string | null;
        isNewUser?: boolean;
        userType?: "student" | "educator"; // <-- Add this line
    }
}
