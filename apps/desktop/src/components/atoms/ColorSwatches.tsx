/** Preset colour buttons plus a free colour picker. */
export function ColorSwatches({
  legend,
  colors,
  value,
  onChange,
}: {
  legend: string;
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <fieldset className="field swatches">
      <legend>{legend}</legend>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className="swatch"
          style={{ background: color }}
          aria-label={`色 ${color}`}
          aria-pressed={value.toLowerCase() === color}
          onClick={() => onChange(color)}
        />
      ))}
      <input
        type="color"
        aria-label="好きな色を選ぶ"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </fieldset>
  );
}
