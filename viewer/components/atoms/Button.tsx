import React from 'react';

/**
 * Button Atom
 * 
 * Represents a clickable button with various styles.
 * Premium design with gradients and hover effects.
 */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'icon';
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode;
    fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    fullWidth = false,
    className = '',
    ...props
}) => {

    const baseStyles = "inline-flex items-center justify-center font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-lg shadow-[var(--accent-primary)]/30 hover:shadow-xl hover:shadow-[var(--accent-primary)]/40 border-none",
        secondary: "bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-glass)] border border-[var(--border-subtle)]",
        outline: "bg-transparent border border-[var(--accent-primary)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10",
        ghost: "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]",
        icon: "bg-transparent text-[var(--text-primary)] p-2 hover:bg-[var(--bg-tertiary)] rounded-full aspect-square"
    };

    const sizes = {
        sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5",
        md: "text-sm px-5 py-2.5 rounded-xl gap-2",
        lg: "text-base px-8 py-3.5 rounded-2xl gap-2.5"
    };

    // Icon variant overrides size padding usually
    const sizeStyle = variant === 'icon' ? "p-2" : sizes[size];
    const widthStyle = fullWidth ? "w-full" : "";

    // Since we are using Vanilla CSS variables but constructing classNames manually, 
    // we might need a utility or just stick to style attribute if Tailwind is not fully set up.
    // However, the prompt says "Avoid using TailwindCSS unless requested".
    // But I see "className" usage in the code I read (page.tsx).
    // The existing code uses `btn btn-primary`.
    // I will use `style` prop for dynamic vars or revert to className if `globals.css` defines them.
    // BUT, I should define these classes in `globals.css` or a module.
    // Given the task "Atomic Design System", creating a component that relies on global CSS classes is okay, 
    // OR I can use CSS Modules.
    // For now, I'll generate the component utilizing a class mapping, but I need to ENSURE those classes exist in globals.css.

    // I will write the styles in `components/atoms/Button.module.css` if possible, but Next.js usage of Vanilla CSS often uses Modules.
    // Let's assume global CSS for now as checking `globals.css` showed `.btn`, `.btn-primary`.

    // Updated Implementation:
    // I will return a button with classes that I WILL ADD to globals.css OR style objects.
    // Best approach: Use `style` for specific dynamic things, but classes for structure.
    // I'll stick to a clean implementation that maps props to classes.

    // MAPPING TO EXISTING/NEW CSS CLASSES:
    // .btn-primary -> variant=primary
    // .btn -> base

    // I will map these to specific class names and update globals.css to support them.

    const variantClass = `btn-${variant}`;
    const sizeClass = `btn-${size}`;
    const widthClass = fullWidth ? 'w-full' : '';

    return (
        <button
            className={`btn ${variantClass} ${sizeClass} ${widthClass} ${className}`}
            {...props}
        >
            {icon && <span className="btn-icon-wrapper">{icon}</span>}
            {children}
        </button>
    );
};

export default Button;
