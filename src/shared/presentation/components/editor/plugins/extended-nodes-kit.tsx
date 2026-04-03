"use client";

import { BasicBlocksPlugin, BasicMarksPlugin } from "@platejs/basic-nodes/react";
import {
  FontBackgroundColorPlugin,
  FontColorPlugin,
  FontSizePlugin,
  LineHeightPlugin,
  TextAlignPlugin,
  TextIndentPlugin,
} from "@platejs/basic-styles/react";
import { CodeBlockPlugin } from "@platejs/code-block/react";
import { IndentPlugin } from "@platejs/indent/react";
import { LinkPlugin } from "@platejs/link/react";
import { ListPlugin } from "@platejs/list/react";
import { ImagePlugin, MediaEmbedPlugin, PlaceholderPlugin } from "@platejs/media/react";
import { TablePlugin } from "@platejs/table/react";

import { ImageElement } from "@/shared/presentation/components/ui/image-element";
import { MediaPlaceholderElement } from "@/shared/presentation/components/ui/media-placeholder-element";

import { BasicNodesKit } from "./basic-nodes-kit";

export const ExtendedNodesKit = [
  ...BasicNodesKit,
  TextAlignPlugin.configure({
    inject: {
      targetPlugins: ["p", "h1", "h2", "h3", "blockquote"],
    },
  }),
  FontSizePlugin,
  FontColorPlugin,
  FontBackgroundColorPlugin,
  LineHeightPlugin.configure({
    inject: {
      targetPlugins: ["p", "h1", "h2", "h3", "blockquote"],
    },
  }),
  IndentPlugin.configure({
    inject: {
      targetPlugins: ["p", "h1", "h2", "h3", "blockquote"],
    },
  }),
  TextIndentPlugin,
  LinkPlugin,
  ImagePlugin.withComponent(ImageElement),
  MediaEmbedPlugin,
  TablePlugin,
  ListPlugin,
  CodeBlockPlugin,
  PlaceholderPlugin.withComponent(MediaPlaceholderElement),
  BasicBlocksPlugin,
  BasicMarksPlugin,
];
