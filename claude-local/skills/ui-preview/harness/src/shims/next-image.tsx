// Stand-in for `next/image`: a plain <img>. Accepts static-import objects and URLs.
import { forwardRef, type CSSProperties, type ImgHTMLAttributes } from "react";

type Src = string | { src: string; width?: number; height?: number; default?: { src: string } };

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: Src;
  fill?: boolean;
  priority?: boolean;
  quality?: number | string;
  placeholder?: string;
  blurDataURL?: string;
  loader?: unknown;
  unoptimized?: boolean;
  layout?: string;
  objectFit?: CSSProperties["objectFit"];
  objectPosition?: string;
  onLoadingComplete?: (img: HTMLImageElement) => void;
}

const Image = forwardRef<HTMLImageElement, Props>(function Image(
  {
    src,
    fill,
    priority: _priority,
    quality: _quality,
    placeholder: _placeholder,
    blurDataURL: _blur,
    loader: _loader,
    unoptimized: _unoptimized,
    layout,
    objectFit,
    objectPosition,
    onLoadingComplete,
    style,
    width,
    height,
    ...rest
  },
  ref,
) {
  const obj = typeof src === "object" ? (src.default ?? src) : null;
  const url = obj ? obj.src : (src as string);
  const fillStyle: CSSProperties =
    fill || layout === "fill"
      ? { position: "absolute", inset: 0, width: "100%", height: "100%" }
      : {};
  return (
    <img
      ref={ref}
      src={url}
      width={width ?? (obj as { width?: number } | null)?.width}
      height={height ?? (obj as { height?: number } | null)?.height}
      style={{ ...fillStyle, objectFit, objectPosition, ...style }}
      onLoad={(e) => onLoadingComplete?.(e.currentTarget)}
      {...rest}
    />
  );
});

export const getImageProps = (props: Props) => ({ props });
export default Image;
