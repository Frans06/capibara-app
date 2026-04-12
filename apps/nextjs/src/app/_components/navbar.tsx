"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@capibara/ui";
import { Button } from "@capibara/ui/button";

import { authClient } from "~/auth/client";

const links = [
  { href: "/", label: "Home" },
  { href: "/scan", label: "Scan" },
  { href: "/receipts", label: "Receipts" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <nav className="border-b border-border bg-background">
      <div className="container flex h-14 items-center gap-6">
        <Link href="/" className="text-lg font-bold text-primary">
          Capibara
        </Link>

        {session ? (
          <>
            <div className="flex gap-4">
              {links.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {session.user.name}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </>
        ) : (
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/login"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === "/login"
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            >
              Login
            </Link>
            <Link href="/signup">
              <Button size="sm">Sign Up</Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
