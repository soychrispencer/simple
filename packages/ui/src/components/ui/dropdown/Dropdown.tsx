"use client";
import React, { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";

type Placement = "bottom-start" | "bottom-end" | "bottom-center";

interface DropdownContextValue {
	open: boolean;
	setOpen: (next: boolean) => void;
	triggerId: string;
	menuId: string;
	triggerRef: React.RefObject<HTMLButtonElement | null>;
	menuRef: React.RefObject<HTMLDivElement | null>;
	placement: Placement;
	handleMouseEnter: () => void;
	handleMouseLeave: () => void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdownContext() {
	const ctx = useContext(DropdownContext);
	if (!ctx) throw new Error("Dropdown components must be used within <Dropdown>");
	return ctx;
}

interface DropdownProps {
	children: React.ReactNode;
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	placement?: Placement;
	closeOnMouseLeave?: boolean;
	closeDelay?: number;
}

export function Dropdown({
	children,
	open: controlledOpen,
	defaultOpen = false,
	onOpenChange,
	placement = "bottom-end",
	closeOnMouseLeave = false,
	closeDelay = 200,
}: DropdownProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
	const open = controlledOpen ?? uncontrolledOpen;
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const menuRef = useRef<HTMLDivElement | null>(null);
	const closeTimeoutRef = useRef<number | null>(null);
	const baseId = useId();
	const triggerId = `${baseId}-trigger`;
	const menuId = `${baseId}-menu`;

	const setOpen = React.useCallback(
		(next: boolean) => {
			if (controlledOpen === undefined) setUncontrolledOpen(next);
			onOpenChange?.(next);
		},
		[controlledOpen, onOpenChange]
	);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			if (!open) return;
			if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
			setOpen(false);
		};
		const handleKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKey);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKey);
		};
	}, [open, setOpen]);

	const handleMouseEnter = React.useCallback(() => {
		if (!closeOnMouseLeave) return;
		if (closeTimeoutRef.current) {
			window.clearTimeout(closeTimeoutRef.current);
			closeTimeoutRef.current = null;
		}
	}, [closeOnMouseLeave]);

	const handleMouseLeave = React.useCallback(() => {
		if (!closeOnMouseLeave) return;
		if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
		closeTimeoutRef.current = window.setTimeout(() => {
			setOpen(false);
		}, closeDelay);
	}, [closeDelay, closeOnMouseLeave, setOpen]);

	const value = useMemo<DropdownContextValue>(
		() => ({
			open,
			setOpen,
			triggerId,
			menuId,
			triggerRef,
			menuRef,
			placement,
			handleMouseEnter,
			handleMouseLeave,
		}),
		[open, setOpen, triggerId, menuId, placement, handleMouseEnter, handleMouseLeave]
	);

	return (
		<DropdownContext.Provider value={value}>
			{children}
		</DropdownContext.Provider>
	);
}

type DropdownTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	children: React.ReactNode;
	asChild?: boolean;
};

export function DropdownTrigger({ children, className = "", asChild = false, ...props }: DropdownTriggerProps) {
	const { open, setOpen, triggerId, menuId, triggerRef, handleMouseEnter, handleMouseLeave } = useDropdownContext();

	if (asChild && React.isValidElement(children)) {
		const child = children as React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>;
		const mergedOnClick = (e: React.MouseEvent<HTMLButtonElement>) => {
			props.onClick?.(e);
			const childOnClick = (child.props as React.ButtonHTMLAttributes<HTMLButtonElement>).onClick;
			if (childOnClick) childOnClick(e);
			setOpen(!open);
		};

		const clonedProps: React.ButtonHTMLAttributes<HTMLButtonElement> = {
			"aria-haspopup": "menu",
			"aria-expanded": open,
			"aria-controls": menuId,
			id: triggerId,
			onClick: mergedOnClick,
		};

		return (
			<span
				ref={triggerRef}
				className={["inline-flex items-center", className].join(" ").trim()}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
			>
				{React.cloneElement(child, clonedProps)}
			</span>
		);
	}

	return (
		<button
			type="button"
			ref={triggerRef}
			aria-haspopup="menu"
			aria-expanded={open}
			aria-controls={menuId}
			id={triggerId}
			onClick={(e) => {
				props.onClick?.(e);
				setOpen(!open);
			}}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			className={["inline-flex items-center", className].join(" ").trim()}
			{...props}
		>
			{children}
		</button>
	);
}

interface DropdownMenuProps extends React.HTMLAttributes<HTMLDivElement> {
	widthClassName?: string;
}

export function DropdownMenu({ children, className = "", widthClassName = "min-w-[200px]", style, ...props }: DropdownMenuProps) {
	const { open, menuId, triggerId, menuRef, placement, handleMouseEnter, handleMouseLeave } = useDropdownContext();

	const alignment =
		placement === "bottom-end"
			? "right-0"
			: placement === "bottom-center"
				? "left-1/2 -translate-x-1/2"
				: "left-0";

	return (
		<div
			ref={menuRef}
			id={menuId}
			role="menu"
			aria-labelledby={triggerId}
			className={[
				"absolute top-full mt-2 z-50",
				alignment,
				"card-surface card-surface-raised shadow-card rounded-2xl overflow-hidden py-2",
				"text-sm text-[var(--text-primary)]", // usa tokens para texto
				widthClassName,
				open ? "" : "hidden",
				className,
			].join(" ").replace(/\s+/g, " ").trim()}
			style={style}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			{...props}
		>
			{children}
		</div>
	);
}

interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	leftIcon?: React.ReactNode;
	rightIcon?: React.ReactNode;
	danger?: boolean;
	disableHoverBg?: boolean;
}

export function DropdownItem({
	children,
	leftIcon,
	rightIcon,
	danger = false,
	disableHoverBg = false,
	className = "",
	...props
}: DropdownItemProps) {
	const { setOpen } = useDropdownContext();
	return (
		<button
			type="button"
			role="menuitem"
			onClick={(e) => {
				props.onClick?.(e);
				setOpen(false);
			}}
			className={[
				"w-full px-3 py-2 text-left flex items-center gap-3",
				"rounded-md transition-colors",
				danger
					? "text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle-bg)]"
					: disableHoverBg
						? ""
						: "hover:bg-[var(--field-bg-hover)]",
				"text-sm font-medium text-[var(--text-primary)]",
				className,
			].join(" ").replace(/\s+/g, " ").trim()}
			{...props}
		>
			{leftIcon ? <span className="flex items-center text-current">{leftIcon}</span> : null}
			<span className="flex-1 min-w-0 truncate">{children}</span>
			{rightIcon ? <span className="flex items-center text-current">{rightIcon}</span> : null}
		</button>
	);
}

export function DropdownSeparator({ className = "" }: { className?: string }) {
	return <div className={["my-2 h-px bg-border/60", className].join(" ").trim()} />;
}

export const DropdownLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
	<div className={["px-3 py-1 text-xs font-semibold uppercase tracking-wide text-lighttext/60 dark:text-darktext/60", className].join(" ").trim()}>
		{children}
	</div>
);

export default Dropdown;
