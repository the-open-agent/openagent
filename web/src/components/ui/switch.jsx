import React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import {cn} from "../../lib/utils";

const Switch = React.forwardRef(({className, checked, style, ...props}, ref) => {
  const isChecked = checked === true;

  const mergedRootStyle = {
    backgroundColor: isChecked ? "#3b82f6" : "#d1d5db",
    border: "none",
    transition: "background-color 0.15s ease",
    ...style,
  };

  const thumbStyle = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    left: isChecked ? 16 : 2,
    width: 18,
    height: 18,
    borderRadius: "50%",
    backgroundColor: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
    transition: "left 0.15s ease",
    pointerEvents: "none",
  };

  return (
    <SwitchPrimitive.Root
      ref={ref}
      checked={checked}
      className={cn(
        "peer relative inline-flex h-[22px] w-9 shrink-0 cursor-pointer items-center rounded-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={mergedRootStyle}
      {...props}
    >
      <SwitchPrimitive.Thumb style={thumbStyle} />
    </SwitchPrimitive.Root>
  );
});
Switch.displayName = SwitchPrimitive.Root.displayName;

export {Switch};
