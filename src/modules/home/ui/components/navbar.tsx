"use client";

import { Button } from "@/components/ui/button";
import { UserControl } from "@/components/user-control";
import { WEBSITE_NAME } from "@/constant";
import { useScroll } from "@/hooks/use-hooks";
import { cn } from "@/lib/utils";
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

export const Navbar = () => {
  const isScroll = useScroll();
  return (
    <nav
      className={cn(
        `p-4 bg-transparent fixed top-0 left-0 right-0 z-50 transition-all duration-200 border-b border-transparent`,
        isScroll && "bg-background border-border"
      )}
    >
      <div className="max-w-5xl mx-auto w-full flex justify-between items-center">
        <Link href={"/"} className="flex items-center gap-2">
          <Image src={"/logo.svg"} alt="logo" width={24} height={24} />
          <span>{WEBSITE_NAME}</span>
        </Link>
        <SignedOut>
          <div className="flex gap-2">
            <SignUpButton>
              <Button variant={"outline"}>Sign up</Button>
            </SignUpButton>
            <SignInButton>
              <Button>Sign in</Button>
            </SignInButton>
          </div>
        </SignedOut>
        <SignedIn>
          <UserControl showName />
        </SignedIn>
      </div>
    </nav>
  );
};
