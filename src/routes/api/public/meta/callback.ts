import { createFileRoute } from "@tanstack/react-router";

// Meta redirects the browser here after the user grants ad permissions.
// External caller, so it lives under /api/public/* and validates its own state.
export const Route = createFileRoute("/api/public/meta/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const settings = new URL("/app/settings", url.origin);

        if (url.searchParams.get("error") || !code || !state) {
          settings.searchParams.set("meta", "denied");
          return Response.redirect(settings.toString(), 302);
        }

        try {
          const { verifyState } = await import("@/lib/crypto.server");
          const payload = await verifyState<{ uid: string }>(state);
          if (!payload?.uid) throw new Error("Invalid state");

          const { metaAppCredentials } = await import("@/lib/ads.server");
          const { exchangeMetaCode } = await import("@/adapters/meta.server");
          const { encryptToken } = await import("@/lib/crypto.server");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { appId, appSecret } = metaAppCredentials();
          const { accessToken, expiresAt } = await exchangeMetaCode({
            code,
            redirectUri: `${url.origin}/api/public/meta/callback`,
            appId,
            appSecret,
          });

          const { data: existing } = await supabaseAdmin
            .from("ad_accounts")
            .select("id")
            .eq("user_id", payload.uid)
            .eq("platform", "meta")
            .maybeSingle();

          let rowId = existing?.id;
          if (rowId) {
            await supabaseAdmin
              .from("ad_accounts")
              .update({
                token_expires_at: expiresAt,
                scopes: ["ads_management", "ads_read", "pages_show_list"],
              })
              .eq("id", rowId);
          } else {
            const { data: inserted, error } = await supabaseAdmin
              .from("ad_accounts")
              .insert({
                user_id: payload.uid,
                platform: "meta",
                token_expires_at: expiresAt,
                scopes: ["ads_management", "ads_read", "pages_show_list"],
              })
              .select("id")
              .single();
            if (error || !inserted) throw new Error(error?.message ?? "Could not store connection");
            rowId = inserted.id;
          }

          await supabaseAdmin.from("ad_account_tokens").upsert(
            {
              ad_account_id: rowId,
              oauth_token_encrypted: await encryptToken(accessToken),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "ad_account_id" },
          );

          settings.searchParams.set("meta", "connected");
          return Response.redirect(settings.toString(), 302);
        } catch (err) {
          console.error("[meta oauth]", err);
          settings.searchParams.set("meta", "error");
          return Response.redirect(settings.toString(), 302);
        }
      },
    },
  },
});
