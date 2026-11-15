import { type Specialty } from '../lib/api';
import { SPECIALTIES } from '../lib/format';

// Menu déroulant natif : sur iPhone il ouvre la roue de sélection, sur Android la liste système.
export function SpecialtySelect({ id, value, onChange, invalid }: { id: string; value: Specialty | null | ''; onChange: (value: Specialty) => void; invalid?: boolean }) {
  return (
    <div className="select-wrap">
      <select id={id} className="select" value={value ?? ''} aria-invalid={invalid || undefined} onChange={(event) => onChange(event.target.value as Specialty)}>
        <option value="" disabled>
          Choisis ta spécialité
        </option>
        {(Object.keys(SPECIALTIES) as Specialty[]).map((key) => (
          <option key={key} value={key}>
            {SPECIALTIES[key]}
          </option>
        ))}
      </select>
    </div>
  );
}
