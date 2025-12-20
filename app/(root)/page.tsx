
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="z-20 flex flex-col items-center justify-start min-h-screen py-2 mt-10">
      <div className="flex flex-col items-center justify-center my-5">
        <Image src={"/logo.png"} alt="Hero section" height={500} width={500}/>
        <h1 className="z-20 text-5xl mt-5 font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-neutral-500 via-neutral-500 to-zinc-500 dark:from-stone-400 dark:via-neutral-400 dark:to-stone-400 tracking-tight leading-[1.3] ">
          Learn to Build Your Future
        </h1>
          <p className="mt-2 text-lg text-center text-gray-600 dark:text-gray-400 px-5 py-10 max-w-2x1">
            Full-Stack Project-Based Coding Education. Where Beginners Turn Blank Files Into Lifelong Projects.
          </p>

          <Link href={"/dashboard"}>
            <Button variant={"default"} className="mb-4" size={"lg"}>
              Get Started
              <ArrowUpRight className="w-3.5 h-3.5"/>
            </Button>
          </Link>
      </div>
    </div>
  );
}