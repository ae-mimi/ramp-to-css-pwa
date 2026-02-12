import type { Ramp, RampStep } from "./ramp";

export type PaletteColor = {
  id: string;
  label: string;
  hex: string;
};

export type ThemeName = "light" | "dark";

export type ThemeMapping = {
  surfacePrimary: string;
  surfaceInverse: string;
  textPrimary: string;
  textInverse: string;
  accentPrimary: string;
  accentInverse: string;
};

export type RampMap = Record<string, Ramp>;

export type TokenBundle = {
  css: string;
  json: {
    primitives: Record<string, string>;
    themes: Record<ThemeName, Record<string, string>>;
    components: Record<ThemeName, Record<string, string>>;
  };
};

const steps: RampStep[] = [100, 200, 300, 400, 500, 600, 700, 800, 900];

function varNamePrimitive(id: string, step: RampStep) {
  return `--c-${id}-${step}`;
}

function varLine(name: string, value: string) {
  return `  ${name}: ${value};`;
}

export function buildTokens(
  palette: PaletteColor[],
  ramps: RampMap,
  mapping: Record<ThemeName, ThemeMapping>
): TokenBundle {
  const primitives: Record<string, string> = {};

  for (const c of palette) {
    const ramp = ramps[c.id];
    if (!ramp) continue;
    for (const s of steps) {
      primitives[varNamePrimitive(c.id, s)] = ramp[s];
    }
  }

  const themes: Record<ThemeName, Record<string, string>> = {
    light: {},
    dark: {}
  };
  const components: Record<ThemeName, Record<string, string>> = {
    light: {},
    dark: {}
  };

  for (const theme of ["light", "dark"] as ThemeName[]) {
    const m = mapping[theme];

    // Semantic defaults
    const surfacePrimaryStep = theme === "light" ? 100 : 900;
    const surfaceSecondaryStep = theme === "light" ? 200 : 800;

    const textPrimaryStep = theme === "light" ? 900 : 100;
    const textSecondaryStep = theme === "light" ? 700 : 200;
    const textMutedStep = theme === "light" ? 600 : 400;
    const textDisabledStep = theme === "light" ? 400 : 500;

    const borderDefaultStep = theme === "light" ? 300 : 700;
    const borderStrongStep = theme === "light" ? 400 : 600;
    const borderSubtleStep = theme === "light" ? 200 : 800;

    const accentDefaultStep: RampStep = 500;
    const accentHoverStep: RampStep = 600;
    const accentActiveStep: RampStep = 700;

    themes[theme]["--surface-primary"] = `var(${varNamePrimitive(
      m.surfacePrimary,
      surfacePrimaryStep
    )})`;
    themes[theme]["--surface-secondary"] = `var(${varNamePrimitive(
      m.surfacePrimary,
      surfaceSecondaryStep
    )})`;
    themes[theme]["--surface-inverse"] = `var(${varNamePrimitive(
      m.surfaceInverse,
      theme === "light" ? 900 : 100
    )})`;

    themes[theme]["--text-primary"] = `var(${varNamePrimitive(
      m.textPrimary,
      textPrimaryStep
    )})`;
    themes[theme]["--text-secondary"] = `var(${varNamePrimitive(
      m.textPrimary,
      textSecondaryStep
    )})`;
    themes[theme]["--text-muted"] = `var(${varNamePrimitive(
      m.textPrimary,
      textMutedStep
    )})`;
    themes[theme]["--text-disabled"] = `var(${varNamePrimitive(
      m.textPrimary,
      textDisabledStep
    )})`;
    themes[theme]["--text-inverse"] = `var(${varNamePrimitive(
      m.textInverse,
      theme === "light" ? 100 : 900
    )})`;

    themes[theme]["--border-default"] = `var(${varNamePrimitive(
      m.textPrimary,
      borderDefaultStep
    )})`;
    themes[theme]["--border-strong"] = `var(${varNamePrimitive(
      m.textPrimary,
      borderStrongStep
    )})`;
    themes[theme]["--border-subtle"] = `var(${varNamePrimitive(
      m.textPrimary,
      borderSubtleStep
    )})`;

    themes[theme]["--accent"] = `var(${varNamePrimitive(
      m.accentPrimary,
      accentDefaultStep
    )})`;
    themes[theme]["--accent-hover"] = `var(${varNamePrimitive(
      m.accentPrimary,
      accentHoverStep
    )})`;
    themes[theme]["--accent-active"] = `var(${varNamePrimitive(
      m.accentPrimary,
      accentActiveStep
    )})`;
    themes[theme]["--accent-inverse"] = `var(${varNamePrimitive(
      m.accentInverse,
      accentDefaultStep
    )})`;

    themes[theme]["--link"] = themes[theme]["--accent"];
    themes[theme]["--link-hover"] = themes[theme]["--accent-hover"];
    themes[theme]["--link-active"] = themes[theme]["--accent-active"];

    // Components (minimal set)
    components[theme]["--btn-primary-bg"] = themes[theme]["--surface-inverse"];
    components[theme]["--btn-primary-text"] = themes[theme]["--text-inverse"];
    components[theme]["--btn-primary-bg-hover"] = themes[theme]["--accent-hover"];
    components[theme]["--btn-primary-bg-active"] =
      themes[theme]["--accent-active"];
    components[theme]["--btn-primary-bg-disabled"] =
      themes[theme]["--surface-secondary"];
    components[theme]["--btn-primary-text-disabled"] =
      themes[theme]["--text-disabled"];

    components[theme]["--btn-secondary-bg"] = "transparent";
    components[theme]["--btn-secondary-text"] = themes[theme]["--text-primary"];
    components[theme]["--btn-secondary-border"] =
      themes[theme]["--border-default"];
    components[theme]["--btn-secondary-bg-hover"] =
      themes[theme]["--surface-secondary"];
    components[theme]["--btn-secondary-bg-active"] =
      themes[theme]["--surface-secondary"];
    components[theme]["--btn-secondary-text-disabled"] =
      themes[theme]["--text-disabled"];
    components[theme]["--btn-secondary-border-disabled"] =
      themes[theme]["--border-subtle"];

    components[theme]["--input-bg"] = themes[theme]["--surface-primary"];
    components[theme]["--input-text"] = themes[theme]["--text-primary"];
    components[theme]["--input-placeholder"] = themes[theme]["--text-muted"];
    components[theme]["--input-border"] = themes[theme]["--border-default"];
    components[theme]["--input-border-focus"] = themes[theme]["--accent"];
    components[theme]["--input-bg-disabled"] = themes[theme]["--surface-secondary"];
    components[theme]["--input-text-disabled"] = themes[theme]["--text-disabled"];
  }

  const lines: string[] = [];
  lines.push(":root {");
  lines.push("  /* Primitive ramps */");
  const primitiveKeys = Object.keys(primitives).sort((a, b) =>
    a.localeCompare(b)
  );
  for (const k of primitiveKeys) lines.push(varLine(k, primitives[k]));
  lines.push("}");
  lines.push("");

  for (const theme of ["light", "dark"] as ThemeName[]) {
    lines.push(`[data-theme="${theme}"] {`);
    lines.push("  /* Semantic tokens */");
    for (const [k, v] of Object.entries(themes[theme])) lines.push(varLine(k, v));
    lines.push("");
    lines.push("  /* Component tokens */");
    for (const [k, v] of Object.entries(components[theme]))
      lines.push(varLine(k, v));
    lines.push("}");
    lines.push("");
  }

  return { css: lines.join("\n"), json: { primitives, themes, components } };
}

export function slugifyId(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
