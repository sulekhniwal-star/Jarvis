import * as React from "react";
import Link from "next/link";
import { ShieldAlert, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface AuthRequiredBannerProps {
  isConfigured: boolean;
}

export function AuthRequiredBanner({ isConfigured }: AuthRequiredBannerProps) {
  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-6">
        <div className="flex items-start gap-3">
          {isConfigured ? (
            <ShieldAlert className="w-5 h-5 text-warning mt-0.5 shrink-0" />
          ) : (
            <Settings className="w-5 h-5 text-warning mt-0.5 shrink-0" />
          )}
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-text-primary">
              {isConfigured
                ? "Authentication Required"
                : "Supabase Configuration Required"}
            </h2>
            <p className="text-xs text-text-secondary">
              {isConfigured
                ? "Sign in with your owner credentials to access persistent Jarvis data."
                : "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local to enable persistence and authentication."}
            </p>
          </div>
        </div>

        {isConfigured && (
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-accent-cyan text-background text-xs font-semibold hover:opacity-90 transition-opacity shrink-0"
          >
            Sign In
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
