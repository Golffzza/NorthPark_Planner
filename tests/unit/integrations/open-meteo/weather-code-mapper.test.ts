import { describe, expect, it } from "vitest";

import { mapOpenMeteoWeatherCondition } from "@/lib/integrations/open-meteo/weather-code-mapper";

describe("mapOpenMeteoWeatherCondition", () => {
  it("maps clear weather codes to CLEAR", () => {
    expect(mapOpenMeteoWeatherCondition(0, 0)).toBe("CLEAR");
  });

  it("maps cloudy weather codes to CLOUDY", () => {
    expect(mapOpenMeteoWeatherCondition(3, 0)).toBe("CLOUDY");
  });

  it("maps lighter rain conditions to LIGHT_RAIN", () => {
    expect(mapOpenMeteoWeatherCondition(61, 1.2)).toBe("LIGHT_RAIN");
  });

  it("upgrades mixed conditions to HEAVY_RAIN when precipitation is high", () => {
    expect(mapOpenMeteoWeatherCondition(3, 8.5)).toBe("HEAVY_RAIN");
  });

  it("maps thunderstorm codes to STORM", () => {
    expect(mapOpenMeteoWeatherCondition(95, 12)).toBe("STORM");
  });
});
