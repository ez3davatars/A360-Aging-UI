import { AppState } from "../state/subjectReducer";
import ImageTile from "../components/ImageTile";
import ComfyTimeline from "../components/ComfyTimeline";

type Props = {
  state: AppState;
};

export default function SubjectDashboard({ state }: Props) {
  return (
    <div>
      <h2>Live Subject Monitor</h2>

      {Object.entries(state.subjects).map(([id, subject]) => (
        <div key={id} style={{ border: "1px solid #ccc", padding: 12, marginBottom: 20 }}>
          <h3>{id}</h3>

          <h4>Prompt Outputs</h4>
          {Object.entries(subject.promptOutputs).map(([k, v]) => (
            <ImageTile key={k} label={k} image={v} />
          ))}

          <h4>Anchors</h4>
          {Object.entries(subject.anchors).map(([k, v]) => (
            <ImageTile key={k} label={k} image={v} />
          ))}

          <ComfyTimeline outputs={subject.comfyOutputs} />
        </div>
      ))}
    </div>
  );
}

