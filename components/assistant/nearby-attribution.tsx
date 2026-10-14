import React from "react";
import type { NearbyAttributionSource } from "@/lib/chat-v2/application/nearby-attribution";

export function NearbyAttribution({ source }: { source: NearbyAttributionSource }) {
  return (
    <p className="mt-3 border-t border-emerald-500/15 pt-2 text-xs text-emerald-200/80" data-testid="nearby-attribution">
      © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap contributors</a>
      {source === "GEOAPIFY_PLACES" && <>
        {" · Powered by "}<a href="https://www.geoapify.com/" target="_blank" rel="noreferrer" className="underline">Geoapify</a>
      </>}
    </p>
  );
}
