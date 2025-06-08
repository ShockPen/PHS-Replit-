"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Input } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import { Spinner } from "@nextui-org/react";
import Link from "next/link";
import { IconBrandGoogleFilled, IconBrandGithub } from "@tabler/icons-react";
import HomeHeader from "../../components/HomeHeader";

export default function LoginPage() {
    const { data: session } = useSession();

    // Role-based redirects for logged-in users
    if (session?.user?.role === "admin") redirect("/dashboard");
    if (session?.user?.role === "student") redirect("/studenthome");
    if (session?.user?.role === "educator") redirect("/educatorhome");

    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [signInPressed, setSignInPressed] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!loginEmail || !loginPassword) {
            alert("Please fill in all fields");
            return;
        }

        setSignInPressed(true);

        try {
            const res = await signIn("credentials", {
                email: loginEmail,
                password: loginPassword,
                redirect: false,
                callbackUrl: "/onboarding", // <-- redirect here
            });

            if (res?.error) {
                alert(res.error);
            } else if (res?.ok) {
                // Redirect manually if not using `redirect: true`
                window.location.href = "/onboarding";
            }
        } catch (error) {
            console.error("Login failed", error);
            alert("An error occurred during login.");
        } finally {
            setSignInPressed(false);
        }
    };

    return (
        <div className="text-white dark:bg-black bg-[#F9F8F6] h-screen w-screen">
            <HomeHeader />
            <div className="flex justify-center">
                <form
                    className="justify-center content-center w-1/2 space-y-5"
                    onSubmit={handleLogin}
                >
                    <h1 className="text-4xl font-bold text-center text-black dark:text-white">Login</h1>

                    <Link href="/register" className="text-blue-600 text-sm text-center block">
                        Don&apos;t have an account? Register here.
                    </Link>

                    <Input
                        type="email"
                        label="Email"
                        placeholder="Enter your email"
                        onChange={(e) => setLoginEmail(e.target.value)}
                    />
                    <Input
                        type={showPassword ? "text" : "password"}
                        label="Password"
                        placeholder="Enter your password"
                        onChange={(e) => setLoginPassword(e.target.value)}
                        endContent={
                            <button type="button" onClick={togglePasswordVisibility}>
                                {showPassword ? (
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M4.998 7.78C6.729 6.345 9.198 5 12 5c2.802 0 5.27 1.345 7.002 2.78a12.713 12.713 0 0 1 2.096 2.183c.253.344.465.682.618.997.14.286.284.658.284 1.04s-.145.754-.284 1.04a6.6 6.6 0 0 1-.618.997A12.712 12.712 0 0 1 19.002 16.22C17.271 17.655 14.802 19 12 19c-2.802 0-5.27-1.345-7.002-2.78a12.712 12.712 0 0 1-2.096-2.183 6.6 6.6 0 0 1-.618-.997C2.144 12.754 2 12.382 2 12s.145-.754.284-1.04c.153-.315.365-.653.618-.997A12.714 12.714 0 0 1 4.998 7.78ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                                    </svg>
                                ) : (
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 5C6.5 5 2 12 2 12s4.5 7 10 7 10-7 10-7-4.5-7-10-7zm0 12c-2.76 0-5-2.24-5-5 0-.82.2-1.58.55-2.25L14.25 16.45C13.58 16.8 12.82 17 12 17zm4.45-2.75L9.75 7.55C10.42 7.2 11.18 7 12 7c2.76 0 5 2.24 5 5 0 .82-.2 1.58-.55 2.25z" />
                                    </svg>
                                )}
                            </button>
                        }
                    />

                    <div className="flex justify-between">
                        <Button type="submit" color="primary">Sign in</Button>
                    </div>

                    <Button
                        variant="bordered"
                        className="w-full flex items-center justify-center gap-2"
                        onPress={() =>
                            signIn("google", { callbackUrl: "/onboarding" })
                        }
                    >
                        <IconBrandGoogleFilled size={20} />
                        Sign in with Google
                    </Button>

                    <Button
                        variant="bordered"
                        className="w-full flex items-center justify-center gap-2"
                        onPress={() =>
                            signIn("github", { callbackUrl: "/onboarding" })
                        }
                    >
                        <IconBrandGithub className="w-5 h-5" />
                        Sign in with GitHub
                    </Button>

                    {signInPressed && (
                        <div className="text-center mt-4">
                            <Spinner />
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
