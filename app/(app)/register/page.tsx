"use client";

import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { cn } from "@/app/lib/utils";
import HomeHeader from "@/app/components/HomeHeader";
import { ShootingStars } from "@/app/components/ui/shooting-stars";
import { StarsBackground } from "@/app/components/ui/stars-background";
import { useEffect, useState } from "react";
import { Autocomplete, AutocompleteItem } from "@nextui-org/react";
import Link from "next/link";
import axios from "axios";
import { Spinner } from "@nextui-org/react";
import { Button } from "@nextui-org/react";
import { signIn } from "next-auth/react";
import { IconBrandGoogleFilled } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

type School = {
  key: string,
  abbr: string,
  name: string,
  address: string
};

export default function Page() {
  const [message, setMessage] = useState('');
  const [schools, setSchools] = useState<Array<School>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const router = useRouter();

  const createAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Add the selected school to the form data
    if (selectedSchool) {
      formData.set('schoolname', selectedSchool);
    }

    const data = Object.fromEntries(formData.entries());
    console.log('Form data:', data);

    try {
      const response = await fetch("/api/create_student/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const responseMessage = await response.json();
      console.log('Response:', responseMessage);

      setMessage(responseMessage.message);

      // Check if account creation was successful
      if (response.ok && responseMessage.success) {
        setMessage("Account created successfully! Redirecting...");

        // Sign in the user automatically after successful registration
        const signInResult = await signIn('credentials', {
          email: data.email as string,
          password: data.password as string,
          redirect: false,
        });

        if (signInResult?.ok) {
          // Redirect to student home after successful sign in
          setTimeout(() => {
            router.push('/studenthome');
          }, 1000);
        } else {
          setMessage("Account created but auto-login failed. Please login manually.");
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        }
      } else {
        setMessage(responseMessage.message || "Registration failed. Please try again.");
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage("An error occurred during registration. Please try again.");
    } finally {
      setLoading(false);
    }

    form.reset();
    setSelectedSchool('');
  };

  useEffect(() => {
    const getSchools = async () => {
      try {
        const response = await fetch('/api/get_schools/post', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        if (data.schools) {
          setSchools(data.schools);
        }
      } catch (error) {
        console.error('Error fetching schools:', error);
      }
    };

    getSchools();
  }, []);

  return (
      <>
        <HomeHeader />
        <div className="flex flex-col gap-x-4 min-h-screen w-full pb-8 md:flex-row justify-center bg-slate-100 dark:bg-neutral-950">
          <div className="my-auto flex flex-col">
            <div className="max-w-md w-full mx-auto rounded-none md:rounded-2xl p-4 mt-4 md:p-8 shadow-input bg-white dark:bg-black">
              <h2 className="font-bold text-xl text-neutral-800 dark:text-neutral-200">
                Create a Student Account
              </h2>
              <p className="text-neutral-600 text-sm max-w-sm mt-2 dark:text-neutral-300">
                Gain access to student resources and tools on SchoolNest for free.
              </p>
              <Link href="/registerteacher" className="text-blue-500 pt-4">Not a student?</Link>

              <form className="mt-8" onSubmit={createAccount}>
                <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mb-4">
                  <LabelInputContainer>
                    <Label htmlFor="firstname">First name</Label>
                    <Input id="firstname" name="firstname" placeholder="Agneya" type="text" required />
                  </LabelInputContainer>
                  <LabelInputContainer>
                    <Label htmlFor="lastname">Last name</Label>
                    <Input id="lastname" name="lastname" placeholder="Tharun" type="text" required />
                  </LabelInputContainer>
                </div>
                <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mb-4">
                  <LabelInputContainer>
                    <Label htmlFor="age">Age</Label>
                    <Input id="age" name="age" placeholder="17" type="number" required />
                  </LabelInputContainer>
                  <LabelInputContainer>
                    <Label htmlFor="grade">Grade</Label>
                    <Input id="grade" name="grade" placeholder="12" type="number" required />
                  </LabelInputContainer>
                </div>
                <LabelInputContainer className="mb-4">
                  <Label htmlFor="email">Non-school Email Address (Doubles as Username)</Label>
                  <Input id="email" name="email" placeholder="agneya@gmail.com" type="email" required />
                </LabelInputContainer>
                <LabelInputContainer className="mb-4">
                  <Label htmlFor="schoolname">School</Label>
                  <Autocomplete
                      isVirtualized
                      className="w-full mb-4 text-black dark:text-white"
                      defaultItems={schools}
                      placeholder="Search for a School"
                      onSelectionChange={(key) => {
                        if (key) {
                          setSelectedSchool(key as string);
                        }
                      }}
                      isRequired
                  >
                    {(school) =>
                        <AutocompleteItem key={school.abbr} textValue={school.abbr + ": " + school.name}>
                          <div className="flex flex-col my-4">
                        <span className="text-sm text-black dark:text-white">
                          {school.abbr}: {school.name}
                        </span>
                            <span className="text-xs dark:text-default-400 text-default-600">
                          {school.address}
                        </span>
                          </div>
                        </AutocompleteItem>
                    }
                  </Autocomplete>
                </LabelInputContainer>
                <LabelInputContainer className="mb-4">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" placeholder="••••••••" type="password" required />
                </LabelInputContainer>

                <button
                    className="bg-gradient-to-br relative group/btn from-black dark:from-zinc-900 dark:to-zinc-900 to-neutral-600 block dark:bg-zinc-800 w-full text-white rounded-md h-10 font-medium shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:shadow-[0px_1px_0px_0px_var(--zinc-800)_inset,0px_-1px_0px_0px_var(--zinc-800)_inset] disabled:opacity-50"
                    type="submit"
                    disabled={loading}
                >
                  {loading ? "Creating Account..." : "Sign up →"}
                  <BottomGradient />
                </button>

                {message && (
                    <p className={`mt-4 mb-4 ${message.includes('success') || message.includes('created') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {message}
                    </p>
                )}

                {loading && (
                    <div className="flex justify-center mt-4">
                      <Spinner />
                    </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </>
  );
}

const BottomGradient = () => {
  return (
      <>
        <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
        <span className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
      </>
  );
};

const LabelInputContainer = ({
                               children,
                               className,
                             }: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
      <div className={cn("flex flex-col space-y-2 w-full", className)}>
        {children}
      </div>
  );
};