const fs = require('fs');
const path = require('path');

const MAX_OPTION_SCHEMA = [
  {
    type: 'object',
    properties: { max: { type: 'number' } },
    additionalProperties: false,
  },
];

module.exports = {
  rules: {
    'max-lines': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Enforce a maximum number of lines per file',
        },
        schema: MAX_OPTION_SCHEMA,
        messages: {
          maxLines: 'File has {{lineCount}} lines, which exceeds the maximum of {{max}} lines.',
        },
      },
      create(context) {
        const max = context.options[0]?.max || 300;
        const filename = context.getFilename();

        if (filename.includes('node_modules') || path.basename(filename).startsWith('.')) {
          return {};
        }

        const lineCount = context.getSourceCode().lines.length;

        if (lineCount > max) {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: 'maxLines',
            data: { lineCount, max },
          });
        }

        return {};
      },
    },
    'max-dir-files': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Enforce a maximum number of flat files per directory',
        },
        schema: MAX_OPTION_SCHEMA,
        messages: {
          maxFiles: 'Directory {{directory}} contains {{fileCount}} flat files, which exceeds the maximum of {{max}}.',
        },
      },
      create(context) {
        const max = context.options[0]?.max || 20;
        const filename = context.getFilename();
        const directory = path.dirname(filename);

        if (directory.includes('node_modules')) {
          return {};
        }

        context.settings ||= {};
        const checkedDirs = (context.settings._checkedDirs ||= new Set());
        if (checkedDirs.has(directory)) return {};
        checkedDirs.add(directory);

        try {
          const entries = fs.readdirSync(directory, { withFileTypes: true });
          const flatFiles = entries.filter(
            entry => entry.isFile() && !entry.name.startsWith('.') && /\.[jt]sx?$/.test(entry.name),
          );

          if (flatFiles.length > max) {
            context.report({
              loc: { line: 1, column: 0 },
              messageId: 'maxFiles',
              data: { directory, fileCount: flatFiles.length, max },
            });
          }
        } catch (error) {}

        return {};
      },
    },
  },
};
