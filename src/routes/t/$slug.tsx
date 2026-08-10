import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isEmail, type PageContent } from "@/lib/dr";

export const Route = createFileRoute("/t/$slug")({
  ssr: false,
  component: PublicPage;
});

function PublicPage() {
  return null;
}
