import { type RouteConfig, index, layout, route } from "@react-router/dev/routes"

export default [
  // Auth routes (outside layout — no sidebar/header)
  route("signin", "routes/SigninPage.tsx"),
  route("callback", "routes/AuthCallback.tsx"),

  // Main app layout
  layout("routes/_layout.tsx", [
    index("routes/HomePage.tsx"),

    // Stores
    route("stores", "routes/StoreListPage.tsx"),
    route("stores/:owner/:storeName/chats", "routes/ChatListPage.tsx", { id: "store-chats-list" }),
    route("stores/:owner/:storeName/messages", "routes/MessageListPage.tsx", { id: "store-messages-list" }),
    route("stores/:owner/:storeName/vectors", "routes/VectorListPage.tsx", { id: "store-vectors-list" }),
    route("stores/:owner/:storeName", "routes/StoreEditPage.tsx"),

    // Providers
    route("providers", "routes/ProviderListPage.tsx"),
    route("providers/:providerName", "routes/ProviderEditPage.tsx"),

    // Pipes
    route("pipes", "routes/PipeListPage.tsx"),
    route("pipes/:pipeName", "routes/PipeEditPage.tsx"),

    // Skills
    route("skills", "routes/SkillListPage.tsx"),
    route("skills/:skillName", "routes/SkillEditPage.tsx"),

    // Tools
    route("tools", "routes/ToolListPage.tsx"),
    route("tools/:toolName", "routes/ToolEditPage.tsx"),

    // MCP Servers
    route("servers", "routes/ServerListPage.tsx"),
    route("servers/:serverName", "routes/ServerEditPage.tsx"),

    // Sites
    route("sites", "routes/SiteListPage.tsx"),
    route("sites/:owner/:siteName", "routes/SiteEditPage.tsx"),

    // Quick Setup
    route("quick-setup", "routes/QuickSetupPage.tsx"),

    // Usages
    route("usages", "routes/UsagePage.tsx"),

    // Visitors
    route("visitors", "routes/VisitorPage.tsx"),

    // System Info
    route("sysinfo", "routes/SystemInfoPage.tsx"),

    // Chat
    route("chat", "routes/ChatPage.tsx", { id: "chat" }),
    route("chat/:chatName", "routes/ChatPage.tsx", { id: "chat-by-name" }),
    route(":owner/:storeName/chat", "routes/ChatPage.tsx", { id: "store-chat" }),
    route(":owner/:storeName/chat/:chatName", "routes/ChatPage.tsx", { id: "store-chat-by-name" }),

    // Chats admin
    route("chats", "routes/ChatListPage.tsx"),
    route("chats/:chatName", "routes/ChatEditPage.tsx"),

    // Messages admin
    route("messages", "routes/MessageListPage.tsx"),
    route("messages/:messageName", "routes/MessageEditPage.tsx"),

    // Sessions
    route("sessions", "routes/SessionListPage.tsx"),

    // Files
    route("files", "routes/FileListPage.tsx"),
    route("files/:fileName", "routes/FileViewPage.tsx"),

    // Vectors
    route("vectors", "routes/VectorListPage.tsx"),
    route("vectors/:vectorName", "routes/VectorEditPage.tsx"),

    // Records
    route("records", "routes/RecordListPage.tsx"),
    route("records/:organizationName/:recordName", "routes/RecordEditPage.tsx"),

    // Tasks
    route("tasks", "routes/TaskListPage.tsx"),
    route("tasks/:owner/:taskName", "routes/TaskEditPage.tsx"),

    // Scales
    route("scales", "routes/ScaleListPage.tsx"),
    route("scales/:owner/:scaleName", "routes/ScaleEditPage.tsx"),

    // Resources
    route("resources", "routes/ResourceListPage.tsx"),

    // Account
    route("account", "routes/AccountPage.tsx"),
  ]),
] satisfies RouteConfig
