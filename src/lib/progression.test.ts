import { describe, expect, it } from "vitest";
import { LoadUnit } from "@/generated/prisma/enums";
import { compareSessions, formatPercentChange, percentChange } from "./progression";
import type { SetMetrics } from "./set-metrics";

function makeSet(weight: number, reps: number, unit: LoadUnit = LoadUnit.KG): SetMetrics {
  return {
    weight,
    weightUnit: unit,
    weightKg: unit === LoadUnit.KG ? weight : null,
    reps,
    isWarmup: false,
    isCompleted: true,
    durationSeconds: null,
    distanceMeters: null,
  };
}

describe("compareSessions", () => {
  it("détecte une répétition gagnée à charge égale", () => {
    const result = compareSessions([makeSet(65, 8)], [makeSet(65, 7)]);
    expect(result?.status).toBe("up");
    expect(result?.repsDelta).toBe(1);
    expect(result?.summary).toBe("+1 répétition");
  });

  it("détecte une charge gagnée malgré des répétitions perdues", () => {
    const result = compareSessions([makeSet(65, 10)], [makeSet(60, 12)]);
    expect(result?.status).toBe("up");
    expect(result?.weightDelta).toBe(5);
    expect(result?.summary).toBe("+5 kg · −2 répétitions");
  });

  it("qualifie une séance identique de stable", () => {
    const result = compareSessions([makeSet(65, 10)], [makeSet(65, 10)]);
    expect(result?.status).toBe("flat");
    expect(result?.summary).toBe("stable");
  });

  it("détecte une régression", () => {
    const result = compareSessions([makeSet(60, 8)], [makeSet(65, 10)]);
    expect(result?.status).toBe("down");
    expect(result?.weightDelta).toBe(-5);
  });

  it("compare sur la meilleure série de chaque séance", () => {
    const today = [makeSet(60, 12), makeSet(70, 10), makeSet(60, 6)];
    const before = [makeSet(60, 12), makeSet(65, 10)];
    const result = compareSessions(today, before);
    expect(result?.status).toBe("up");
    expect(result?.current.weight).toBe(70);
    expect(result?.previous.weight).toBe(65);
  });

  it("renvoie null sans point de comparaison", () => {
    expect(compareSessions([makeSet(60, 10)], [])).toBeNull();
    expect(compareSessions([], [])).toBeNull();
  });

  it("n'annonce pas d'écart de charge entre deux unités différentes", () => {
    const result = compareSessions([makeSet(8, 10, LoadUnit.LEVEL)], [makeSet(60, 10)]);
    expect(result?.weightDelta).toBeNull();
  });
});

describe("percentChange", () => {
  it("calcule une variation relative", () => {
    expect(percentChange(110, 100)).toBe(10);
    expect(percentChange(90, 100)).toBe(-10);
  });

  it("évite la division par zéro", () => {
    expect(percentChange(10, 0)).toBeNull();
  });

  it("se formate lisiblement", () => {
    expect(formatPercentChange(12.5)).toBe("+12.5 %");
    expect(formatPercentChange(-3)).toBe("−3 %");
    expect(formatPercentChange(0)).toBe("=");
    expect(formatPercentChange(null)).toBe("—");
  });
});
