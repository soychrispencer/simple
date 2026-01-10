import React from "react";
import FormSelect, { SelectProps } from "./form/Select";

// Wrapper to keep legacy import path while using the shared tokenized Select
export const Select: React.FC<SelectProps> = (props) => <FormSelect {...props} />;
export default Select;