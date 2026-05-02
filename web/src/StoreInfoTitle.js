// Copyright 2025 The OpenAgent Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, {useEffect, useMemo, useRef, useState} from "react";
import {Button, Segmented, Select, Switch} from "antd";
import {FontSizeOutlined, MinusOutlined, PictureOutlined, PlusOutlined} from "@ant-design/icons";
import * as Setting from "./Setting";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as ChatBackend from "./backend/ChatBackend";
import i18next from "i18next";

const StoreInfoTitle = (props) => {
  const {chat, stores, onChatUpdated, onStoreChange, autoRead, onUpdateAutoRead, account, paneCount = 1, onPaneCountChange, showPaneControls = false, generationMode = "text", onGenerationModeChange} = props;

  const [modelProviders, setModelProviders] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [defaultStore, setDefaultStore] = useState(null);

  const isDark = Setting.getIsDark();

  // Use refs to track the latest state values
  const storeRef = useRef();
  const providerRef = useRef();
  const chatRef = useRef();

  useEffect(() => {
    if (stores) {
      const foundDefaultStore = stores.find(store => store.isDefault);
      setDefaultStore(foundDefaultStore);
    }
  }, [stores]);

  // Filter stores based on user type and pane count
  const filteredStores = useMemo(() => {
    if (!stores || !defaultStore) {return [];}

    // In multi-pane mode, all stores are available
    if (paneCount > 1) {
      return stores;
    }

    // In single chat mode: all users (including admin and chat-admin) can only see childStores
    if (defaultStore.childStores && defaultStore.childStores.length > 0) {
      const childStoreNames = new Set(defaultStore.childStores);
      return stores.filter(store => childStoreNames.has(store.name));
    }

    return [];
  }, [stores, defaultStore, paneCount]);

  // Check if user can manage panes: only admin and chat-admin
  const canManagePanes = useMemo(() => {
    return Setting.isLocalAdminUser(account);
  }, [account]);

  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768); // Common breakpoint for mobile devices
    };

    // Initial check
    checkIsMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkIsMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Update refs when props change
  useEffect(() => {
    chatRef.current = chat;
  }, [chat]);

  // Find the current store info
  const storeInfo = chat
    ? stores?.find(store => store.name === chat.store)
    : null;

  // Initialize the local state when props change
  useEffect(() => {
    if (storeInfo) {
      setSelectedStore(storeInfo);
      storeRef.current = storeInfo;
      const provider = chat?.modelProvider || storeInfo.modelProvider;
      setSelectedProvider(provider);
      providerRef.current = provider;
    }
  }, [storeInfo, chat]);

  // Get model providers when component mounts
  useEffect(() => {
    if (!chat || !defaultStore || !defaultStore.childModelProviders || defaultStore.childModelProviders.length === 0) {
      setModelProviders([]);
    } else {
      ProviderBackend.getProviders(chat.owner)
        .then((res) => {
          if (res.status === "ok") {
            const providers = res.data.filter(provider =>
              provider.category === "Model" && defaultStore.childModelProviders.includes(provider.name)
            );
            if (storeInfo?.modelProvider && !providers.some(p => p.name === storeInfo.modelProvider)) {
              const missingProvider = res.data.find(p => p.name === storeInfo.modelProvider && p.category === "Model");
              if (missingProvider) {
                providers.unshift(missingProvider);
              }
            }
            setModelProviders(providers);
          }
        });
    }
  }, [chat, defaultStore, storeInfo]);

  const filteredModelProviders = useMemo(() => {
    if (!modelProviders.length) {
      return [];
    }
    if (generationMode === "image") {
      return modelProviders.filter(p => Setting.isImageGenerationModelProvider(p));
    }
    return modelProviders.filter(p => !Setting.isImageGenerationModelProvider(p));
  }, [modelProviders, generationMode]);

  // Combined update function to handle both store and provider updates
  const updateStoreAndChat = async(newStore, newProvider) => {
    if (isUpdating) {return;} // Prevent concurrent updates

    setIsUpdating(true);
    try {
      const updatedChat = {...chatRef.current};
      let storeChanged = false;
      let providerChanged = false;

      // Update store if needed
      if (newStore && newStore.name !== updatedChat.store) {
        updatedChat.store = newStore.name;
        storeChanged = true;
      }

      // Update provider in chat (not in store!)
      if (newProvider !== undefined && newProvider !== updatedChat.modelProvider) {
        updatedChat.modelProvider = newProvider;
        providerChanged = true;
      }

      // Save changes to the backend
      if (storeChanged || providerChanged) {
        const chatRes = await ChatBackend.updateChat(updatedChat.owner, updatedChat.name, updatedChat);

        if (chatRes.status !== "ok") {
          throw new Error("Failed to update settings");
        }

        // Update was successful
        if (onChatUpdated) {
          onChatUpdated(updatedChat);
        }

        // Update local refs
        chatRef.current = updatedChat;
        if (newProvider !== undefined) {
          providerRef.current = newProvider;
          setSelectedProvider(newProvider); // Sync UI state after successful update
        }
      }
    } catch (error) {
      Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error.message}`);

      // Revert UI state on error
      setSelectedStore(storeRef.current);
      setSelectedProvider(providerRef.current);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStoreChange = (value) => {
    // Find the store object
    const newStore = stores?.find(store => store.name === value);
    if (newStore && chat) {
      // Update local state immediately for UI responsiveness
      setSelectedStore(newStore);

      // Also update the provider if the new store has one
      if (!chat.modelProvider && newStore.modelProvider) {
        setSelectedProvider(newStore.modelProvider);
      }

      // Trigger the combined update
      updateStoreAndChat(newStore, newStore.modelProvider);

      if (onStoreChange) {
        const updatedChat = onStoreChange(newStore);
        if (updatedChat) {
          chatRef.current = updatedChat;
        }
      }
    }
  };

  const handleProviderChange = (value) => {
    // Find the provider object
    const newProvider = filteredModelProviders.find(provider => provider.name === value);
    if (newProvider && storeInfo) {

      // Trigger the combined update
      updateStoreAndChat(null, newProvider.name);
    }
  };

  useEffect(() => {
    if (isUpdating || !chat || filteredModelProviders.length === 0) {
      return;
    }
    const current = selectedProvider || chat?.modelProvider || storeInfo?.modelProvider;
    const valid = filteredModelProviders.some(p => p.name === current);
    if (!valid) {
      updateStoreAndChat(null, filteredModelProviders[0].name);
    }
  }, [generationMode, filteredModelProviders, chat?.name, chat?.modelProvider, storeInfo?.modelProvider, isUpdating]);

  // Pane control functions
  const addPane = () => {
    const newCount = paneCount + 1;
    if (newCount > 4) {
      return;
    }
    if (onPaneCountChange) {
      onPaneCountChange(newCount);
    }
  };

  const deletePane = () => {
    if (paneCount <= 1) {
      return;
    }
    if (onPaneCountChange) {
      onPaneCountChange(paneCount - 1);
    }
  };

  // Ensure the current store is always in the options list
  const storeOptions = useMemo(() => {
    if (filteredStores.length > 0) {
      // Check if current store is in filtered stores
      const currentStoreInFiltered = storeInfo && filteredStores.some(store => store.name === storeInfo.name);
      if (!currentStoreInFiltered && storeInfo) {
        // Add current store to the beginning of the list
        return [storeInfo, ...filteredStores];
      }
      return filteredStores;
    }
    // If no filtered stores, show only the current store
    return storeInfo ? [storeInfo] : [];
  }, [filteredStores, storeInfo]);

  // User can change stores if there are multiple options available
  const canChangeStores = storeOptions.length > 1;

  const shouldShowTitleBar = paneCount === 1 && (storeInfo || modelProviders.length > 0 || (showPaneControls && canManagePanes));

  if (!shouldShowTitleBar) {
    return null;
  }

  const labelStyle = {
    fontSize: "12px",
    color: isDark ? "#6b7280" : "#9ca3af",
    marginRight: "8px",
    fontWeight: 500,
    letterSpacing: "0.3px",
  };

  return (
    <div style={{
      padding: "6px 16px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      minHeight: "48px",
      borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #f0f0f0",
      backgroundColor: isDark ? "#1f1f1f" : "#fafafa",
    }}>
      {storeInfo && (
        <div style={{display: "flex", alignItems: "center"}}>
          {!isMobile && <span style={labelStyle}>{i18next.t("general:Store")}</span>}
          <Select
            className="store-pill-select"
            value={selectedStore?.name || storeInfo.name}
            style={{width: isMobile ? "35vw" : "12rem"}}
            onChange={handleStoreChange}
            disabled={isUpdating || !canChangeStores}
            popupMatchSelectWidth={false}
            optionLabelProp="children"
          >
            {storeOptions.map(store => (
              <Select.Option key={store.name} value={store.name}>
                <div style={{display: "flex", alignItems: "center"}}>
                  <img
                    src={Setting.getStoreIconUrl(store)}
                    alt=""
                    style={{width: 18, height: 18, marginRight: 8, borderRadius: 4, objectFit: "cover", flexShrink: 0}}
                  />
                  <span>{store.displayName || store.name}</span>
                </div>
              </Select.Option>
            ))}
          </Select>
        </div>
      )}

      {modelProviders.length > 0 && typeof onGenerationModeChange === "function" && (
        <div style={{display: "flex", alignItems: "center"}}>
          {!isMobile && <span style={labelStyle}>{i18next.t("chat:Mode")}</span>}
          <Segmented
            value={generationMode}
            onChange={onGenerationModeChange}
            disabled={isUpdating}
            options={[
              {
                value: "text",
                label: (
                  <div style={{display: "flex", alignItems: "center", gap: 5, padding: "0 2px"}}>
                    <FontSizeOutlined />
                    <span>{i18next.t("general:Text")}</span>
                  </div>
                ),
              },
              {
                value: "image",
                label: (
                  <div style={{display: "flex", alignItems: "center", gap: 5, padding: "0 2px"}}>
                    <PictureOutlined />
                    <span>{i18next.t("general:Image")}</span>
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {modelProviders.length > 0 && (
        <div style={{display: "flex", alignItems: "center"}}>
          {!isMobile && <span style={labelStyle}>{i18next.t("general:Model")}</span>}
          {filteredModelProviders.length === 0 ? (
            <span style={{fontSize: "13px", color: isDark ? "#555" : "#bbb"}}>{i18next.t("chat:No models for this mode")}</span>
          ) : (
            <Select
              className="store-pill-select"
              value={selectedProvider || chat?.modelProvider || storeInfo?.modelProvider || (filteredModelProviders[0]?.name)}
              style={{width: isMobile ? "35vw" : "15rem"}}
              onChange={handleProviderChange}
              disabled={isUpdating}
              popupMatchSelectWidth={false}
              optionLabelProp="children"
              suffixIcon={<div />}
            >
              {filteredModelProviders.map(provider => {
                const displayName = Setting.getProviderDisplayName(provider);
                return (
                  <Select.Option key={provider.name} value={provider.name}>
                    <div style={{display: "flex", alignItems: "center"}}>
                      <img
                        src={Setting.getProviderLogoURL(provider)}
                        alt={provider.name}
                        style={{width: 18, height: 18, marginRight: 8}}
                      />
                      <span>{displayName}</span>
                    </div>
                  </Select.Option>
                );
              })}
            </Select>
          )}
        </div>
      )}

      {storeInfo?.showAutoRead && (
        <div style={{display: "flex", alignItems: "center", gap: "6px"}}>
          <span style={labelStyle}>{i18next.t("store:Auto read")}</span>
          <Switch size="small" checked={autoRead} onChange={checked => onUpdateAutoRead(checked)} />
        </div>
      )}

      {showPaneControls && canManagePanes && (
        <div style={{display: "flex", alignItems: "center", gap: "6px"}}>
          <span style={{...labelStyle, marginRight: 0}}>{i18next.t("chat:Panes")}: {paneCount}</span>
          <Button size="small" shape="circle" icon={<PlusOutlined />} onClick={addPane} />
          <Button size="small" shape="circle" icon={<MinusOutlined />} onClick={deletePane} disabled={paneCount <= 1} />
        </div>
      )}
    </div>
  );
};

export default StoreInfoTitle;
