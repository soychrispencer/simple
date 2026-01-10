import React from "react";
import FormInput, { InputProps as FormInputProps } from "../ui/form/Input";

// Wrapper to keep legacy forms import path in sync with the tokenized UI Input
export type InputProps = FormInputProps;

const Input: React.FC<InputProps> = (props) => <FormInput {...props} />;

export default Input;
