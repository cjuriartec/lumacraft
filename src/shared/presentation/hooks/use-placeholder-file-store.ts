"use client";

/**
 * Shared store for non-serializable File objects associated with Plate placeholders.
 * Slate document state cannot hold File objects as they aren't serializable.
 * This store maps a unique placeholder ID to its corresponding File.
 */
const fileMap = new Map<string, File>();

export const placeholderFileStore = {
  /**
   * Associate a file with a placeholder ID.
   */
  add: (id: string, file: File) => {
    fileMap.set(id, file);
  },

  /**
   * Retrieve a file by its associated placeholder ID.
   */
  get: (id: string) => {
    return fileMap.get(id);
  },

  /**
   * Remove a file from the store once the upload is complete or cancelled.
   */
  remove: (id: string) => {
    fileMap.delete(id);
  },
};
