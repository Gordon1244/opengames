"use client";

import { useEffect } from "react";
import { createClient } from "../lib/supabase/client";

export function AuthSessionSync() {
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void supabase.auth.getSession();
  }, []);
  return null;
}
