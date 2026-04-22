import { useCallback, useEffect, useState } from "react";
import { useApp } from "./context/AppContext";
import { getConfigList, getConfig, createConfig, updateConfig } from "./services/settingsApi";
import { defaultConfig } from "./types/settings";
import { getCurrentUser } from "./utils/auth";
import { MachbaseSection } from "./sections/MachbaseSection";
import { ApiKeysSection } from "./sections/ApiKeysSection";
import { ModelsSection } from "./sections/ModelsSection";
import { Chat } from "./components/chat/Chat";
import Icon from "./components/common/Icon";
import Toast from "./components/common/Toast";
import type { AppConfig, ModelProvider } from "./types/settings";

type AppTab = "settings" | "chat" | null;

export default function App() {
    const { selectedConfig, setSelectedConfig, notify } = useApp();
    const [activeTab, setActiveTab] = useState<AppTab | null>(null);
    const [config, setConfig] = useState<AppConfig>(defaultConfig());
    const [saving, setSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [chatResetKey, setChatResetKey] = useState(0);

    const loadConfigList = useCallback(async () => {
        try {
            const all = await getConfigList();
            const user = getCurrentUser();
            return !user ? all : all.filter((name) => name === user);
        } catch {
            notify("Failed to load config list.", "error");
            return [];
        }
    }, [notify]);

    const loadConfig = useCallback(
        async (name: string) => {
            try {
                const data = await getConfig(name);
                setConfig(data);
                setSelectedConfig(name);
            } catch {
                notify(`Failed to load config "${name}".`, "error");
            }
        },
        [notify, setSelectedConfig]
    );

    const currentUser = getCurrentUser() ?? "sys";

    useEffect(() => {
        (async () => {
            const list = await loadConfigList();
            if (list.includes(currentUser)) {
                await loadConfig(currentUser);
                setActiveTab("chat");
            } else {
                setConfig((prev) => ({
                    ...prev,
                    machbase: {
                        ...prev.machbase,
                        host: "127.0.0.1",
                        port: "5654",
                        user: currentUser,
                    },
                }));
                setActiveTab("settings");
            }
        })();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSave = useCallback(async () => {
        const errors: string[] = [];
        if (!config.machbase.host.trim()) errors.push("machbase.host");
        if (!config.machbase.port.trim()) errors.push("machbase.port");
        if (!config.machbase.user.trim()) errors.push("machbase.user");
        if (!config.machbase.password.trim()) errors.push("machbase.password");
        // Validate model entries: if added, name must not be empty
        const providers: Array<{ key: string; models: { name: string; model_id: string }[] }> = [
            { key: "claude", models: config.claude.models },
            { key: "chatgpt", models: config.chatgpt.models },
            { key: "gemini", models: config.gemini.models },
            { key: "ollama", models: config.ollama.models },
        ];
        for (const p of providers) {
            p.models.forEach((m, i) => {
                if (!m.name.trim()) errors.push(`model.${p.key}.${i}.name`);
                if (!m.model_id.trim()) errors.push(`model.${p.key}.${i}.model_id`);
            });
        }
        // At least one provider must have API key + model (Ollama: model only)
        const hasProvider =
            (config.claude.api_key.trim() && config.claude.models.some((m) => m.name.trim())) ||
            (config.chatgpt.api_key.trim() && config.chatgpt.models.some((m) => m.name.trim())) ||
            (config.gemini.api_key.trim() && config.gemini.models.some((m) => m.name.trim())) ||
            config.ollama.models.some((m) => m.name.trim());
        if (!hasProvider) errors.push("no_provider");

        if (errors.length > 0) {
            setValidationErrors(errors);
            const hasConnection = errors.some((e) => e.startsWith("machbase."));
            const hasModel = errors.some((e) => e.startsWith("model."));
            const hasNoProvider = errors.includes("no_provider");
            const msgs: string[] = [];
            if (hasConnection) msgs.push("Machbase connection fields");
            if (hasModel) msgs.push("model display names");
            if (hasNoProvider) msgs.push("at least one provider with API key and model");
            notify(`Please fill in: ${msgs.join(", ")}.`, "error");
            return;
        }
        setValidationErrors([]);
        setSaving(true);
        try {
            const isNew = selectedConfig === null;
            let savedName: string;
            if (isNew) {
                savedName = await createConfig(config);
                notify(`Config "${savedName}" created.`, "success");
            } else {
                savedName = await updateConfig(selectedConfig, config);
                notify(`Config "${savedName}" saved.`, "success");
            }
            await loadConfigList();
            setSelectedConfig(savedName);
            setChatResetKey((k) => k + 1);
            setActiveTab("chat");
        } catch (e) {
            notify(`Save failed: ${e instanceof Error ? e.message : "unknown error"}`, "error");
        }
        setSaving(false);
    }, [config, selectedConfig, notify, loadConfigList, setSelectedConfig]);

    const handleOpenSettings = useCallback(async () => {
        const list = await loadConfigList();
        if (list.includes(currentUser)) {
            await loadConfig(currentUser);
        } else if (selectedConfig && list.includes(selectedConfig)) {
            await loadConfig(selectedConfig);
        }
        setActiveTab("settings");
    }, [loadConfigList, loadConfig, currentUser, selectedConfig]);

    const handleMachbaseChange = useCallback((machbase: AppConfig["machbase"]) => {
        setConfig((prev) => ({ ...prev, machbase }));
        setValidationErrors([]);
    }, []);

    const handleApiKeyChange = useCallback((provider: "claude" | "chatgpt" | "gemini", key: string) => {
        setConfig((prev) => ({
            ...prev,
            [provider]: { ...prev[provider], api_key: key },
        }));
    }, []);

    const handleOllamaUrlChange = useCallback((url: string) => {
        setConfig((prev) => ({ ...prev, ollama: { ...prev.ollama, base_url: url } }));
    }, []);

    const handleModelsChange = useCallback((provider: ModelProvider, models: AppConfig["claude"]["models"]) => {
        setConfig((prev) => ({
            ...prev,
            [provider]: { ...prev[provider], models },
        }));
        setValidationErrors([]);
    }, []);

    return (
        <>
            <div className="page bg-surface-alt" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
                {activeTab === null && (
                    <div className="flex-1 flex items-center justify-center">
                        <span className="spinner" />
                    </div>
                )}
                {activeTab !== null && (
                    <>
                        <div className="flex-1 flex flex-col overflow-hidden" style={{ display: activeTab === "settings" ? undefined : "none" }}>
                            <div className="page-header">
                                <div className="page-header-inner">
                                    <div>
                                        <h1 className="page-title">{selectedConfig === null ? "New Configuration" : `Configuration: ${selectedConfig}`}</h1>
                                        <p className="page-desc">Manage LLM providers, API keys, models, and connection settings.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="btn btn-content btn-success" onClick={() => setActiveTab("chat")}>
                                            <Icon name="chat" className="icon-sm" /> Chat
                                        </button>
                                        <button className="btn btn-content btn-primary" onClick={handleSave} disabled={saving}>
                                            {saving ? <span className="spinner" /> : <Icon name="save" className="icon-sm" />}
                                            {selectedConfig === null ? "Create Config" : "Save Settings"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="page-body">
                                <div className="page-body-inner">
                                    <div className="flex flex-col gap-4">
                                        <MachbaseSection config={config.machbase} onChange={handleMachbaseChange} errors={validationErrors} />
                                        <ApiKeysSection
                                            claude={config.claude}
                                            chatgpt={config.chatgpt}
                                            gemini={config.gemini}
                                            ollama={config.ollama}
                                            onKeyChange={handleApiKeyChange}
                                            onOllamaUrlChange={handleOllamaUrlChange}
                                        />
                                        <ModelsSection
                                            claude={config.claude}
                                            chatgpt={config.chatgpt}
                                            gemini={config.gemini}
                                            ollama={config.ollama}
                                            onChange={handleModelsChange}
                                            errors={validationErrors}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden" style={{ display: activeTab === "chat" ? undefined : "none" }}>
                            <Chat key={chatResetKey} onOpenSettings={handleOpenSettings} />
                        </div>
                    </>
                )}
            </div>

            <Toast />
        </>
    );
}
