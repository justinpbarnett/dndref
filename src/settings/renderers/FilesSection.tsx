import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { FilesSectionProps } from '../types';

export function FilesSection({
  uploads,
  removingUploadId,
  pasteFileName,
  setPasteFileName,
  pasteContent,
  setPasteContent,
  pickFilesWeb,
  handlePasteAdd,
  handleDeleteUpload,
  handleDeleteAllData,
  deleteAllPending,
  deleteAllStatus,
  styles,
}: FilesSectionProps) {
  const C = styles.__colors;

  return (
    <View testID="settings-content" style={styles.contentInner}>
      <View style={styles.group}>
        <Text style={styles.groupLabel}>UPLOAD FILES</Text>
        <Text style={styles.groupDesc}>
          Upload .md, .txt, or .json from Obsidian, DiceCloud, or any campaign notes.
        </Text>
        {Platform.OS === 'web' && (
          <TouchableOpacity style={styles.outlineBtn} onPress={pickFilesWeb} activeOpacity={0.7}>
            <Ionicons name="cloud-upload-outline" size={14} color={C.active} style={{ marginRight: 6 }} />
            <Text style={styles.outlineBtnText}>Choose Files</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>PASTE CONTENT</Text>
        <TextInput
          style={styles.input}
          value={pasteFileName}
          onChangeText={setPasteFileName}
          placeholder="File name (e.g. my-campaign.md)"
          placeholderTextColor={C.textMuted}
          autoCorrect={false}
        />
        <TextInput
          style={[styles.input, styles.textarea]}
          value={pasteContent}
          onChangeText={setPasteContent}
          placeholder="Paste content here..."
          placeholderTextColor={C.textMuted}
          multiline
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.outlineBtn, !pasteContent.trim() && styles.outlineBtnDisabled]}
          onPress={handlePasteAdd}
          activeOpacity={0.7}
          disabled={!pasteContent.trim()}
        >
          <Text style={styles.outlineBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {uploads.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>UPLOADED ({uploads.length})</Text>
          {uploads.map((f) => {
            const removing = removingUploadId === f.id;
            return (
              <View key={f.id} style={styles.fileRow}>
                <Ionicons name="document-text-outline" size={13} color={C.textDim} />
                <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
                <TouchableOpacity
                  style={[styles.fileRemoveBtn, removing && styles.fileRemoveBtnDisabled]}
                  onPress={() => handleDeleteUpload(f.id)}
                  activeOpacity={0.7}
                  disabled={removing}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove upload ${f.name}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={15} color={C.error} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.group}>
        <Text style={styles.groupLabel}>DELETE ALL DATA</Text>
        <Text style={styles.groupDesc}>
          Clears uploads, pasted content, AI parsed files, saved settings, keys, source URLs, and cached SRD data from this device.
        </Text>
        <TouchableOpacity
          style={[styles.dangerBtn, deleteAllPending && styles.dangerBtnDisabled]}
          onPress={handleDeleteAllData}
          activeOpacity={0.7}
          disabled={deleteAllPending}
        >
          <Ionicons name="trash-outline" size={14} color={C.error} style={{ marginRight: 6 }} />
          <Text style={styles.dangerBtnText}>
            {deleteAllPending ? 'Deleting...' : 'Delete All Data'}
          </Text>
        </TouchableOpacity>
        {!!deleteAllStatus && <Text style={styles.fieldHint}>{deleteAllStatus}</Text>}
      </View>
    </View>
  );
}
