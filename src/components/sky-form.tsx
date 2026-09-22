import type { Dispatch, ReactNode, SetStateAction } from "react";

export type SkyKind = "constellation" | "star" | "nebula" | "cluster";

export const KIND_LABEL: Record<SkyKind, string> = {
  constellation: "별자리",
  star: "별",
  nebula: "성운",
  cluster: "성단",
};

export type SkyFormState = {
  id: string;
  kind: SkyKind;
  name: string;
  latin_name: string;
  summary: string;
  description: string;
  image_url: string;
  best_season: string;
  direction: string;
  magnitude: string;
};

export const emptySky: SkyFormState = {
  id: "",
  kind: "constellation",
  name: "",
  latin_name: "",
  summary: "",
  description: "",
  image_url: "",
  best_season: "",
  direction: "",
  magnitude: "",
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
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-3"
    >
      <Labeled label="분류">
        <select
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value as SkyKind })}
          className={inputClass}
        >
          {(Object.keys(KIND_LABEL) as SkyKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </Labeled>
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
