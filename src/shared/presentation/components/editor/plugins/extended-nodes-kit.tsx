"use client";

import { BasicBlocksPlugin, BasicMarksPlugin } from "@platejs/basic-nodes/react";
import {
  FontBackgroundColorPlugin,
  FontColorPlugin,
  FontFamilyPlugin,
  FontSizePlugin,
  LineHeightPlugin,
  TextAlignPlugin,
} from "@platejs/basic-styles/react";
import { IndentPlugin } from "@platejs/indent/react";
import { LinkPlugin } from "@platejs/link/react";
import { ListPlugin } from "@platejs/list/react";
import { ImagePlugin, MediaEmbedPlugin, PlaceholderPlugin } from "@platejs/media/react";
import {
  TableCellHeaderPlugin,
  TableCellPlugin,
  TablePlugin,
  TableRowPlugin,
} from "@platejs/table/react";
import { KEYS } from "platejs";

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
      targetPlugins: ["p", "h1", "h2", "h3", "blockquote", ImagePlugin.key],
    },
  }),
  FontSizePlugin,
  FontFamilyPlugin,
  FontColorPlugin,
  FontBackgroundColorPlugin,
  LineHeightPlugin.configure({
    inject: {
      targetPlugins: ["p", "h1", "h2", "h3", "blockquote"],
    },
  }),
  IndentPlugin.configure({
    inject: {
      targetPlugins: [...KEYS.heading, KEYS.p, KEYS.blockquote, KEYS.img],
    },
    options: {
      offset: 24,
    },
  }),
  LinkPlugin.withComponent(LinkElement),
  ImagePlugin.withComponent(ImageElement),
  MediaEmbedPlugin,
  TablePlugin.configure({
    node: {
      component: TableElement,
    },
    options: {
      minColumnWidth: 36,
    },
  }),
  TableRowPlugin.withComponent(TableRowElement),
  TableCellPlugin.withComponent(TableCellElement),
  TableCellHeaderPlugin.withComponent(TableCellHeaderElement),
  ListPlugin.configure({
    inject: {
      targetPlugins: [...KEYS.heading, KEYS.p, KEYS.blockquote, KEYS.img],
    },
  }),
  PlaceholderPlugin.withComponent(MediaPlaceholderElement),
  BasicBlocksPlugin,
  BasicMarksPlugin,
];
