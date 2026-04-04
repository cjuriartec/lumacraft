import { type TriggerComboboxPluginOptions, withTriggerCombobox } from "@platejs/combobox";
import { createSlatePlugin, createTSlatePlugin, type PluginConfig } from "platejs";

/**
 * SlashInputPlugin: The actual node that will be inserted when typing '/'
 * It handles the inline combobox input.
 */
export const SlashInputPlugin = createSlatePlugin({
  key: "slash_input",
  editOnly: true,
  node: {
    isElement: true,
    isInline: true,
    isVoid: true,
  },
});

/**
 * SlashPlugin: The main trigger plugin that handles the typing of '/'
 */
export type SlashConfig = PluginConfig<"slash_command", TriggerComboboxPluginOptions>;

export const SlashPlugin = createTSlatePlugin<SlashConfig>({
  key: "slash_command",
  node: { isElement: true, isInline: true, isVoid: true },
  options: {
    trigger: "/",
    triggerPreviousCharPattern: /^\s?$/,
    createComboboxInput: () => ({
      children: [{ text: "" }],
      type: SlashInputPlugin.key,
    }),
  },
  plugins: [SlashInputPlugin],
}).overrideEditor(withTriggerCombobox);
