import { describe, expect, it } from "vitest";
import { LoadUnit } from "@/generated/prisma/enums";
import {
  convertWeight,
  formatWeight,
  fromKilograms,
  isConvertibleUnit,
  roundToIncrement,
  toKilograms,
} from "./load-unit";

describe("isConvertibleUnit", () => {
  it("n'accepte que les unités de masse", () => {
    expect(isConvertibleUnit(LoadUnit.KG)).toBe(true);
    expect(isConvertibleUnit(LoadUnit.LBS)).toBe(true);
    expect(isConvertibleUnit(LoadUnit.LEVEL)).toBe(false);
    expect(isConvertibleUnit(LoadUnit.BODYWEIGHT)).toBe(false);
    expect(isConvertibleUnit(LoadUnit.NONE)).toBe(false);
  });
});

describe("toKilograms", () => {
  it("laisse les kilogrammes inchangés", () => {
    expect(toKilograms(62.5, LoadUnit.KG)).toBe(62.5);
  });

  it("convertit les livres", () => {
    expect(toKilograms(100, LoadUnit.LBS)).toBe(45.359);
  });

  it("refuse les unités non convertibles plutôt que de produire un faux kilo", () => {
    expect(toKilograms(8, LoadUnit.LEVEL)).toBeNull();
    expect(toKilograms(0, LoadUnit.BODYWEIGHT)).toBeNull();
    expect(toKilograms(null, LoadUnit.KG)).toBeNull();
  });
});

describe("aller-retour de conversion", () => {
  it("reste stable au millième", () => {
    for (const value of [20, 42.5, 62.5, 100, 137.5]) {
      const kilograms = toKilograms(value, LoadUnit.LBS);
      expect(kilograms).not.toBeNull();
      expect(fromKilograms(kilograms, LoadUnit.LBS)).toBeCloseTo(value, 2);
    }
  });

  it("convertit directement entre unités", () => {
    expect(convertWeight(45.359, LoadUnit.KG, LoadUnit.LBS)).toBeCloseTo(100, 2);
    expect(convertWeight(8, LoadUnit.LEVEL, LoadUnit.KG)).toBeNull();
  });
});

describe("roundToIncrement", () => {
  it("aligne la charge sur le pas de la machine", () => {
    expect(roundToIncrement(61, 2.5)).toBe(60);
    expect(roundToIncrement(63.7, 2.5)).toBe(62.5);
    expect(roundToIncrement(64, 2.5)).toBe(65);
    expect(roundToIncrement(7.4, 1)).toBe(7);
  });

  it("ignore un pas invalide au lieu de diviser par zéro", () => {
    expect(roundToIncrement(63.7, 0)).toBe(63.7);
    expect(roundToIncrement(63.7, -5)).toBe(63.7);
  });
});

describe("formatWeight", () => {
  it("affiche les charges sans décimale superflue", () => {
    expect(formatWeight(60, LoadUnit.KG)).toBe("60 kg");
    expect(formatWeight(62.5, LoadUnit.KG)).toBe("62.5 kg");
    expect(formatWeight(135, LoadUnit.LBS)).toBe("135 lbs");
  });

  it("traite les unités particulières", () => {
    expect(formatWeight(8, LoadUnit.LEVEL)).toBe("niv. 8");
    expect(formatWeight(0, LoadUnit.BODYWEIGHT)).toBe("Poids du corps");
    expect(formatWeight(0, LoadUnit.NONE)).toBeNull();
    expect(formatWeight(null, LoadUnit.KG)).toBeNull();
  });
});
