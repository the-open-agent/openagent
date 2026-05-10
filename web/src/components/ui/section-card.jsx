import React from "react";
import {cn} from "../../lib/utils";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "./card";

function SectionCard({title, desc, children, className, headerClassName, contentClassName, ...props}) {
  return (
    <Card className={cn("mb-4", className)} {...props}>
      {(title || desc) && (
        <CardHeader className={headerClassName}>
          {title && <CardTitle className="text-[15px] font-semibold">{title}</CardTitle>}
          {desc && <CardDescription className="text-[13px]">{desc}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

export default SectionCard;
