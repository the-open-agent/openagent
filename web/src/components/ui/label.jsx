import React from "react";
import {cn} from "../../lib/utils";

const Label = React.forwardRef(({className, ...props}, ref) => (
  <label
    ref={ref}
    className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
    {...props}
  />
));
Label.displayName = "Label";

export {Label};
