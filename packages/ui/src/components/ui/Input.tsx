import React from "react";
import FormInput, { InputProps } from "./form/Input";

// Wrapper to keep legacy import path while using the shared tokenized Input
export const Input: React.FC<InputProps> = (props) => <FormInput {...props} />;
export default Input;