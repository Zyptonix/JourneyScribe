"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="backdrop-blur-md bg-white/5 border-b border-white/10 px-6 py-3 flex gap-6 sticky top-0 z-40">
      <Link href="/history" className={`px-3 py-1 rounded ${pathname === "/history" ? "bg-white/10" : "hover:bg-white/5"}`}>History</Link>
      <Link href="/history/leaderboard" className={`px-3 py-1 rounded ${pathname === "/history/leaderboard" ? "bg-white/10" : "hover:bg-white/5"}`}>Leaderboard</Link>
      <Link href="/history/badges" className={`px-3 py-1 rounded ${pathname === "/history/badges" ? "bg-white/10" : "hover:bg-white/5"}`}>Badges</Link>
    </nav>
  );
}
