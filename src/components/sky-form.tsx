import type { Dispatch, ReactNode, SetStateAction } from "react";

export type SkyScale = "solar" | "stellar" | "galactic";

export const SCALE_LABEL: Record<SkyScale, string> = {
  solar: "태양계 규모",
  stellar: "항성계 · 은하 규모",
  galactic: "은하 이상 규모",
};

export const KIND_LABEL: Record<string, string> = {
  star: "항성 (별)",
  planet: "행성",
  dwarf_planet: "왜행성",
  moon: "위성",
  asteroid: "소행성",
  comet: "혜성",
  meteoroid: "유성체 · 운석",
  minor_body: "왜소행성체",
  cluster: "성단",
  nebula: "성운",
  remnant: "항성 잔해체",
  exoplanet: "계외행성",
  brown_dwarf: "갈색왜성",
  galaxy: "은하",
  galaxy_cluster: "은하단 · 은하군",
  supercluster: "초은하단",
  quasar: "퀘이사 · 활동은하핵",
  large_structure: "우주 거대구조",
};

export const SCALE_KINDS: Record<SkyScale, string[]> = {
  solar: ["star", "planet", "dwarf_planet", "moon", "asteroid", "comet", "meteoroid", "minor_body"],
  stellar: ["cluster", "nebula", "remnant", "exoplanet", "brown_dwarf"],
  galactic: ["galaxy", "galaxy_cluster", "supercluster", "quasar", "large_structure"],
};

export const SUBTYPE_OPTIONS: Record<string, string[]> = {
  cluster: ["산개성단", "구상성단"],
  nebula: ["발광성운", "반사성운", "암흑성운", "행성상성운", "초신성 잔해"],
  remnant: ["백색왜성", "중성자별 (펄서)", "블랙홀"],
  galaxy: ["나선은하", "타원은하", "불규칙은하"],
  large_structure: ["필라멘트", "보이드", "기타"],
  minor_body: ["카이퍼벨트 천체", "센타우르족", "산란원반 천체"],
};

export const SCALE_LIST: SkyScale[] = ["solar", "stellar", "galactic"];

export function scaleOfKind(kind: string): SkyScale {
  return (SCALE_LIST.find((s) => SCALE_KINDS[s].includes(kind)) ?? "solar") as SkyScale;
}

export type SkyFormState = {
  id: string;
  scale: SkyScale;
  kind_code: string;
  subtype: string;
  name: string;
  latin_name: string;
  summary: string;
  description: string;
  image_url: string;
  best_season: string;
  direction: string;
  magnitude: string;
  ra: string;
  decl: string;
};

export const emptySky: SkyFormState = {
  id: "",
  scale: "solar",
  kind_code: "star",
  subtype: "",
  name: "",
  latin_name: "",
  summary: "",
  description: "",
  image_url: "",
  best_season: "",
  direction: "",
  magnitude: "",
  ra: "",
  decl: "",
};

const inputClass =
  "w-full rounded-sm border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50";

export function SkyForm({
  form,
  setForm,
  onSubmit,
  pending,
}: {
  form: SkyFormState;
  setForm: Dispatch<SetStateAction<SkyFormState>>;
  onSubmit: () => void;
  pending: boolean;
}) {
  const subtypes = SUBTYPE_OPTIONS[form.kind_code] ?? [];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-3"
    >
      <Labeled label="규모">
        <select
          value={form.scale}
          onChange={(e) => {
            const scale = e.target.value as SkyScale;
            setForm({ ...form, scale, kind_code: SCALE_KINDS[scale][0]!, subtype: "" });
          }}
          className={inputClass}
        >
          {SCALE_LIST.map((s) => (
            <option key={s} value={s}>
              {SCALE_LABEL[s]}
            </option>
          ))}
        </select>
      </Labeled>
      <Labeled label="종류">
        <select
          value={form.kind_code}
          onChange={(e) => setForm({ ...form, kind_code: e.target.value, subtype: "" })}
          className={inputClass}
        >
          {SCALE_KINDS[form.scale].map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </Labeled>
      {subtypes.length > 0 && (
        <Labeled label="세부 분류 (선택)">
          <select
            value={form.subtype}
            onChange={(e) => setForm({ ...form, subtype: e.target.value })}
            className={inputClass}
          >
            <option value="">선택 안 함</option>
            {subtypes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Labeled>
      )}
      <Labeled label="이름">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={inputClass}
        />
      </Labeled>
      <Labeled label="학명 · 기호">
        <input
          value={form.latin_name}
          onChange={(e) => setForm({ ...form, latin_name: e.target.value })}
          className={inputClass}
        />
      </Labeled>
      <Labeled label="한 줄 소개">
        <input
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
          className={inputClass}
        />
      </Labeled>
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="적경 (RA)">
          <input
            value={form.ra}
            onChange={(e) => setForm({ ...form, ra: e.target.value })}
            placeholder="05h 35m 17s"
            className={`${inputClass} font-mono`}
          />
        </Labeled>
        <Labeled label="적위 (Dec)">
          <input
            value={form.decl}
            onChange={(e) => setForm({ ...form, decl: e.target.value })}
            placeholder="−05° 23′ 28″"
            className={`${inputClass} font-mono`}
          />
        </Labeled>
      </div>
      <p className="font-mono text-[11px] text-muted-foreground">
        행성 · 위성처럼 고정 좌표가 없는 천체는 대표 좌표나 &quot;가변&quot; 등으로 적어 주세요.
      </p>
      <Labeled label="관측 시기">
        <input
          value={form.best_season}
          onChange={(e) => setForm({ ...form, best_season: e.target.value })}
          className={inputClass}
        />
      </Labeled>
      <Labeled label="관측 방향">
        <input
          value={form.direction}
          onChange={(e) => setForm({ ...form, direction: e.target.value })}
          className={inputClass}
        />
      </Labeled>
      <Labeled label="겉보기 등급">
        <input
          value={form.magnitude}
          onChange={(e) => setForm({ ...form, magnitude: e.target.value })}
          className={inputClass}
        />
      </Labeled>
      <Labeled label="이미지 URL (선택)">
        <input
          value={form.image_url}
          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          className={inputClass}
        />
      </Labeled>
      <Labeled label="설명">
        <textarea
          rows={5}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={`${inputClass} resize-y`}
        />
      </Labeled>
      <button
        type="submit"
        disabled={pending}
        className="glow-cyan w-full rounded-sm bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        저장
      </button>
    </form>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="label-mono mb-2">{label}</p>
      {children}
    </div>
  );
}
