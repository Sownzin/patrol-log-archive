import logo from "@/assets/pmesp-logo.png.asset.json";
import { cn } from "@/lib/utils";

type Props = React.ImgHTMLAttributes<HTMLImageElement>;

export function PmespLogo({ className, alt = "Polícia Militar de São Paulo", ...rest }: Props) {
  return (
    <img
      src={logo.url}
      alt={alt}
      className={cn("inline-block object-contain", className)}
      {...rest}
    />
  );
}
