import { type ButtonHTMLAttributes } from "react";
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
};
const ButtonShowPsd = ({ className = "", children, type = "button", ...rest }: ButtonProps) => {
  return (
    <button type={type} className={className} {...rest}>
      {children}
    </button>
  );
};
export default ButtonShowPsd;