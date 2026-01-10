import React from "react";
import FormSelect, { SelectProps as FormSelectProps, SelectOption } from "../ui/form/Select";

// Wrapper to keep legacy forms import path in sync with the tokenized UI Select
export type { SelectOption };
export type SelectProps = FormSelectProps;

const Select: React.FC<SelectProps> = (props) => <FormSelect {...props} />;

export default Select;
