import ImageTile from "./ImageTile";

type Props = {
  outputs: Record<string, any>;
};

export default function ComfyTimeline({ outputs }: Props) {
  const ages = [
    "A25","A30","A35","A40","A45",
    "A50","A55","A60","A65","A70",
  ];

  return (
    <div>
      <h3>ComfyUI Outputs</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {ages.map((age) => (
          <ImageTile
            key={age}
            label={age}
            image={outputs?.[`${age}.png`]}
          />
        ))}
      </div>
    </div>
  );
}
