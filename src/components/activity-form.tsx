import type { Dispatch, SetStateAction } from "react";

export type ActivityFormState = {
  id: string;
  title: string;
  category: string;
  location: string;
  description: string;
  starts_at: string;
  ends_at: string;
  apply_deadline: string;
  capacity: string;
  stardust_reward: string;
};

export const emptyActivity: ActivityFormState = {
  id: "",
  title: "",
  category: "관측회",
  location: "",
  description: "",
  starts_at: "",
  ends_at: "",
  apply_deadline: "",
  capacity: "",
};

export const ACTIVITY_CATEGORIES = ["관측회", "번개 관측", "세미나", "정기모임", "기타"];

const inputClass =
  "w-full rounded-sm border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50";

export function ActivityForm({
  form,
  setForm,
  onSubmit,
  pending,
}: {
  form: ActivityFormState;
  setForm: Dispatch<SetStateAction<ActivityFormState>>;
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
      <Labeled label="제목">
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className={inputClass}
        />
      </Labeled>
      <Labeled label="유형">
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className={inputClass}
        >
          {ACTIVITY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Labeled>
      <Labeled label="시작 일시">
        <input
          type="datetime-local"
          value={form.starts_at}
          onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
          className={inputClass}
        />
      </Labeled>
      <Labeled label="종료 일시 (선택)">
        <input
          type="datetime-local"
          value={form.ends_at}
          onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
          className={inputClass}
        />
      </Labeled>
      <Labeled label="신청 마감일">
        <input
          type="datetime-local"
          value={form.apply_deadline}
          onChange={(e) => setForm({ ...form, apply_deadline: e.target.value })}
          className={inputClass}
        />
      </Labeled>
      <Labeled label="장소">
        <input
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          className={inputClass}
        />
      </Labeled>
      <Labeled label="정원 (선택)">
        <input
          type="number"
          min={1}
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          className={inputClass}
        />
      </Labeled>
      <Labeled label="설명">
        <textarea
          rows={4}
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

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label-mono mb-2">{label}</p>
      {children}
    </div>
  );
}
