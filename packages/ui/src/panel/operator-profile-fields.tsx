'use client';

import type { OperatorProfileVertical, OperatorTier } from '@simple/utils';
import {
    getOperatorSubtypes,
    getOperatorTierOptions,
    isOperatorSubtypeOther,
    normalizeOperatorSubtype,
    OPERATOR_SUBTYPE_OTHER_ID,
} from '@simple/utils';
import { PanelField } from './panel-display.js';
import { PanelSelect } from './panel-select.js';
import { PANEL_INPUT_CLASS } from './panel-form-classes.js';
import {
    OPERATOR_BUSINESS_CUSTOM_FIELD,
    OPERATOR_BUSINESS_FIELD,
    OPERATOR_TYPE_FIELD,
} from './business-copy.js';

export type OperatorProfileFieldsProps = {
    vertical: OperatorProfileVertical;
    tier: OperatorTier;
    subtype: string | null;
    subtypeCustom?: string;
    onTierChange: (tier: OperatorTier) => void;
    onSubtypeChange: (subtype: string | null) => void;
    onSubtypeCustomChange?: (value: string) => void;
    disabled?: boolean;
};

export function OperatorProfileFields({
    vertical,
    tier,
    subtype,
    subtypeCustom = '',
    onTierChange,
    onSubtypeChange,
    onSubtypeCustomChange,
    disabled = false,
}: OperatorProfileFieldsProps) {
    const tierOptions = getOperatorTierOptions(vertical);
    const subtypes = getOperatorSubtypes(vertical, tier);
    const showSubtypeSelect = subtypes.length > 0;
    const showCustomField = isOperatorSubtypeOther(subtype);

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <PanelField label={OPERATOR_TYPE_FIELD.label} hint={OPERATOR_TYPE_FIELD.hint}>
                <PanelSelect
                    value={tier}
                    disabled={disabled}
                    onChange={(event) => {
                        const nextTier = event.target.value as OperatorTier;
                        onTierChange(nextTier);
                        onSubtypeChange(null);
                        onSubtypeCustomChange?.('');
                    }}
                >
                    {tierOptions.map((option) => (
                        <option key={option.tier} value={option.tier}>
                            {option.label}
                        </option>
                    ))}
                </PanelSelect>
            </PanelField>

            {showSubtypeSelect ? (
                <PanelField label={OPERATOR_BUSINESS_FIELD.label} hint={OPERATOR_BUSINESS_FIELD.hint}>
                    <PanelSelect
                        value={subtype ?? ''}
                        disabled={disabled}
                        onChange={(event) => {
                            const value = event.target.value;
                            const nextSubtype = value
                                ? normalizeOperatorSubtype(vertical, tier, value)
                                : null;
                            onSubtypeChange(nextSubtype);
                            if (nextSubtype !== OPERATOR_SUBTYPE_OTHER_ID) {
                                onSubtypeCustomChange?.('');
                            }
                        }}
                    >
                        <option value="">Selecciona una opción</option>
                        {subtypes.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.label}
                            </option>
                        ))}
                    </PanelSelect>
                </PanelField>
            ) : null}

            {showCustomField ? (
                <PanelField
                    label={OPERATOR_BUSINESS_CUSTOM_FIELD.label}
                    hint={OPERATOR_BUSINESS_CUSTOM_FIELD.hint}
                    className="sm:col-span-2"
                >
                    <input
                        className={PANEL_INPUT_CLASS}
                        value={subtypeCustom}
                        disabled={disabled}
                        onChange={(event) => onSubtypeCustomChange?.(event.target.value)}
                        placeholder={OPERATOR_BUSINESS_CUSTOM_FIELD.placeholder}
                    />
                </PanelField>
            ) : null}
        </div>
    );
}
