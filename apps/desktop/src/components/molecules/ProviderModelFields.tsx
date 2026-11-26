import { PROVIDER_LABELS } from '@agents-office-app/domain';
import type { ProviderKind, ReasoningEffort } from '@agents-office-app/domain';
import { EFFORTS, EFFORT_LABELS, PROVIDERS } from '../../lib/view/options.ts';
import { SelectField } from '../atoms/SelectField.tsx';
import { TextField } from '../atoms/TextField.tsx';

export function ProviderModelFields({
  provider,
  model,
  effort,
  onProvider,
  onModel,
  onEffort,
}: {
  provider: ProviderKind;
  model: string;
  effort: ReasoningEffort;
  onProvider: (value: ProviderKind) => void;
  onModel: (value: string) => void;
  onEffort: (value: ReasoningEffort) => void;
}) {
  return (
    <div className="field-grid">
      <SelectField
        label="プロバイダ"
        value={provider}
        onChange={(value) => onProvider(value as ProviderKind)}
      >
        {PROVIDERS.map((value) => (
          <option key={value} value={value}>
            {PROVIDER_LABELS[value]}
          </option>
        ))}
      </SelectField>
      <TextField
        label="モデル"
        value={model}
        placeholder="空欄で既定"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={onModel}
      />
      <SelectField
        label="思考の深さ"
        value={effort}
        onChange={(value) => onEffort(value as ReasoningEffort)}
      >
        {EFFORTS.map((value) => (
          <option key={value} value={value}>
            {EFFORT_LABELS[value]}
          </option>
        ))}
      </SelectField>
    </div>
  );
}
