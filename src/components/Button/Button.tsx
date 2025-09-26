import type { ButtonHTMLAttributes } from "react";


interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export default function Button({ children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-700 transition font-medium"
    >
      {children}
    </button>
  );
}
