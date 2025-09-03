import type {ReactNode} from 'react';

type Props = { children: ReactNode; className?: string }

export default function Tarjeta({ children, className = '' }: Props) {
    return (
        <div className={`rounded-xl border bg-white text-gray-900 shadow-sm
                     dark:bg-neutral-900 dark:text-neutral-100 ${className}`}>
            {children}
        </div>
    )
}
