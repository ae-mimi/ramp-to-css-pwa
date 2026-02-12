"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  generateRamp9,
  isValidHex,
  normalizeHex,
  type Ramp,
  type RampStep
} from "@/lib/ramp";
import {
  buildTokens,
  slugifyId,
  type PaletteColor,
  type ThemeMapping,
  type ThemeName
} from "@/lib/tokens";

type Row = PaletteColor & { ramp?: Ramp; error?: string };

const STEPS: RampStep[] = [100, 200, 300, 400, 500, 600, 700, 800, 900];

const DEFAULT_PALETTE: PaletteColor[] = [
  { id: "deep-blue", label: "Deep Blue", hex: "#1c2e7a" },
  { id: "light-yellow", label: "Light Yellow", hex: "#f7f2a1" },
  { id: "light-blue", label: "Light Blue", hex: "#56b6e9" },
  { id: "deep-yellow", label: "Deep Yellow", hex: "#f1b400" }
];

const DEFAULT_MAPPING: Record<ThemeName, ThemeMapping> = {
  light: {
    surfacePrimary: "light-yellow",
    surfaceInverse: "deep-blue",
    textPrimary: "deep-blue",
    textInverse: "light-yellow",
    accentPrimary: "light-blue",
    accentInverse: "deep-yellow"
  },
  dark: {
    surfacePrimary: "deep-blue",
    surfaceInverse: "light-yellow",
    textPrimary: "light-yellow",
    textInverse: "deep-blue",
    accentPrimary: "deep-yellow",
    accentInverse: "light-blue"
  }
};

const STORAGE_KEY = "rampcss.palette.v1";

export default function Page() {
  const [stopSet, setStopSet] = useState<"figma" | "even">("figma");
  const [rows, setRows] = useState<Row[]>(() =>
    DEFAULT_PALETTE.map((r) => ({ ...r, hex: normalizeHex(r.hex) }))
  );
  const [mapping, setMapping] =
    useState<Record<ThemeName, ThemeMapping>>(DEFAULT_MAPPING);
  const [activeTheme, setActiveTheme] = useState<ThemeName>("light");
  const [exportTab, setExportTab] = useState<"css" | "json">("css");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.palette)) setRows(parsed.palette);
      if (parsed?.mapping) setMapping(parsed.mapping);
      if (parsed?.stopSet) setStopSet(parsed.stopSet);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ palette: rows, mapping, stopSet })
      );
    } catch {}
  }, [rows, mapping, stopSet]);

  const colorIds = useMemo(() => rows.map((r) => r.id), [rows]);

  const computed = useMemo(() => {
    return rows.map((r) => {
      if (!isValidHex(r.hex)) return { ...r, error: "Invalid hex" };
      try {
        const ramp = generateRamp9(normalizeHex(r.hex), stopSet);
        return { ...r, hex: normalizeHex(r.hex), ramp, error: undefined };
      } catch (e: any) {
        return { ...r, error: e?.message || "Failed to generate ramp" };
      }
    });
  }, [rows, stopSet]);

  const rampsById = useMemo(() => {
    const map: Record<string, Ramp> = {};
    for (const r of computed) if (r.ramp) map[r.id] = r.ramp;
    return map;
  }, [computed]);

  const tokenBundle = useMemo(() => {
    const ok = computed.every((r) => r.ramp && !r.error);
    if (!ok) return null;

    for (const theme of ["light", "dark"] as ThemeName[]) {
      const m = mapping[theme];
      const ids = new Set(colorIds);
      if (!Object.values(m).every((v) => ids.has(v))) return null;
    }

    try {
      return buildTokens(
        computed.map(({ id, label, hex }) => ({ id, label, hex })),
        rampsById,
        mapping
      );
    } catch {
      return null;
    }
  }, [computed, rampsById, mapping, colorIds]);

  function addColor() {
    setRows((prev) => {
      const id = uniqueId("new-color", new Set(prev.map((p) => p.id)));
      return [...prev, { id, label: "New Color", hex: "#888888" }];
    });
  }

  function removeColor(id: string) {
    setRows((prev) => prev.filter((p) => p.id !== id));
  }

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function updateMapping(
    theme: ThemeName,
    key: keyof ThemeMapping,
    value: string
  ) {
    setMapping((prev) => ({
      ...prev,
      [theme]: { ...prev[theme], [key]: value }
    }));
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied!");
    } catch {
      alert("Copy failed. Select the text and copy manually.");
    }
  }

  function download(filename: string, text: string) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="container" data-theme={activeTheme}>
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "flex-start" }}
      >
        <div>
          <h1 className="h1">Ramp to CSS</h1>
          <p className="sub">
            Generates 9-step ramps (100–900) using your Figma gradient-stop
            technique, then exports CSS tokens.
          </p>
        </div>

        <div className="row">
          <span className="pill">Theme</span>
          <button
            className="btn"
            onClick={() => setActiveTheme("light")}
            disabled={activeTheme === "light"}
          >
            Light
          </button>
          <button
            className="btn"
            onClick={() => setActiveTheme("dark")}
            disabled={activeTheme === "dark"}
          >
            Dark
          </button>
        </div>
      </div>

      <div className="grid">
        <section className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="row">
              <span className="pill">Ramp stop set</span>
              <select
                className="select"
                value={stopSet}
                onChange={(e) => setStopSet(e.target.value as any)}
                style={{ width: 220 }}
              >
                <option value="figma">
                  Figma-like (0,13,25,38,50,63,75,88,100)
                </option>
                <option value="even">
                  Even (0,12.5,25,37.5,50,62.5,75,87.5,100)
                </option>
              </select>
            </div>
            <button className="btn" onClick={addColor}>
              + Add color
            </button>
          </div>

          <div style={{ height: 12 }} />

          {computed.map((r) => (
            <div
              key={r.id}
              className="card"
              style={{ background: "#fff", marginBottom: 12 }}
            >
              <div className="row" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div className="row">
                    <input
                      className="input"
                      value={r.label}
                      onChange={(e) => updateRow(r.id, { label: e.target.value })}
                      placeholder="Label"
                      style={{ fontFamily: "var(--sans)" }}
                    />
                    <input
                      className="input"
                      value={r.id}
                      onChange={(e) =>
                        updateRow(r.id, {
                          id: slugifyId(e.target.value) || r.id
                        })
                      }
                      placeholder="id (kebab-case)"
                      style={{ width: 220 }}
                    />
                    <input
                      className="input"
                      value={r.hex}
                      onChange={(e) => updateRow(r.id, { hex: e.target.value })}
                      placeholder="#RRGGBB"
                      style={{ width: 140 }}
                    />
                    <button className="btn" onClick={() => removeColor(r.id)}>
                      Delete
                    </button>
                  </div>

                  {r.error ? (
                    <div
                      className="small"
                      style={{ color: "#b00020", marginTop: 6 }}
                    >
                      {r.error}
                    </div>
                  ) : null}

                  {r.ramp ? (
                    <div style={{ marginTop: 12 }} className="swatchGrid">
                      {STEPS.map((s) => (
                        <div
                          key={s}
                          className="swatch"
                          title={`${r.id}-${s} ${r.ramp?.[s]}`}
                        >
                          <div
                            className="swatchTop"
                            style={{ background: r.ramp?.[s] }}
                          />
                          <div className="swatchLabel">
                            <div>{s}</div>
                            <div>{r.ramp?.[s]}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </section>

        <aside className="card">
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Theme mapping</h2>
          <p className="small" style={{ marginTop: 0 }}>
            Pick which ramps drive surfaces, text, and accents. This is the
            semantic layer.
          </p>

          {(["light", "dark"] as ThemeName[]).map((theme) => (
            <div
              key={theme}
              className="card"
              style={{ background: "#fff", marginBottom: 12 }}
            >
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong style={{ textTransform: "capitalize" }}>{theme}</strong>
                <span className="pill">data-theme="{theme}"</span>
              </div>

              <div style={{ height: 10 }} />

              <MappingSelect
                label="Surface primary"
                value={mapping[theme].surfacePrimary}
                options={colorIds}
                onChange={(v) => updateMapping(theme, "surfacePrimary", v)}
              />
              <MappingSelect
                label="Surface inverse"
                value={mapping[theme].surfaceInverse}
                options={colorIds}
                onChange={(v) => updateMapping(theme, "surfaceInverse", v)}
              />
              <MappingSelect
                label="Text primary"
                value={mapping[theme].textPrimary}
                options={colorIds}
                onChange={(v) => updateMapping(theme, "textPrimary", v)}
              />
              <MappingSelect
                label="Text inverse"
                value={mapping[theme].textInverse}
                options={colorIds}
                onChange={(v) => updateMapping(theme, "textInverse", v)}
              />
              <MappingSelect
                label="Accent primary"
                value={mapping[theme].accentPrimary}
                options={colorIds}
                onChange={(v) => updateMapping(theme, "accentPrimary", v)}
              />
              <MappingSelect
                label="Accent inverse"
                value={mapping[theme].accentInverse}
                options={colorIds}
                onChange={(v) => updateMapping(theme, "accentInverse", v)}
              />

              <div style={{ height: 8 }} />
              <div className="small">
                Defaults: surfaces use 100/200 in light and 900/800 in dark, text
                uses 900 in light and 100 in dark, accents use 500/600/700 for
                states.
              </div>
            </div>
          ))}

          <h2 style={{ fontSize: 16 }}>Export</h2>
          <div className="row" style={{ marginBottom: 8 }}>
            <button
              className="btn"
              onClick={() => setExportTab("css")}
              disabled={exportTab === "css"}
            >
              CSS
            </button>
            <button
              className="btn"
              onClick={() => setExportTab("json")}
              disabled={exportTab === "json"}
            >
              JSON
            </button>
          </div>

          {!tokenBundle ? (
            <div className="small" style={{ color: "#b00020" }}>
              Fix palette errors and make sure theme mapping references existing
              color ids to enable export.
            </div>
          ) : (
            <>
              <div className="row" style={{ marginBottom: 8 }}>
                <button
                  className="btn"
                  onClick={() =>
                    copy(
                      exportTab === "css"
                        ? tokenBundle.css
                        : JSON.stringify(tokenBundle.json, null, 2)
                    )
                  }
                >
                  Copy
                </button>
                <button
                  className="btn"
                  onClick={() =>
                    download(
                      exportTab === "css" ? "tokens.css" : "tokens.json",
                      exportTab === "css"
                        ? tokenBundle.css
                        : JSON.stringify(tokenBundle.json, null, 2)
                    )
                  }
                >
                  Download
                </button>
              </div>

              <textarea
                className="input"
                style={{ height: 360, fontFamily: "var(--mono)", fontSize: 12 }}
                value={
                  exportTab === "css"
                    ? tokenBundle.css
                    : JSON.stringify(tokenBundle.json, null, 2)
                }
                readOnly
              />
            </>
          )}

          <div style={{ height: 12 }} />
          <h2 style={{ fontSize: 16 }}>Quick usage</h2>
          <pre
            className="small"
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "var(--mono)",
              margin: 0
            }}
          >
            {`1) Paste tokens.css into your project
2) Add theme attribute:
   <body data-theme="light">
3) Use semantic/component vars:
   color: var(--text-primary);
   background: var(--btn-primary-bg);`}
          </pre>
        </aside>
      </div>
    </main>
  );
}

function MappingSelect(props: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div className="small" style={{ marginBottom: 6 }}>
        {props.label}
      </div>
      <select
        className="select"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      >
        {props.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function uniqueId(base: string, used: Set<string>) {
  let i = 1;
  let id = base;
  while (used.has(id)) {
    i += 1;
    id = `${base}-${i}`;
  }
  return id;
}
