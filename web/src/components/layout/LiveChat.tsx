import * as React from "react";
import i18next from "i18next";
import {Headset} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {useSite} from "@/hooks/use-site";

type ChatUser = {name?: string};

declare global {
  interface Window {
    Casdesk?: {open: () => void; setUser: (user: ChatUser) => void};
    CasdeskSettings?: {user?: ChatUser};
  }
}

/**
 * The live chat (Casdesk) of the built-in site, shown when it sets `chatWidgetUrl`
 * and `chatSite`: the widget loads without its round button, which would cover the
 * chat input, and this header button opens it. The user's name goes along, so the
 * agents know who is writing.
 */
export function LiveChatButton({account}: {account: any}) {
  const {site} = useSite();
  const url: string = site?.chatWidgetUrl ?? "";
  const chatSite: string = site?.chatSite ?? "";

  React.useEffect(() => {
    const name = [account?.displayName || account?.name, account?.affiliation].filter(Boolean).join("，");
    const user = name ? {name} : {};
    window.CasdeskSettings = {user};
    window.Casdesk?.setUser(user);
  }, [account?.displayName, account?.name, account?.affiliation]);

  React.useEffect(() => {
    if (!url || !chatSite || document.getElementById("casdesk-script")) {
      return;
    }
    const script = document.createElement("script");
    script.id = "casdesk-script";
    script.async = true;
    script.src = url;
    script.dataset.site = chatSite;
    script.dataset.launcher = "false";
    document.body.appendChild(script);
  }, [url, chatSite]);

  if (!url || !chatSite) {
    return null;
  }

  // the widget's own page, when the widget did not load
  const open = () => {
    if (window.Casdesk) {
      window.Casdesk.open();
    } else {
      window.open(url.replace(/\/widget\.js$/, `/chat/${chatSite}`), "_blank", "noopener");
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={i18next.t("general:Online support")} onClick={open}>
          <Headset />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{i18next.t("general:Online support")}</TooltipContent>
    </Tooltip>
  );
}
