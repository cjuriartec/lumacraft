"use client";

import { BasicBlocksPlugin, BasicMarksPlugin } from "@platejs/basic-nodes/react";
import {
  FontBackgroundColorPlugin,
  FontColorPlugin,
  FontSizePlugin,
  LineHeightPlugin,
  TextAlignPlugin,
} from "@platejs/basic-styles/react";
import { CodeBlockPlugin } from "@platejs/code-block/react";
import { LinkPlugin } from "@platejs/link/react";
import { ListPlugin } from "@platejs/list/react";
import { ImagePlugin, MediaEmbedPlugin, PlaceholderPlugin } from "@platejs/media/react";
import {
  TableCellHeaderPlugin,
  TableCellPlugin,
  TablePlugin,
  TableRowPlugin,
} from "@platejs/table/react";

import { ImageElement } from "@/shared/presentation/components/ui/image-element";
import { LinkElement } from "@/shared/presentation/components/ui/link-element";
import { MediaPlaceholderElement } from "@/shared/presentation/components/ui/media-placeholder-element";
import {
  TableCellElement,
  TableCellHeaderElement,
  TableElement,
  TableRowElement,
} from "@/shared/presentation/components/ui/table-node";

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
  LinkPlugin.withComponent(LinkElement),
  ImagePlugin.withComponent(ImageElement),
  MediaEmbedPlugin,
  TablePlugin.configure({
    node: {
      component: TableElement,
    },
  }),
  TableRowPlugin.withComponent(TableRowElement),
  TableCellPlugin.withComponent(TableCellElement),
  TableCellHeaderPlugin.withComponent(TableCellHeaderElement),
  ListPlugin,
  CodeBlockPlugin,
  PlaceholderPlugin.withComponent(MediaPlaceholderElement),
  BasicBlocksPlugin,
  BasicMarksPlugin,
];
