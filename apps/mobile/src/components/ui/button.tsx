import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { Platform, Pressable } from 'react-native'
import { TextClassContext } from './text'
import { cn } from './utils'

const buttonVariants = cva(
  cn(
    'group shrink-0 flex-row items-center justify-center gap-2 rounded-md shadow-none',
    Platform.select({
      web: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive whitespace-nowrap outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    }),
  ),
  {
    variants: {
      size: {
        default: cn('h-10 px-4 py-2 sm:h-9', Platform.select({ web: 'has-[>svg]:px-3' })),
        icon: 'h-10 w-10 sm:h-9 sm:w-9',
        lg: cn('h-11 rounded-md px-6 sm:h-10', Platform.select({ web: 'has-[>svg]:px-4' })),
        sm: cn('h-9 gap-1.5 rounded-md px-3 sm:h-8', Platform.select({ web: 'has-[>svg]:px-2.5' })),
      },
      variant: {
        default: cn('bg-primary active:bg-primary/90 shadow-sm shadow-black/5', Platform.select({ web: 'hover:bg-primary/90' })),
        destructive: cn(
          'bg-destructive active:bg-destructive/90 shadow-sm shadow-black/5',
          Platform.select({ web: 'hover:bg-destructive/90 focus-visible:ring-destructive/20' }),
        ),
        ghost: cn('active:bg-accent', Platform.select({ web: 'hover:bg-accent' })),
        link: '',
        outline: cn('border-border bg-background active:bg-accent border shadow-sm shadow-black/5', Platform.select({ web: 'hover:bg-accent' })),
        secondary: cn('bg-secondary active:bg-secondary/80 shadow-sm shadow-black/5', Platform.select({ web: 'hover:bg-secondary/80' })),
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  },
)

const buttonTextVariants = cva(
  cn('text-foreground text-sm font-medium', Platform.select({ web: 'pointer-events-none transition-colors' })),
  {
    variants: {
      size: {
        default: '',
        icon: '',
        lg: '',
        sm: '',
      },
      variant: {
        default: 'text-primary-foreground',
        destructive: 'text-white',
        ghost: 'group-active:text-accent-foreground',
        link: cn('text-primary group-active:underline', Platform.select({ web: 'underline-offset-4 hover:underline group-hover:underline' })),
        outline: cn('group-active:text-accent-foreground', Platform.select({ web: 'group-hover:text-accent-foreground' })),
        secondary: 'text-secondary-foreground',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  },
)

type ButtonProps = React.ComponentProps<typeof Pressable> &
  React.RefAttributes<typeof Pressable> &
  VariantProps<typeof buttonVariants>

const defaultAndroidRipple = {
  color: 'rgba(0, 0, 0, 0.08)',
  borderless: false,
}

function Button({
  className,
  size,
  variant,
  android_ripple,
  ...props
}: ButtonProps) {
  const ripple =
    android_ripple ??
    (variant === 'ghost' || size === 'icon'
      ? { color: 'rgba(0, 0, 0, 0.08)', borderless: true }
      : defaultAndroidRipple)

  return (
    <TextClassContext.Provider value={buttonTextVariants({ size, variant })}>
      <Pressable
        android_ripple={Platform.OS === 'android' ? ripple : undefined}
        className={cn(props.disabled ? 'opacity-50' : null, buttonVariants({ size, variant }), className)}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  )
}

export { Button }
export type { ButtonProps }
