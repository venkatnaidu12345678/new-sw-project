import { useEffect, useState } from "react";
import { IconSearch } from "./icons";
import { inputClass } from "./primitives";

/**
 * Search field with instant typing feedback and debounced `onDebouncedChange`.
 */
export default function SearchInput({
  value: controlledValue,
  onDebouncedChange,
  debounceMs = 300,
  placeholder = "Search…",
  className = "",
  inputClassName = "",
  ...rest
}) {
  const isControlled = controlledValue !== undefined;
  const [local, setLocal] = useState(controlledValue ?? "");

  useEffect(() => {
    if (isControlled) setLocal(controlledValue ?? "");
  }, [controlledValue, isControlled]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onDebouncedChange?.(local);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [local, debounceMs, onDebouncedChange]);

  return (
    <div className={`relative min-w-[200px] max-w-sm flex-1 ${className}`}>
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
        <IconSearch />
      </span>
      <input
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className={inputClass(`pl-10 ${inputClassName}`)}
        autoComplete="off"
        {...rest}
      />
    </div>
  );
}
