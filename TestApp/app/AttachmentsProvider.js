// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import AsyncStorage from '@react-native-community/async-storage';
import RNFS from 'react-native-fs';
import { ErrorAttachmentLog } from 'appcenter-crashes';

const TEXT_ATTACHMENT_KEY = 'TEXT_ATTACHMENT_KEY';
const BINARY_FILENAME_KEY = 'BINARY_FILENAME_KEY';
const BINARY_FILETYPE_KEY = 'BINARY_FILETYPE_KEY';
const BINARY_FILESIZE_KEY = 'BINARY_FILESIZE_KEY';

// Filename to store binary on test app storage.
// This is not the filename reported to AppCenter which is variable.
const BINARY_ATTACHMENT_STORAGE_FILENAME = 'binary.txt';
const DEFAULT_ENCODING = 'utf8';

const DISPLAY_FILENAME_LENGTH_LIMIT = 20;

// Couting dot and 3 letters.
const FILE_EXTENSION_LENGTH = 4;

export default class AttachmentsProvider {
  static async updateItem(key, value) {
    if (value !== null && value !== undefined) {
      await AsyncStorage.setItem(key, value);
    } else {
      await AsyncStorage.removeItem(key);
    }
  }

  static async getErrorAttachments() {
    return (async () => {
      const attachments = [];
      const [textAttachment, binaryAttachment, binaryName, binaryType] = await Promise.all([
        AttachmentsProvider.getTextAttachment(),
        AttachmentsProvider.getBinaryAttachment(),
        AttachmentsProvider.getBinaryName(),
        AttachmentsProvider.getBinaryType(),
      ]);
      if (textAttachment !== null) {
        attachments.push(ErrorAttachmentLog.attachmentWithText(textAttachment, 'hello.txt'));
      }
      if (binaryAttachment !== null && binaryName !== null && binaryType !== null) {
        attachments.push(ErrorAttachmentLog.attachmentWithBinary(binaryAttachment, binaryName, binaryType));
      }
      return attachments;
    })();
  }

  static async saveTextAttachment(value) {
    await this.updateItem(TEXT_ATTACHMENT_KEY, value);
  }

  static async getTextAttachment() {
    return getItemFromStorage(TEXT_ATTACHMENT_KEY);
  }

  static async saveBinaryAttachment(name, data, type, size) {
    await this.updateItem(BINARY_FILENAME_KEY, name);
    await this.updateItem(BINARY_FILETYPE_KEY, type);
    await this.updateItem(BINARY_FILESIZE_KEY, size);
    await saveFileInDocumentsFolder(data);
  }

  static async getBinaryAttachment() {
    const path = `${RNFS.DocumentDirectoryPath}/${BINARY_ATTACHMENT_STORAGE_FILENAME}`;
    let contents = '';
    try {
      contents = await RNFS.readFile(path, DEFAULT_ENCODING);
    } catch (error) {
      console.log(`Error while reading binary attachment file, error: ${error}`);
    }
    return contents;
  }

  static async getBinaryName() {
    return getItemFromStorage(BINARY_FILENAME_KEY);
  }

  static async getBinaryType() {
    return getItemFromStorage(BINARY_FILETYPE_KEY);
  }

  static async getBinaryAttachmentInfo() {
    let fileName = await getItemFromStorage(BINARY_FILENAME_KEY);
    const fileSize = await getItemFromStorage(BINARY_FILESIZE_KEY);
    if (fileName != null) {
      if (fileName.length > DISPLAY_FILENAME_LENGTH_LIMIT) {
        const shortLength = DISPLAY_FILENAME_LENGTH_LIMIT - FILE_EXTENSION_LENGTH;
        const shortName = fileName.substr(0, shortLength);
        const fileExtension = fileName.substr(fileName.length - FILE_EXTENSION_LENGTH, fileName.length);
        fileName = `${shortName}(...)${fileExtension}`;
      }
      return `${fileName} (${fileSize})`;
    }
    return '';
  }

  static async deleteBinaryAttachment() {
    const path = `${RNFS.DocumentDirectoryPath}/${BINARY_ATTACHMENT_STORAGE_FILENAME}`;
    if (await RNFS.exists(path)) {
      await RNFS.unlink(path);
    }
    await this.updateItem(BINARY_FILENAME_KEY, null);
    await this.updateItem(BINARY_FILETYPE_KEY, null);
    await this.updateItem(BINARY_FILESIZE_KEY, null);
  }
}

async function getItemFromStorage(key) {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error(`Error retrieving item with key: ${key}`);
    console.error(error.message);
  }
  return null;
}

async function saveFileInDocumentsFolder(data) {
  const path = `${RNFS.DocumentDirectoryPath}/${BINARY_ATTACHMENT_STORAGE_FILENAME}`;
  RNFS.writeFile(path, data, DEFAULT_ENCODING)
    .then(() => console.log('Binary attachment saved'))
    .catch(err => console.error(err.message));
}
