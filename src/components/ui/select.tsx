import { Dropdown } from "./dropdown";
import type { DropdownOption } from "./dropdown";

interface SelectProps {
  name?: string;
  id?: string;
  label?: string;
  error?: string;
  options: DropdownOption[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
}

export function Select(props: SelectProps) {
  return <Dropdown {...props} />;
}
