import { useEffect, useState } from "react";
import { apiGet } from "../api/client";

interface EngineOption {
  id: number;
  engine_name: string;
  year_from: number | null;
  year_to: number | null;
}

interface Props {
  techniqueId: number | null;
  engineOptionId: number | null;
  engineText: string;
  onChangeOptionId: (id: number | null) => void;
  onChangeText: (text: string) => void;
}

export default function EngineSelect({
  techniqueId, engineOptionId, engineText, onChangeOptionId, onChangeText,
}: Props) {
  const [options, setOptions] = useState<EngineOption[]>([]);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (!techniqueId) { setOptions([]); return; }
    apiGet<EngineOption[]>(`/techniques/${techniqueId}/engines`)
      .then(setOptions)
      .catch(() => setOptions([]));
  }, [techniqueId]);

  if (!techniqueId) return <span style={{ color: "#888", fontSize: 13 }}>Выберите технику</span>;

  if (manual || options.length === 0) {
    return (
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <input
          placeholder="Двигатель (вручную)"
          value={engineText}
          onChange={(e) => { onChangeText(e.target.value); onChangeOptionId(null); }}
          style={{ width: 160, padding: 4 }}
        />
        {options.length > 0 && (
          <button type="button" onClick={() => setManual(false)} style={{ fontSize: 12 }}>Из списка</button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <select
        value={engineOptionId ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          if (val) { onChangeOptionId(Number(val)); onChangeText(""); }
          else { onChangeOptionId(null); }
        }}
        style={{ padding: 4 }}
      >
        <option value="">— выбрать —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.engine_name}</option>
        ))}
      </select>
      <button type="button" onClick={() => setManual(true)} style={{ fontSize: 12 }}>Вручную</button>
    </div>
  );
}
