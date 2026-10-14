import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NearbyAttribution } from "@/components/assistant/nearby-attribution";

describe("Nearby attribution UI", () => {
  it("renders visible OpenStreetMap and Geoapify credit links for Geoapify results", () => {
    const html = renderToStaticMarkup(createElement(NearbyAttribution, { source: "GEOAPIFY_PLACES" }));
    expect(html).toContain('data-testid="nearby-attribution"');
    expect(html).toContain('href="https://www.openstreetmap.org/copyright"');
    expect(html).toContain("OpenStreetMap contributors");
    expect(html).toContain('href="https://www.geoapify.com/"');
    expect(html).toContain("Powered by ");
  });

  it("credits OpenStreetMap without Geoapify when Overpass supplied the results", () => {
    const html = renderToStaticMarkup(createElement(NearbyAttribution, { source: "OPENSTREETMAP_OVERPASS" }));
    expect(html).toContain("OpenStreetMap contributors");
    expect(html).not.toContain("Geoapify");
  });
});
