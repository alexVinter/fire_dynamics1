import { useState } from "react";
import TechniquePicker from "../components/TechniquePicker";

export default function DemoTechniquePicker() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div style={{ maxWidth: 480 }}>
      <h3>Выбор техники (demo)</h3>
      <TechniquePicker value={selectedId} onChange={setSelectedId} />
      <p style={{ marginTop: 12 }}>
        Выбрано: {selectedId !== null ? `technique_id = ${selectedId}` : "—"}
      </p>
    </div>
  );
}
