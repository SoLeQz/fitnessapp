import { describe, expect, it } from "vitest";
import { LoadUnit } from "@/generated/prisma/enums";
import {
  bestEstimatedOneRepMax,
  bestSet,
  estimateOneRepMax,
  heaviestWeight,
  maxReps,
  setVolumeKg,
  totalReps,
  totalVolumeKg,
  type SetMetrics,
} from "./set-metrics";

function makeSet(overrides: Partial<SetMetrics> = {}): SetMetrics {
  return {
    weight: 60,
    weightUnit: LoadUnit.KG,
    weightKg: 60,
    reps: 10,
    isWarmup: false,
    isCompleted: true,
    durationSeconds: null,
    distanceMeters: null,
    ...overrides,
  };
}

describe("setVolumeKg", () => {
  it("multiplie charge canonique et répétitions", () => {
    expect(setVolumeKg(makeSet({ weightKg: 65, reps: 8 }))).toBe(520);
  });

  it("ne produit rien sans charge convertible", () => {
    expect(setVolumeKg(makeSet({ weightKg: null }))).toBeNull();
    expect(setVolumeKg(makeSet({ reps: null }))).toBeNull();
    expect(setVolumeKg(makeSet({ reps: 0 }))).toBeNull();
  });
});

describe("totalVolumeKg", () => {
  it("additionne les séries de travail", () => {
    const sets = [
      makeSet({ weightKg: 60, reps: 12 }),
      makeSet({ weightKg: 65, reps: 10 }),
      makeSet({ weightKg: 65, reps: 8 }),
    ];
    expect(totalVolumeKg(sets)).toBe(720 + 650 + 520);
  });

  it("exclut échauffements et séries non validées", () => {
    const sets = [
      makeSet({ weightKg: 40, reps: 15, isWarmup: true }),
      makeSet({ weightKg: 60, reps: 10, isCompleted: false }),
      makeSet({ weightKg: 60, reps: 10 }),
    ];
    expect(totalVolumeKg(sets)).toBe(600);
    expect(totalReps(sets)).toBe(10);
  });

  it("ignore une série en niveaux de machine sans la compter comme des kilos", () => {
    const sets = [
      makeSet({ weight: 8, weightUnit: LoadUnit.LEVEL, weightKg: null, reps: 12 }),
      makeSet({ weightKg: 50, reps: 10 }),
    ];
    expect(totalVolumeKg(sets)).toBe(500);
  });
});

describe("estimateOneRepMax", () => {
  it("applique la formule d'Epley", () => {
    // 100 x (1 + 5/30) = 116.7
    expect(estimateOneRepMax(makeSet({ weightKg: 100, reps: 5 }))).toBeCloseTo(116.7, 1);
    expect(estimateOneRepMax(makeSet({ weightKg: 100, reps: 1 }))).toBeCloseTo(103.3, 1);
  });

  it("refuse d'extrapoler au-delà de 12 répétitions", () => {
    expect(estimateOneRepMax(makeSet({ reps: 12 }))).not.toBeNull();
    expect(estimateOneRepMax(makeSet({ reps: 13 }))).toBeNull();
    expect(estimateOneRepMax(makeSet({ reps: 0 }))).toBeNull();
  });

  it("refuse les unités non convertibles", () => {
    expect(
      estimateOneRepMax(makeSet({ weightUnit: LoadUnit.LEVEL, weightKg: null, weight: 8 })),
    ).toBeNull();
  });

  it("retient le meilleur d'un ensemble", () => {
    const sets = [
      makeSet({ weightKg: 60, reps: 12 }), // 84
      makeSet({ weightKg: 65, reps: 10 }), // 86.7
      makeSet({ weightKg: 65, reps: 8 }), // 82.3
    ];
    expect(bestEstimatedOneRepMax(sets)).toBeCloseTo(86.7, 1);
  });
});

describe("bestSet", () => {
  it("privilégie le meilleur 1RM estimé, pas la charge brute", () => {
    const heavy = makeSet({ weightKg: 70, weight: 70, reps: 3 }); // 77
    const balanced = makeSet({ weightKg: 65, weight: 65, reps: 10 }); // 86.7
    expect(bestSet([heavy, balanced])).toBe(balanced);
  });

  it("retombe sur la charge quand le 1RM n'est pas calculable", () => {
    const low = makeSet({ weightUnit: LoadUnit.LEVEL, weightKg: null, weight: 6, reps: 15 });
    const high = makeSet({ weightUnit: LoadUnit.LEVEL, weightKg: null, weight: 8, reps: 12 });
    expect(bestSet([low, high])).toBe(high);
  });

  it("ignore les séries d'échauffement", () => {
    const warmup = makeSet({ weightKg: 100, weight: 100, reps: 10, isWarmup: true });
    const working = makeSet({ weightKg: 60, weight: 60, reps: 10 });
    expect(bestSet([warmup, working])).toBe(working);
  });

  it("renvoie null sans série exploitable", () => {
    expect(bestSet([])).toBeNull();
    expect(bestSet([makeSet({ isCompleted: false })])).toBeNull();
  });
});

describe("heaviestWeight et maxReps", () => {
  it("extraient les maxima des séries de travail", () => {
    const sets = [
      makeSet({ weight: 60, reps: 12 }),
      makeSet({ weight: 70, reps: 6 }),
      makeSet({ weight: 90, reps: 20, isWarmup: true }),
    ];
    expect(heaviestWeight(sets)).toBe(70);
    expect(maxReps(sets)).toBe(12);
  });
});
